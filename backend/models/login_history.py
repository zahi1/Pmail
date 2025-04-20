from backend.models.database import db
from datetime import datetime

class LoginHistory(db.Model):
    __tablename__ = 'login_history'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    login_time = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    ip_address = db.Column(db.String(50), nullable=True)
    device_info = db.Column(db.Text, nullable=True)
    
    # Relationship with User model
    user = db.relationship('User', backref=db.backref('login_history', lazy=True))
