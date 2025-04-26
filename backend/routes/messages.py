# backend/routes/messages.py
from flask import Blueprint, request, jsonify, send_file
from backend.models.database import db
from backend.models.message import Message
from backend.models.attachment import Attachment
from backend.models.user import User
from backend.models.status_message import StatusMessage
from sqlalchemy import func
import pickle
import os
import io

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
    """Send a message with optional PDF attachment"""
    print("Received message submission request")
    
    # Check if the request has multipart/form-data content type
    has_attachment = False
    if request.content_type and 'multipart/form-data' in request.content_type:
        print("Processing multipart form data (with file)")
        # Get form data
        sender_id = request.form.get('sender_id')
        recipient_email = request.form.get('recipient_email')
        subject = request.form.get('subject')
        body = request.form.get('body')
        draft_id = request.form.get('draft_id')
        parent_id = request.form.get('parent_message_id')
        
        # Check for attachment
        attachment = request.files.get('attachment')
        has_attachment = attachment and attachment.filename
        
        if has_attachment:
            print(f"Received attachment: {attachment.filename}, {attachment.content_type}")
    else:
        print("Processing JSON data (no file)")
        # Parse JSON data
        data = request.get_json()
        sender_id = data.get('sender_id')
        recipient_email = data.get('recipient_email')
        subject = data.get('subject')
        body = data.get('body')
        draft_id = data.get('draft_id')
        parent_id = data.get('parent_message_id')
        attachment = None

    # Validate required fields
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
        # Create or update the message
        if draft_id:
            # Update existing draft
            message = Message.query.get(draft_id)
            if not message:
                return jsonify({"error": "Draft not found"}), 404
            message.recipient_id = recipient.id
            message.subject = subject
            message.body = body
            message.status = "Pending"
            message.is_draft = False
            message.is_spam = spam_detected
            if parent_id:
                message.parent_id = parent_id
        else:
            # Create new message
            message = Message(
                sender_id=sender_id,
                recipient_id=recipient.id,
                subject=subject,
                body=body,
                status="Pending",
                is_draft=False,
                is_spam=spam_detected,
                parent_id=parent_id
            )
            db.session.add(message)
        
        # First commit to get the message ID
        db.session.commit()
        print(f"Message saved with ID: {message.id}")
        
        # Handle attachment if present
        if has_attachment:
            try:
                # Validate file type
                if not attachment.filename.lower().endswith('.pdf'):
                    return jsonify({"error": "Only PDF files are allowed"}), 400
                
                # Read the file data
                file_data = attachment.read()
                file_size = len(file_data)
                print(f"Read {file_size} bytes from attachment")
                
                # Create and save attachment
                new_attachment = Attachment(
                    message_id=message.id,
                    filename=attachment.filename,
                    file_type='application/pdf',
                    file_size=file_size,
                    file_data=file_data
                )
                db.session.add(new_attachment)
                db.session.commit()
                
                print(f"📎 Attachment saved successfully: {attachment.filename}")
            except Exception as e:
                print(f"❌ Error saving attachment: {str(e)}")
                import traceback
                traceback.print_exc()
                # Continue even if attachment fails
        
        print(f"📤 Message sent with ID {message.id}, is_spam: {message.is_spam}")
        return jsonify({
            "success": True,
            "message": "Message sent successfully", 
            "message_id": message.id
        }), 201
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error saving message: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Database error while saving message: {str(e)}"}), 500

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
    
    old_status = message.status
    message.status = new_status
    
    # Only create notification if status has changed
    if old_status != new_status:
        try:
            # Create an automated reply message based on the new status
            employer = User.query.get(message.recipient_id)  # The employer is the recipient of the original message
            employee = User.query.get(message.sender_id)      # The employee is the sender of the original message
            
            if employer and employee:
                # Generate status-specific message content, passing employer ID for custom messages
                reply_subject = f"Re: {message.subject}"
                reply_body = generate_status_message(new_status, message.subject, employer.id)
                
                # Create the automated reply message
                auto_reply = Message(
                    sender_id=employer.id,            # From employer
                    recipient_id=employee.id,         # To employee
                    subject=reply_subject,
                    body=reply_body,
                    status=new_status,
                    is_draft=False,
                    is_spam=False,
                    parent_id=message_id              # Link to original message
                )
                db.session.add(auto_reply)
                print(f"📧 Created automated status update message with status: {new_status}")
        except Exception as e:
            print(f"⚠️ Failed to create status update message: {e}")
            # Continue even if automated message fails, don't block the status update
    
    db.session.commit()
    
    return jsonify({
        "success": True,
        "message_id": message_id,
        "status": new_status
    }), 200

