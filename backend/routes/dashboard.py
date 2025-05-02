# backend/routes/dashboard.py
from flask import Blueprint, jsonify
from backend.models.database import db
from backend.models.message import Message
from backend.models.job import Job  # your job_listings model
from backend.models.user import User
from sqlalchemy import func
from collections import defaultdict
from datetime import datetime

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/employee/<int:employee_id>', methods=['GET'])
def employee_dashboard(employee_id):
    """
    This route does NOT require a job_id column in messages.
    We parse the job title from the subject (assuming "Application for: <Title>"),
    then look up that title in job_listings for category, job_type, etc.
    """

    # Fetch all non-draft messages sent by this employee
    messages = Message.query.filter_by(sender_id=employee_id, is_draft=False)\
                    .order_by(Message.created_at.desc()).all()

    # Aggregators
    status_counts = defaultdict(int)
    time_series = defaultdict(int)
    category_counts = defaultdict(int)
    day_of_week_counts = defaultdict(int)

    # Table data
    applications = []

    for msg in messages:
        # 1) Parse job title from subject
        job_title = None
        if msg.subject.lower().startswith("application for:"):
            after_colon = msg.subject.split(":", 1)[1].strip()
            job_title = after_colon  # e.g. "Developer"

        # 2) Look up that job title in job_listings
        found_job = None
        if job_title:
            found_job = Job.query.filter_by(title=job_title).first()

        # 3) Aggregation
        #    a) Status
        msg_status = msg.status or "Pending"
        status_counts[msg_status] += 1

        #    b) Time series by YYYY-MM
        month_str = msg.created_at.strftime("%Y-%m")
        time_series[month_str] += 1

        #    c) Category
        if found_job:
            cat = found_job.category
            category_counts[cat] += 1

        #    d) Day of Week
        day_name = msg.created_at.strftime("%A")  # e.g. "Monday"
        day_of_week_counts[day_name] += 1

        # 4) Table row
        recipient_user = User.query.get(msg.recipient_id)
        recipient_email = recipient_user.email if recipient_user else "unknown"

        applications.append({
            "id": msg.id,  # Add the message ID for viewing applications
            "subject": msg.subject,
            "status": msg.status,
            "created_at": msg.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "recipient_email": recipient_email,
            "job_category": found_job.category if found_job else "N/A",
            "job_type": found_job.job_type if found_job else "N/A",
            "job_location": found_job.location if found_job else "N/A",
            "job_company": found_job.company_name if found_job else "N/A",
            "salary_range": found_job.salary_range if found_job else "Not specified"
        })

    return jsonify({
        "status_counts": dict(status_counts),
        "time_series": dict(time_series),
        "category_counts": dict(category_counts),
        "day_of_week_counts": dict(day_of_week_counts),
        "applications": applications
    }), 200

@dashboard_bp.route('/employer/<int:employer_id>', methods=['GET'])
def employer_dashboard(employer_id):
    """
    This route returns dashboard data for an employer showing received applications.
    """
    # Fetch all non-draft messages received by this employer
    messages = Message.query.filter_by(recipient_id=employer_id, is_draft=False)\
                    .order_by(Message.created_at.desc()).all()

    # Aggregators
    status_counts = defaultdict(int)
    time_series = defaultdict(int)
    category_counts = defaultdict(int)
    day_of_week_counts = defaultdict(int)

    # Table data
    applications = []

    # Track all job titles to determine open/closed status
    job_title_status = {}  # Map of job title -> is_closed status

    # First pass - get all jobs and determine which are closed
    active_jobs = Job.query.filter(
        Job.company_name == User.query.get(employer_id).company_name
    ).all()

    # Create mapping of job titles to closed status
    for job in active_jobs:
        is_closed = False
        if job.deadline and job.deadline < datetime.now():
            is_closed = True
        job_title_status[job.title.lower()] = is_closed

    for msg in messages:
        # 1) Parse job title from subject
        job_title = None
        if msg.subject.lower().startswith("application for:"):
            after_colon = msg.subject.split(":", 1)[1].strip()
            job_title = after_colon  # e.g. "Developer"

        # 2) Look up that job title in job_listings
        found_job = None
        is_closed = False
        
        if job_title:
            found_job = Job.query.filter(func.lower(Job.title) == job_title.lower()).first()
            # Check if job is closed based on our mapping
            is_closed = job_title_status.get(job_title.lower(), False)

        # 3) Aggregation
        #    a) Status
        msg_status = msg.status or "Pending"
        status_counts[msg_status] += 1

        #    b) Time series by YYYY-MM
        month_str = msg.created_at.strftime("%Y-%m")
        time_series[month_str] += 1

        #    c) Category
        if found_job:
            cat = found_job.category
            category_counts[cat] += 1

        #    d) Day of Week
        day_name = msg.created_at.strftime("%A")  # e.g. "Monday"
        day_of_week_counts[day_name] += 1

        # 4) Table row
        sender_user = User.query.get(msg.sender_id)
        sender_email = sender_user.email if sender_user else "unknown"

        applications.append({
            "id": msg.id,
            "subject": msg.subject,
            "status": msg.status,
            "created_at": msg.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "sender_email": sender_email,
            "job_category": found_job.category if found_job else "N/A",
            "job_type": found_job.job_type if found_job else "N/A",
            "job_location": found_job.location if found_job else "N/A",
            "job_company": found_job.company_name if found_job else "N/A",
            "job_closed": is_closed,  # New field to indicate if job is closed
            "salary_range": found_job.salary_range if found_job else "Not specified"
        })

    return jsonify({
        "status_counts": dict(status_counts),
        "time_series": dict(time_series),
        "category_counts": dict(category_counts),
        "day_of_week_counts": dict(day_of_week_counts),
        "applications": applications
    }), 200

