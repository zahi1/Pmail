# backend/routes/messages.py
from flask import Blueprint, request, jsonify
from backend.models.database import db
from backend.models.message import Message
from backend.models.user import User
from sqlalchemy import func
import pickle
import os

messages_bp = Blueprint('messages', __name__)

# Load the trained spam detection model
SPAM_MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'models', 'spam_detector_model.pkl')

try:
    with open(SPAM_MODEL_PATH, 'rb') as f:
        spam_model = pickle.load(f)
    print(f"✅ Spam detection model loaded successfully from {SPAM_MODEL_PATH}")
except Exception as e:
    print(f"❌ Error loading spam model: {e}")
    print(f"Attempted to load from: {os.path.abspath(SPAM_MODEL_PATH)}")
    spam_model = None

def is_spam(subject, body):
    """Check if a message is spam based on subject and body"""
    if spam_model is None:
        print("⚠️ Spam model not loaded, defaulting to non-spam")
        return False
    
    try:
        combined_text = f"{subject} {body}"
        print(f"📝 Analyzing message: '{combined_text[:50]}...'")
        
        # Get probability of being spam (index 1 is spam probability)
        spam_prob = spam_model.predict_proba([combined_text])[0][1]
        is_spam_result = spam_prob > 0.5  # Threshold for classifying as spam
        
        print(f"📊 Spam probability: {spam_prob:.4f} - {'SPAM' if is_spam_result else 'NOT SPAM'}")
        return is_spam_result
    except Exception as e:
        print(f"❌ Error in spam detection: {e}")
        import traceback
        traceback.print_exc()
        return False

@messages_bp.route('/messages/send', methods=['POST'])
def send_message():
    data = request.get_json()
    sender_id = data.get('sender_id')
    recipient_email = data.get('recipient_email')
    subject = data.get('subject')
    body = data.get('body')
    draft_id = data.get('draft_id')  # Optional: if coming from an existing draft
    job_id = data.get('job_id')
    company_name = data.get('company_name')

    if not sender_id or not recipient_email or not subject or not body:
        return jsonify({"error": "Missing required fields"}), 400

    # Find recipient by email (case-insensitive)
    recipient = User.query.filter(func.lower(User.email) == recipient_email.lower()).first()
    if not recipient:
        print(f"❌ Recipient not found: {recipient_email}")
        return jsonify({"error": "Recipient not found"}), 404

    print(f"👤 Recipient found: ID {recipient.id}, Email: {recipient.email}")

    # Check if message is spam
    spam_detected = is_spam(subject, body)
    
    try:
        if draft_id:
            # Update an existing draft and send it
            message = Message.query.get(draft_id)
            if not message:
                return jsonify({"error": "Draft not found"}), 404
            message.recipient_id = recipient.id
            message.subject = subject
            message.body = body
            message.status = "Pending"
            message.is_draft = False
            message.is_spam = spam_detected  # Set is_spam flag
            db.session.commit()
            
            print(f"📤 Draft sent with ID {message.id}, is_spam: {message.is_spam}")
            return jsonify({"message": "Draft sent successfully"}), 200
        else:
            new_message = Message(
                sender_id=sender_id,
                recipient_id=recipient.id,
                subject=subject,
                body=body,
                status="Pending",
                is_draft=False,
                is_spam=spam_detected  # Set is_spam flag
            )
            db.session.add(new_message)
            db.session.commit()
            
            print(f"📤 New message sent with ID {new_message.id}, is_spam: {new_message.is_spam}")
            return jsonify({"message": "Message sent successfully"}), 201
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error saving message: {e}")
        return jsonify({"error": "Database error while saving message"}), 500

@messages_bp.route('/messages/draft', methods=['POST'])
def save_draft():
    data = request.get_json()
    sender_id = data.get('sender_id')
    recipient_email = data.get('recipient_email', '')
    subject = data.get('subject', '')
    body = data.get('body', '')
    job_id = data.get('job_id')
    company_name = data.get('company_name')
    draft_id = data.get('draft_id')

    if not sender_id:
        return jsonify({"error": "Missing sender_id"}), 400

    # If recipient_email is provided, try to find a matching user;
    # otherwise, use sender_id (so recipient_id is not left blank)
    recipient = None
    if recipient_email:
        recipient = User.query.filter(func.lower(User.email) == recipient_email.lower()).first()

    if draft_id:
        draft = Message.query.get(draft_id)
        if not draft:
            return jsonify({"error": "Draft not found"}), 404
        draft.subject = subject
        draft.body = body
        draft.recipient_id = recipient.id if recipient else sender_id
        draft.is_draft = True
        ####draft.status = "Draft"  # For windows compatibility
        draft.status = "Pending"  # Changed from "Draft" to "Pending" for Mac compatibility
        db.session.commit()
        return jsonify({"message": "Draft updated successfully", "draft_id": draft.id}), 200
    else:
        new_draft = Message(
            sender_id=sender_id,
            recipient_id=recipient.id if recipient else sender_id,
            subject=subject,
            body=body,
            ####status ="Draft",  # For windows compatibility
            status="Pending",  # Changed from "Draft" to "Pending" for Mac compatibility
            is_draft=True
        )
        db.session.add(new_draft)
        db.session.commit()
        return jsonify({"message": "Draft saved successfully", "draft_id": new_draft.id}), 201

