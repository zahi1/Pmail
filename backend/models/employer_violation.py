from backend.models.database import db
from datetime import datetime

class EmployerViolation(db.Model):
    __tablename__ = 'employer_violations'

    id = db.Column(db.Integer, primary_key=True)
    employer_id = db.Column(db.Integer, nullable=False)
    message_id = db.Column(db.Integer, nullable=False)
    violation_date = db.Column(db.DateTime, default=datetime.utcnow)
    acknowledged = db.Column(db.Boolean, default=False)
    resulted_in_suspension = db.Column(db.Boolean, default=False)
    
    def __repr__(self):
        return f'<EmployerViolation {self.id} employer_id:{self.employer_id}>'
