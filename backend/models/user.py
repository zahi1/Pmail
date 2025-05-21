from backend.models.database import db
from sqlalchemy import Column, Integer, String, Date, Enum, TIMESTAMP
from datetime import datetime

class User(db.Model):
    __tablename__ = "users" 

    id = Column(Integer, primary_key=True, autoincrement=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    birthdate = Column(Date, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=False)
    role = Column(Enum('employee', 'employer', 'admin'), nullable=False)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)

    company_name = db.Column(db.String(100))
    contact_name = db.Column(db.String(100))
    address = db.Column(db.String(255))
    
    user_categories = db.Column(db.String(500))  