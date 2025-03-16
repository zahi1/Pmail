from flask import Blueprint, request, jsonify, session
from backend.models.database import db
from backend.models.job import Job
from backend.models.user import User
from sqlalchemy import func

jobs_bp = Blueprint("jobs", __name__)

# ---------------------------------
# GET /jobs - For employees to find jobs
# ---------------------------------
@jobs_bp.route("/jobs", methods=["GET"])
def get_all_jobs():
    # Optional filters via query parameters
    category = request.args.get("category")
    job_type = request.args.get("job_type")
    query = Job.query
    if category:
        query = query.filter(Job.category == category)
    if job_type:
        query = query.filter(Job.job_type == job_type)
    
    jobs = query.all()
    results = []
    for job in jobs:
        results.append({
            "id": job.id,
            "title": job.title,
            "description": job.description,
            "category": job.category,
            "job_type": job.job_type,
            "location": job.location,
            "company_name": job.company_name,
            "created_at": job.created_at.strftime("%Y-%m-%d %H:%M:%S")
        })
    return jsonify(results), 200

# ---------------------------------
# GET /jobs/employer - Employer's own jobs
# ---------------------------------
@jobs_bp.route("/jobs/employer", methods=["GET"])
def get_employer_jobs():
    # Ensure user is employer
    if "user_id" not in session or session.get("role") != "employer":
        return jsonify({"error": "Unauthorized"}), 403

    user_id = session["user_id"]
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Optionally, you could store employer's user_id in the Job table
    # Here we rely on matching company_name
    employer_jobs = Job.query.filter_by(company_name=user.company_name).all()

    results = []
    for job in employer_jobs:
        results.append({
            "id": job.id,
            "title": job.title,
            "description": job.description,
            "category": job.category,
            "job_type": job.job_type,
            "location": job.location,
            "company_name": job.company_name
        })
    return jsonify(results), 200

# ---------------------------------
# POST /jobs/new - Employer posts a new job
# ---------------------------------
@jobs_bp.route("/jobs/new", methods=["POST"])
def post_job():
    # Ensure user is authenticated and is an employer
    if "user_id" not in session or session.get("role") != "employer":
        return jsonify({"error": "Unauthorized"}), 403
    
    user_id = session["user_id"]
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    required_fields = ["title", "description", "category", "job_type", "location"]
    for field in required_fields:
        if not data.get(field):
            return jsonify({"error": f"Missing field: {field}"}), 400

    # Use employer's company name
    new_job = Job(
        title=data["title"],
        description=data["description"],
        category=data["category"],
        job_type=data["job_type"],
        location=data["location"],
        company_name=user.company_name  # Assumes employer has company_name set
    )
    
    try:
        db.session.add(new_job)
        db.session.commit()
        return jsonify({"message": "Job posted successfully", "id": new_job.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Database error", "details": str(e)}), 500

# ---------------------------------
# PUT /jobs/<job_id> - Employer updates a job
# ---------------------------------
@jobs_bp.route("/jobs/<int:job_id>", methods=["PUT"])
def update_job(job_id):
    # Ensure user is employer
    if "user_id" not in session or session.get("role") != "employer":
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()
    required_fields = ["title", "description", "category", "job_type", "location"]
    for field in required_fields:
        if not data.get(field):
            return jsonify({"error": f"Missing field: {field}"}), 400

    job = Job.query.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404

    # Ensure the job belongs to this employer by checking company_name
    user_id = session["user_id"]
    user = User.query.get(user_id)
    if not user or job.company_name != user.company_name:
        return jsonify({"error": "Not authorized to edit this job"}), 403

    job.title = data["title"]
    job.description = data["description"]
    job.category = data["category"]
    job.job_type = data["job_type"]
    job.location = data["location"]

    try:
        db.session.commit()
        return jsonify({"message": "Job updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Database error", "details": str(e)}), 500

@jobs_bp.route("/jobs/<int:job_id>", methods=["GET"])
def get_job_detail(job_id):
    job = Job.query.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
    return jsonify({
        "id": job.id,
        "title": job.title,
        "description": job.description,
        "category": job.category,
        "job_type": job.job_type,
        "location": job.location,
        "company_name": job.company_name,
        "created_at": job.created_at.strftime("%Y-%m-%d %H:%M:%S")
    }), 200

# ---------------------------------
# GET /jobs/titles - Get all job titles for email subjects
# ---------------------------------
@jobs_bp.route("/jobs/titles", methods=["GET"])
def get_job_titles():
    # Get all job titles with their employer company names
    jobs = Job.query.with_entities(Job.id, Job.title, Job.company_name).all()
    results = []
    for job in jobs:
        results.append({
            "id": job.id,
            "title": job.title,
            "company_name": job.company_name
        })
    return jsonify(results), 200

# ---------------------------------
# GET /jobs/titles/employer/<email> - Get job titles for a specific employer
# ---------------------------------
@jobs_bp.route("/jobs/titles/employer/<email>", methods=["GET"])
def get_job_titles_by_employer(email):
    # Extract company name from email (e.g., "techcorp@example.com" -> "techcorp")
    company_name = email.split('@')[0].lower()
    
    # Find the actual employer in the database
    employer = User.query.filter(func.lower(User.email) == email.lower()).first()
    
    if employer:
        # Use the employer's actual company name if available
        company_name = employer.company_name
    
    # Get jobs for this company
    jobs = Job.query.filter(func.lower(Job.company_name).like(f"%{company_name}%")).all()
    
    results = []
    for job in jobs:
        results.append({
            "id": job.id,
            "title": job.title,
            "company_name": job.company_name
        })
    return jsonify(results), 200
