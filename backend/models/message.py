# backend/models/message.py
from backend.models.database import db

class Message(db.Model):
    __tablename__ = 'messages'

    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, nullable=False)
    recipient_id = db.Column(db.Integer, nullable=False)
    subject = db.Column(db.String(255), nullable=False)
    body = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default="Pending", nullable=False)
    is_draft = db.Column(db.Boolean, default=False, nullable=False)
    is_spam = db.Column(db.Boolean, default=False, nullable=False)  # Add is_spam column
    parent_id = db.Column(db.Integer, db.ForeignKey('messages.id'), nullable=True)
    # threaded replies
    replies = db.relationship('Message',
                              backref=db.backref('parent', remote_side=[id]),
                              lazy=True)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