@dashboard_bp.route('/employee/profile/<int:employee_id>', methods=['GET'])
def employee_profile(employee_id):
    """Get employee profile data and application statistics"""
    
    # Get the employee's user information
    employee = User.query.get(employee_id)
    if not employee:
        return jsonify({"error": "Employee not found"}), 404
    
    # Count different types of applications
    total_applications = Message.query.filter_by(
        sender_id=employee_id, 
        is_draft=False
    ).count()
    
    under_review_count = Message.query.filter_by(
        sender_id=employee_id,
        is_draft=False,
        status="Under Review"
    ).count()
    
    accepted_count = Message.query.filter_by(
        sender_id=employee_id,
        is_draft=False,
        status="Accepted"
    ).count()
    
    # Return all profile data
    return jsonify({
        "profile": {
            "first_name": employee.first_name,
            "last_name": employee.last_name,
            "email": employee.email,
            "categories": employee.user_categories.split(',') if employee.user_categories else []
        },
        "stats": {
            "total_applications": total_applications,
            "interviews": under_review_count,
            "accepted": accepted_count
        }
    }), 200

@dashboard_bp.route('/employee/matching-jobs/<int:employee_id>', methods=['GET'])
def get_matching_jobs(employee_id):
    """
    Find jobs that match the employee's categories (interests)
    """
    try:
        # Get the user's categories
        employee = User.query.get(employee_id)
        if not employee:
            return jsonify({"error": "Employee not found"}), 404
            
        # Parse the user's categories (comma-separated string)
        user_categories = []
        if employee.user_categories:
            user_categories = [cat.strip().lower() for cat in employee.user_categories.split(',')]
            
        if not user_categories:
            return jsonify({"message": "No categories set for this user", "jobs": []}), 200
            
        # Find jobs that match any of the user's categories
        # Only show open jobs (deadline in future or no deadline)
        jobs = Job.query.filter(
            func.lower(Job.category).in_([cat.lower() for cat in user_categories]),
            (Job.deadline >= datetime.now()) | (Job.deadline.is_(None))
        ).order_by(Job.created_at.desc()).all()
        
        # Format the job data
        matching_jobs = []
        for job in jobs:
            # Calculate match percentage based on exact category match
            match_percentage = 85  # Base match percentage
            if job.category.lower() in user_categories:
                match_percentage += 7  # Boost for exact category match
                
            # Format the job details
            matching_jobs.append({
                "id": job.id,
                "title": job.title,
                "company_name": job.company_name,
                "match_percentage": match_percentage,
                "location": job.location,
                "salary_range": job.salary_range,
                "posted_date": job.created_at.strftime("%Y-%m-%d"),
                "posted_days_ago": (datetime.now() - job.created_at).days,
                "category": job.category,
                "job_type": job.job_type
            })
            
        return jsonify({"jobs": matching_jobs}), 200
    except Exception as e:
        print(f"Error fetching matching jobs: {e}")
        return jsonify({"error": str(e)}), 500
