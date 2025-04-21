from backend.models.database import db

class StatusMessage(db.Model):
    __tablename__ = 'status_messages'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)  # Employer user ID
    status = db.Column(db.String(20), nullable=False)  # 'pending', 'under_review', 'accepted', 'rejected'
    message = db.Column(db.Text, nullable=False)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'status', name='unique_user_status'),
    )