@messages_bp.route('/messages/inbox/<int:user_id>', methods=['GET'])
def get_inbox(user_id):
    # Fetch messages where user_id is the recipient and that are not drafts or spam
    try:
        messages = Message.query.filter(
            Message.recipient_id == user_id,
            Message.is_draft == False,
            Message.is_spam == False  # Exclude spam messages from inbox
        ).order_by(Message.created_at.desc()).all()
        
        print(f"📥 Loaded {len(messages)} non-spam messages for inbox of user {user_id}")

        results = []
        for msg in messages:
            sender = User.query.get(msg.sender_id)
            results.append({
                "id": msg.id,
                "sender_id": msg.sender_id,
                "sender_email": sender.email if sender else "Unknown",
                "subject": msg.subject,
                "body": msg.body,
                "status": msg.status,
                "created_at": msg.created_at.strftime("%Y-%m-%d %H:%M:%S")
            })
        return jsonify(results), 200
    except Exception as e:
        print(f"❌ Error loading inbox: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@messages_bp.route('/messages/sent/<int:user_id>', methods=['GET'])
def get_sent_messages(user_id):
    # Fetch messages where user_id is the sender and that are not drafts
    messages = Message.query.filter_by(sender_id=user_id, is_draft=False).order_by(Message.created_at.desc()).all()
    
    results = []
    for msg in messages:
        recipient = User.query.get(msg.recipient_id)
        results.append({
            "id": msg.id,
            "recipient_id": msg.recipient_id,
            "recipient_email": recipient.email if recipient else "Unknown",
            "subject": msg.subject,
            "body": msg.body,
            "status": msg.status,
            "created_at": msg.created_at.strftime("%Y-%m-%d %H:%M:%S")
        })
    return jsonify(results), 200

@messages_bp.route('/messages/drafts/<int:user_id>', methods=['GET'])
def get_drafts(user_id):
    # Fetch messages that are marked as drafts (and belong to the sender)
    drafts = Message.query.filter_by(sender_id=user_id, is_draft=True).order_by(Message.created_at.desc()).all()
    results = []
    for draft in drafts:
        recipient = User.query.get(draft.recipient_id)
        results.append({
            "id": draft.id,
            "recipient_email": recipient.email if recipient and recipient.id != draft.sender_id else "",
            "subject": draft.subject,
            "body": draft.body,
            "created_at": draft.created_at.strftime("%Y-%m-%d %H:%M:%S")
        })
    return jsonify(results), 200

@messages_bp.route('/messages/<int:message_id>/status', methods=['PUT'])
def update_message_status(message_id):
    data = request.get_json()
    new_status = data.get('status')
    
    valid_statuses = ["Pending", "Under Review", "Accepted", "Rejected"]
    if new_status not in valid_statuses:
        return jsonify({"error": "Invalid status value"}), 400
    
    message = Message.query.get(message_id)
    if not message:
        return jsonify({"error": "Message not found"}), 404
    
    message.status = new_status
    db.session.commit()
    
    return jsonify({
        "success": True,
        "message_id": message_id,
        "status": new_status
    }), 200

@messages_bp.route('/messages/spam/<int:user_id>', methods=['GET'])
def get_spam(user_id):
    # Fetch messages where user_id is the recipient and that are marked as spam
    try:
        spam_messages = Message.query.filter(
            Message.recipient_id == user_id,
            Message.is_draft == False,
            Message.is_spam == True  # Only get spam messages
        ).order_by(Message.created_at.desc()).all()
        
        print(f"🗑️ Loaded {len(spam_messages)} spam messages for user {user_id}")

        results = []
        for msg in spam_messages:
            sender = User.query.get(msg.sender_id)
            results.append({
                "id": msg.id,
                "sender_id": msg.sender_id,
                "sender_email": sender.email if sender else "Unknown",
                "sender_name": f"{sender.first_name} {sender.last_name}" if sender else "Unknown Sender",
                "subject": msg.subject,
                "body": msg.body,
                "created_at": msg.created_at.strftime("%Y-%m-%d %H:%M:%S")
            })
        
        return jsonify({"messages": results}), 200
    except Exception as e:
        print(f"❌ Error fetching spam messages: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Error fetching spam messages", "details": str(e)}), 500

@messages_bp.route('/messages/not-spam/<int:message_id>', methods=['POST'])
def mark_as_not_spam(message_id):
    """Endpoint to move a message from spam to inbox"""
    message = Message.query.get(message_id)
    if not message:
        return jsonify({"error": "Message not found"}), 404
        
    if message.is_spam:
        message.is_spam = False  # Mark as not spam
        db.session.commit()
        return jsonify({"message": "Message moved to inbox"}), 200
    else:
        return jsonify({"error": "Message is not marked as spam"}), 400

@messages_bp.route('/messages/<int:message_id>', methods=['GET'])
def get_message(message_id):
    """Get a specific message by ID"""
    try:
        message = Message.query.get(message_id)
        if not message:
            return jsonify({"error": "Message not found"}), 404
        
        # Check if the current user has permission to view this message
        current_user_id = request.args.get('user_id')
        if current_user_id:
            current_user_id = int(current_user_id)
            if message.sender_id != current_user_id and message.recipient_id != current_user_id:
                return jsonify({"error": "Permission denied"}), 403
        
        sender = User.query.get(message.sender_id)
        recipient = User.query.get(message.recipient_id)
        
        result = {
            "id": message.id,
            "sender_id": message.sender_id,
            "sender_email": sender.email if sender else "Unknown",
            "recipient_id": message.recipient_id,
            "recipient_email": recipient.email if recipient else "Unknown",
            "subject": message.subject,
            "body": message.body,
            "status": message.status,
            "is_draft": message.is_draft,
            "is_spam": message.is_spam,
            "created_at": message.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }
        
        return jsonify(result), 200
    except Exception as e:
        print(f"❌ Error fetching message: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
