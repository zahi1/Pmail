from backend.models.database import db
from datetime import datetime

class Attachment(db.Model):
    __tablename__ = 'attachments'

    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, db.ForeignKey('messages.id', ondelete='CASCADE'), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    file_type = db.Column(db.String(100), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)
    file_data = db.Column(db.LargeBinary, nullable=False)  
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    message = db.relationship('Message', backref=db.backref('attachments', lazy=True, cascade='all, delete-orphan'))
