from flask import Blueprint, request, jsonify, session
from backend.models.database import db
from backend.models.message import Message
from backend.models.job import Job
from backend.models.user import User
from sqlalchemy import desc
from datetime import datetime, timedelta

employer_bp = Blueprint("employer", __name__)

@employer_bp.route("/employer/recent-applications", methods=["GET"])
def get_recent_applications():
  
    if "user_id" not in session or session.get("role") != "employer":
        return jsonify({"error": "Unauthorized"}), 403
    
    employer_id = session["user_id"]
    
    applications = Message.query.filter(
        Message.recipient_id == employer_id,
        Message.is_draft == False,
        Message.is_spam == False,
        Message.subject.like("%Application for:%")
    ).order_by(desc(Message.created_at)).limit(5).all()
    
    results = []
    for app in applications:
        applicant = User.query.get(app.sender_id)
        

        job_title = "Unknown Position"
        if "Application for:" in app.subject:
            job_title = app.subject.split("Application for:")[1].strip()
        

        time_diff = datetime.now() - app.created_at
        if time_diff.days > 0:
            time_ago = f"{time_diff.days} days ago"
        elif time_diff.seconds // 3600 > 0:
            time_ago = f"{time_diff.seconds // 3600} hours ago"
        else:
            time_ago = f"{time_diff.seconds // 60} minutes ago"
        
        results.append({
            "id": app.id,
            "applicant_name": f"{applicant.first_name} {applicant.last_name}" if applicant else "Unknown",
            "applicant_title": applicant.professional_title if hasattr(applicant, 'professional_title') else "Applicant",
            "applicant_avatar": applicant.avatar_url if hasattr(applicant, 'avatar_url') else None,
            "position": job_title,
            "date": time_ago,
            "status": app.status,
        })
    
    return jsonify(results), 200

@employer_bp.route("/employer/active-jobs", methods=["GET"])
def get_active_jobs():

    if "user_id" not in session or session.get("role") != "employer":
        return jsonify({"error": "Unauthorized"}), 403
    
    employer_id = session["user_id"]
    
    employer = User.query.get(employer_id)
    if not employer or not employer.company_name:
        return jsonify({"error": "Employer profile not found"}), 404

    current_date = datetime.now()
    active_jobs = Job.query.filter(
        Job.company_name == employer.company_name,
        (Job.deadline >= current_date) | (Job.deadline.is_(None))
    ).order_by(desc(Job.created_at)).all()
    
    results = []
    for job in active_jobs:

        applications = Message.query.filter(
            Message.recipient_id == employer_id,
            Message.is_draft == False,
            Message.subject.like(f"%Application for: {job.title}%")
        ).all()
        
        application_count = len(applications)
        

        accepted_count = sum(1 for app in applications if app.status == "Accepted")
        rejected_count = sum(1 for app in applications if app.status == "Rejected")
        
  
        days_since_posting = (datetime.now() - job.created_at).days
        if days_since_posting == 0:
            posted_date = "Posted today"
        elif days_since_posting == 1:
            posted_date = "Posted yesterday"
        else:
            posted_date = f"Posted {days_since_posting} days ago"
        

        is_hot = application_count > 20 or (application_count > 10 and days_since_posting < 3)
        
        results.append({
            "id": job.id,
            "title": job.title,
            "badge": "Hot" if is_hot else "Active",
            "applications": application_count,
            "accepted": accepted_count, 
            "rejected": rejected_count,   
            "posted_date": posted_date
        })
    
    return jsonify(results), 200

@employer_bp.route("/employer/profile", methods=["GET"])
def get_employer_profile():
    if "user_id" not in session or session.get("role") != "employer":
        return jsonify({"error": "Unauthorized"}), 403
    
    employer_id = session["user_id"]
    
    employer = User.query.get(employer_id)
    if not employer:
        return jsonify({"error": "Employer not found"}), 404
    
    current_date = datetime.now()
    active_jobs_count = Job.query.filter(
        Job.company_name == employer.company_name,
        (Job.deadline >= current_date) | (Job.deadline.is_(None))
    ).count()
    
    applications_count = Message.query.filter(
        Message.recipient_id == employer_id,
        Message.is_draft == False,
        Message.subject.like("%Application for:%")
    ).count()
    
    under_review_count = Message.query.filter(
        Message.recipient_id == employer_id,
        Message.is_draft == False,
        Message.subject.like("%Application for:%"),
        Message.status == "Under Review"
    ).count()
    
    one_week_ago = datetime.now() - timedelta(days=7)
    new_this_week_count = Message.query.filter(
        Message.recipient_id == employer_id,
        Message.is_draft == False,
        Message.subject.like("%Application for:%"),
        Message.created_at >= one_week_ago
    ).count()
    
    accepted_count = Message.query.filter(
        Message.recipient_id == employer_id,
        Message.is_draft == False,
        Message.subject.like("%Application for:%"),
        Message.status == "Accepted"
    ).count()
    
    rejected_count = Message.query.filter(
        Message.recipient_id == employer_id,
        Message.is_draft == False,
        Message.subject.like("%Application for:%"),
        Message.status == "Rejected"
    ).count()
    
    return jsonify({
        "company_name": employer.company_name or "Your Company",
        "address": employer.address or "Address not specified",
        "stats": {
            "active_jobs": active_jobs_count,
            "applications": applications_count,
            "under_review": under_review_count,
            "new_this_week": new_this_week_count,
            "accepted": accepted_count,
            "rejected": rejected_count
        }
    }), 200

def calculate_match_score(applicant, job_title):
    import random
    return random.randint(65, 95)
