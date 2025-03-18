# backend/routes/messages.py
from flask import Blueprint, request, jsonify
from backend.models.database import db
from backend.models.message import Message
from backend.models.user import User
from sqlalchemy import func

messages_bp = Blueprint('messages', __name__)

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
        return jsonify({"error": "Recipient not found"}), 404

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
        db.session.commit()
        return jsonify({"message": "Draft sent successfully"}), 200
    else:
        new_message = Message(
            sender_id=sender_id,
            recipient_id=recipient.id,
            subject=subject,
            body=body,
            status="Pending",
            is_draft=False
        )
        db.session.add(new_message)
        db.session.commit()
        return jsonify({"message": "Message sent successfully"}), 201

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
        draft.status = "Draft"
        db.session.commit()
        return jsonify({"message": "Draft updated successfully", "draft_id": draft.id}), 200
    else:
        new_draft = Message(
            sender_id=sender_id,
            recipient_id=recipient.id if recipient else sender_id,
            subject=subject,
            body=body,
            status="Draft",
            is_draft=True
        )
        db.session.add(new_draft)
        db.session.commit()
        return jsonify({"message": "Draft saved successfully", "draft_id": new_draft.id}), 201

@messages_bp.route('/messages/inbox/<int:user_id>', methods=['GET'])
def get_inbox(user_id):
    # Fetch messages where user_id is the recipient and that are not drafts
    messages = Message.query.filter_by(recipient_id=user_id, is_draft=False).order_by(Message.created_at.desc()).all()

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
