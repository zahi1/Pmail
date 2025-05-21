from flask import Blueprint, request, jsonify, session
from backend.models.database import db
from backend.models.job import Job
from backend.models.user import User
from sqlalchemy import func
from datetime import datetime

jobs_bp = Blueprint("jobs", __name__)

@jobs_bp.route("/jobs", methods=["GET"])
def get_all_jobs():

    category = request.args.get("category")
    job_type = request.args.get("job_type")
    salary_range = request.args.get("salary_range")
    show_closed = request.args.get("show_closed", "false").lower() == "true"
    
    query = Job.query
    if category:
        query = query.filter(func.lower(Job.category) == category.lower())
    if job_type:
        query = query.filter(func.lower(Job.job_type) == job_type.lower())
    if not show_closed:
        query = query.filter((Job.deadline >= datetime.now()) | (Job.deadline.is_(None)))
    

    jobs = query.all()
    

    filtered_jobs = []
    for job in jobs:
        
        is_open = True
        if job.deadline and job.deadline < datetime.now():
            is_open = False
        

        if salary_range and job.salary_range:
            
            if salary_range.endswith('+'):
                filter_min = int(salary_range.rstrip('+'))
                filter_max = float('inf')  
            else:
                filter_min, filter_max = map(int, salary_range.split('-'))
            

            job_min, job_max = parse_salary_range(job.salary_range)
            if job_max < filter_min or job_min > filter_max:
                continue  
        
        filtered_jobs.append({
            "id": job.id,
            "title": job.title,
            "description": job.description,
            "category": job.category,
            "job_type": job.job_type,
            "location": job.location,
            "salary_range": job.salary_range,
            "company_name": job.company_name,
            "deadline": job.deadline.strftime("%Y-%m-%d") if job.deadline else None,
            "is_open": is_open,
            "created_at": job.created_at.strftime("%Y-%m-%d %H:%M:%S")
        })
    
    return jsonify(filtered_jobs), 200

def parse_salary_range(salary_text):
    if not salary_text:
        return (0, 0)
    
    try:
        clean_text = salary_text.replace('€', '').replace('$', '').replace(',', '').replace(' ', '')
        
        if '-' in clean_text:
            parts = clean_text.split('-')
            return (int(float(parts[0])), int(float(parts[1])))
        else:
            value = int(float(clean_text))
            return (value, value)
    except Exception as e:
        print(f"Error parsing salary range '{salary_text}': {e}")
        return (0, float('inf'))  


@jobs_bp.route("/jobs/employer", methods=["GET"])
def get_employer_jobs():
  
    if "user_id" not in session or session.get("role") != "employer":
        return jsonify({"error": "Unauthorized"}), 403

    user_id = session["user_id"]
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

   
    employer_jobs = Job.query.filter_by(company_name=user.company_name).all()

    results = []
    for job in employer_jobs:
        is_open = True
        if job.deadline and job.deadline < datetime.now():
            is_open = False
            
        results.append({
            "id": job.id,
            "title": job.title,
            "description": job.description,
            "category": job.category,
            "job_type": job.job_type,
            "location": job.location,
            "salary_range": job.salary_range, 
            "company_name": job.company_name,
            "deadline": job.deadline.strftime("%Y-%m-%d") if job.deadline else None,
            "is_open": is_open
        })
    return jsonify(results), 200


@jobs_bp.route("/jobs/new", methods=["POST"])
def post_job():
    if "user_id" not in session or session.get("role") != "employer":
        return jsonify({"error": "Unauthorized"}), 403
    
    user_id = session["user_id"]
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    required_fields = ["title", "description", "category", "job_type", "location", "salary_range", "deadline"]
    for field in required_fields:
        if not data.get(field):
            return jsonify({"error": f"Missing field: {field}"}), 400

   
    try:
        deadline = datetime.strptime(data["deadline"], "%Y-%m-%d")
    except ValueError:
        return jsonify({"error": "Invalid deadline format. Use YYYY-MM-DD"}), 400

    
    new_job = Job(
        title=data["title"],
        description=data["description"],
        category=data["category"],
        job_type=data["job_type"],
        location=data["location"],
        salary_range=data["salary_range"],
        company_name=user.company_name,
        deadline=deadline  
    )
    
    try:
        db.session.add(new_job)
        db.session.commit()
        return jsonify({"message": "Job posted successfully", "id": new_job.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Database error", "details": str(e)}), 500


@jobs_bp.route("/jobs/<int:job_id>", methods=["PUT"])
def update_job(job_id):
    if "user_id" not in session or session.get("role") != "employer":
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()
    required_fields = ["title", "description", "category", "job_type", "location", "salary_range", "deadline"]
    for field in required_fields:
        if not data.get(field):
            return jsonify({"error": f"Missing field: {field}"}), 400

    job = Job.query.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404

    user_id = session["user_id"]
    user = User.query.get(user_id)
    if not user or job.company_name != user.company_name:
        return jsonify({"error": "Not authorized to edit this job"}), 403

    job.title = data["title"]
    job.description = data["description"]
    job.category = data["category"]
    job.job_type = data["job_type"]
    job.location = data["location"]
    job.salary_range = data["salary_range"]  
    
    try:
        job.deadline = datetime.strptime(data["deadline"], "%Y-%m-%d")
    except ValueError:
        return jsonify({"error": "Invalid deadline format. Use YYYY-MM-DD"}), 400

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
        
    is_open = True
    if job.deadline and job.deadline < datetime.now():
        is_open = False
    

    employer = User.query.filter_by(company_name=job.company_name, role="employer").first()
    employer_email = employer.email if employer else f"{job.company_name.lower().replace(' ', '')}@example.com"
    
    return jsonify({
        "id": job.id,
        "title": job.title,
        "description": job.description,
        "category": job.category,
        "job_type": job.job_type,
        "location": job.location,
        "salary_range": job.salary_range,  
        "company_name": job.company_name,
        "employer_email": employer_email,  
        "deadline": job.deadline.strftime("%Y-%m-%d") if job.deadline else None,
        "is_open": is_open,
        "created_at": job.created_at.strftime("%Y-%m-%d %H:%M:%S")
    }), 200


@jobs_bp.route("/jobs/titles", methods=["GET"])
def get_job_titles():
    current_date = datetime.now()
    jobs = Job.query.filter(
        (Job.deadline >= current_date) | (Job.deadline.is_(None))
    ).with_entities(Job.id, Job.title, Job.company_name).all()
    
    results = []
    for job in jobs:
        results.append({
            "id": job.id,
            "title": job.title,
            "company_name": job.company_name
        })
    return jsonify(results), 200

@jobs_bp.route("/jobs/titles/employer/<email>", methods=["GET"])
def get_job_titles_by_employer(email):
    company_name = email.split('@')[0].lower()
    
    employer = User.query.filter(func.lower(User.email) == email.lower()).first()
    
    if employer:
    
        company_name = employer.company_name
    
    current_date = datetime.now()
    jobs = Job.query.filter(
        func.lower(Job.company_name).like(f"%{company_name}%"),
        (Job.deadline >= current_date) | (Job.deadline.is_(None))
    ).all()
    
    results = []
    for job in jobs:
        results.append({
            "id": job.id,
            "title": job.title,
            "company_name": job.company_name
        })
    return jsonify(results), 200
