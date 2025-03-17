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

    if not sender_id or not recipient_email or not subject or not body:
        return jsonify({"error": "Missing required fields"}), 400

    # Find the employer (or any user) by email
    recipient = User.query.filter(func.lower(User.email) == recipient_email.lower()).first()
    if not recipient:
        return jsonify({"error": "Recipient not found"}), 404

    new_message = Message(
        sender_id=sender_id,
        recipient_id=recipient.id,
        subject=subject,
        body=body,
        status="Pending"  # Set default status to Pending
    )
    db.session.add(new_message)
    db.session.commit()

    return jsonify({"message": "Message sent successfully"}), 201

@messages_bp.route('/messages/inbox/<int:user_id>', methods=['GET'])
def get_inbox(user_id):
    # Fetch messages where user_id is the recipient
    messages = Message.query.filter_by(recipient_id=user_id).order_by(Message.created_at.desc()).all()

    results = []
    for msg in messages:
        sender = User.query.get(msg.sender_id)
        results.append({
            "id": msg.id,
            "sender_id": msg.sender_id,
            "sender_email": sender.email if sender else "Unknown",
            "subject": msg.subject,
            "body": msg.body,
            "status": msg.status,  # Include status in response
            "created_at": msg.created_at.strftime("%Y-%m-%d %H:%M:%S")
        })
    return jsonify(results), 200

@messages_bp.route('/messages/sent/<int:user_id>', methods=['GET'])
def get_sent_messages(user_id):
    # Fetch messages where user_id is the sender
    messages = Message.query.filter_by(sender_id=user_id).order_by(Message.created_at.desc()).all()
    
    results = []
    for msg in messages:
        recipient = User.query.get(msg.recipient_id)
        results.append({
            "id": msg.id,
            "recipient_id": msg.recipient_id,
            "recipient_email": recipient.email if recipient else "Unknown",
            "subject": msg.subject,
            "body": msg.body,
            "status": msg.status,  # Include status in response
            "created_at": msg.created_at.strftime("%Y-%m-%d %H:%M:%S")
        })
    return jsonify(results), 200

@messages_bp.route('/messages/<int:message_id>/status', methods=['PUT'])
def update_message_status(message_id):
    # Get data from request
    data = request.get_json()
    new_status = data.get('status')
    
    # Validate status value
    valid_statuses = ["Pending", "Under Review", "Accepted", "Rejected"]
    if new_status not in valid_statuses:
        return jsonify({"error": "Invalid status value"}), 400
    
    # Update message status
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
