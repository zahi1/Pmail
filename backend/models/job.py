from backend.models.database import db
from datetime import datetime

class Job(db.Model):
    __tablename__ = 'job_listings'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(100), nullable=False)
    job_type = db.Column(db.String(100), nullable=False)
    location = db.Column(db.String(100), nullable=False)
    company_name = db.Column(db.String(100), nullable=False)
    deadline = db.Column(db.DateTime, nullable=True)  # Add deadline field
    created_at = db.Column(db.DateTime, server_default=db.func.current_timestamp())
    
    def is_open(self):
        """Check if job is still open for applications"""
        if self.deadline is None:
            return True
        return datetime.utcnow() <= self.deadline