def generate_status_message(status, job_subject, employer_id=None):
    """Generate appropriate message text based on application status"""
    # Extract job title from subject if it contains "Application for: "
    job_title = job_subject
    if "Application for:" in job_subject:
        job_title = job_subject.split("Application for:")[1].strip()
    
    # Try to find custom message from the employer
    if employer_id:
        custom_message = StatusMessage.query.filter_by(
            user_id=employer_id,
            status=status.lower().replace(' ', '_')
        ).first()
        
        if custom_message:
            # Replace {job_title} placeholder with actual job title
            return custom_message.message.replace('{job_title}', job_title)
    
    # If no custom message found or no employer_id provided, use default messages
    if status == "Pending":
        return f"Thank you for your application for {job_title}. Your application is currently in our pending queue and will be reviewed soon."
    
    elif status == "Under Review":
        return f"Good news! Your application for {job_title} is now being reviewed by our team. We'll be in touch with updates as we evaluate your candidacy."
    
    elif status == "Accepted":
        return f"Congratulations! We are pleased to inform you that your application for {job_title} has been accepted. We'll contact you shortly with next steps regarding the interview process."
    
    elif status == "Rejected":
        return f"Thank you for your interest in {job_title}. After careful consideration, we regret to inform you that we've decided to move forward with other candidates at this time.\n\nWe appreciate your interest in our organization and wish you success in your job search."
    
    else:
        return f"Your application status has been updated to: {status}"

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
    """Get a message by ID including attachments"""
    try:
        message = Message.query.get_or_404(message_id)
        
        # Check user permissions
        current_user_id = request.args.get('user_id')
        if current_user_id:
            current_user_id = int(current_user_id)
            if message.sender_id != current_user_id and message.recipient_id != current_user_id:
                return jsonify({"error": "Permission denied"}), 403
        
        sender = User.query.get(message.sender_id)
        recipient = User.query.get(message.recipient_id)
        
        # Get attachment info
        attachments = []
        for attachment in Attachment.query.filter_by(message_id=message_id).all():
            attachments.append({
                "id": attachment.id,
                "filename": attachment.filename,
                "file_size": attachment.file_size,
                "file_type": attachment.file_type,
                "created_at": attachment.created_at.strftime("%Y-%m-%d %H:%M:%S")
            })
        
        # Build response
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
            "attachments": attachments,
            "created_at": message.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }
        
        return jsonify(result), 200
    except Exception as e:
        print(f"❌ Error fetching message: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@messages_bp.route('/messages/replies/<int:message_id>', methods=['GET'])
def get_replies(message_id):
    """Fetch replies for a given message to display threaded view"""
    try:
        replies = Message.query.filter_by(parent_id=message_id) \
                               .order_by(Message.created_at).all()
        results = []
        for msg in replies:
            user = User.query.get(msg.sender_id)
            results.append({
                "id": msg.id,
                "sender_email": user.email if user else "",
                "subject": msg.subject,
                "body": msg.body,
                "created_at": msg.created_at.strftime("%Y-%m-%d %H:%M:%S")
            })
        return jsonify(results), 200
    except Exception as e:
        print(f"❌ Error fetching replies: {e}")
        return jsonify({"error": "Error fetching replies"}), 500

@messages_bp.route('/messages/draft/<int:draft_id>', methods=['DELETE'])
def delete_draft(draft_id):
    """Delete a draft message"""
    draft = Message.query.get(draft_id)
    if not draft:
        return jsonify({"error": "Draft not found"}), 404
        
    if not draft.is_draft:
        return jsonify({"error": "Message is not a draft"}), 400
        
    try:
        db.session.delete(draft)
        db.session.commit()
        return jsonify({"message": "Draft deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error deleting draft: {e}")
        return jsonify({"error": "Database error while deleting draft"}), 500

# New endpoints for status messages
@messages_bp.route('/status-messages/<int:user_id>', methods=['GET'])
def get_status_messages(user_id):
    """Get custom status messages for a user"""
    try:
        messages = {}
        status_messages = StatusMessage.query.filter_by(user_id=user_id).all()
        
        # Define default messages to return if no custom ones exist
        default_messages = {
            "pending": "Thank you for your application for {job_title}. Your application is currently in our pending queue and will be reviewed soon.",
            "under_review": "Good news! Your application for {job_title} is now being reviewed by our team. We'll be in touch with updates as we evaluate your candidacy.",
            "accepted": "Congratulations! We are pleased to inform you that your application for {job_title} has been accepted. We'll contact you shortly with next steps regarding the interview process.",
            "rejected": "Thank you for your interest in {job_title}. After careful consideration, we regret to inform you that we've decided to move forward with other candidates at this time.\n\nWe appreciate your interest in our organization and wish you success in your job search."
        }
        
        # If we have custom messages, use them; otherwise use defaults
        for msg in status_messages:
            messages[msg.status] = msg.message
            
        # Fill in any missing messages with defaults
        for status, default_msg in default_messages.items():
            if status not in messages:
                messages[status] = default_msg
        
        return jsonify({"success": True, "messages": messages}), 200
    except Exception as e:
        print(f"❌ Error fetching status messages: {e}")
        return jsonify({"error": "Error fetching status messages"}), 500

@messages_bp.route('/status-messages', methods=['POST'])
def save_status_messages():
    """Save custom status messages for a user"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        messages = data.get('messages', {})

        if not user_id:
            return jsonify({"error": "Missing user_id"}), 400

        # Delete existing messages for this user
        StatusMessage.query.filter_by(user_id=user_id).delete()

        # Insert new messages
        for status, message in messages.items():
            if message:  # Only save non-empty messages
                db.session.add(StatusMessage(
                    user_id=user_id,
                    status=status,
                    message=message
                ))

        db.session.commit()
        return jsonify({"success": True, "message": "Status messages saved successfully"}), 200
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error saving status messages: {e}")
        return jsonify({"error": "Error saving status messages", "details": str(e)}), 500

# Add a new endpoint to retrieve attachments
@messages_bp.route('/attachments/<int:attachment_id>', methods=['GET'])
def get_attachment(attachment_id):
    """Get an attachment file by ID"""
    try:
        print(f"Fetching attachment with ID: {attachment_id}")
        # Find the attachment
        attachment = Attachment.query.get_or_404(attachment_id)
        print(f"Found attachment: {attachment.filename}, size: {attachment.file_size} bytes")
        
        # Validate user access
        user_id = request.args.get('user_id')
        if user_id:
            message = Message.query.get(attachment.message_id)
            if not message:
                print(f"Message not found for attachment {attachment_id}")
                return jsonify({"error": "Message not found"}), 404
                
            if (int(user_id) != message.sender_id and int(user_id) != message.recipient_id):
                print(f"Access denied: User {user_id} is not sender or recipient")
                return jsonify({"error": "Access denied"}), 403
                
            print(f"Access granted for user {user_id}")
        else:
            print("No user_id provided in request")
        
        # Determine if this is a download or preview request
        download = request.args.get('download') == 'true'
        
        print(f"Sending file: {attachment.filename}, type: {attachment.file_type}, download: {download}")
        
        # Send the file
        return send_file(
            io.BytesIO(attachment.file_data),
            mimetype=attachment.file_type,
            as_attachment=download,
            download_name=attachment.filename
        )
    except Exception as e:
        print(f"❌ Error retrieving attachment: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Error retrieving attachment: {str(e)}"}), 500
