from flask import Blueprint, request, jsonify, session
from backend.models.database import db
from backend.models.user import User
from backend.models.message import Message
from backend.models.login_history import LoginHistory
from backend.models.job import Job
from sqlalchemy import func, extract
import traceback
from datetime import datetime

admin_bp = Blueprint('admin', __name__)

# Admin authentication check decorator
def admin_required(f):
    """Decorator to check if user is an admin"""
    def decorated_function(*args, **kwargs):
        user_id = session.get("user_id")
        role = session.get("role")
        print(f"Admin check - User ID: {user_id}, Role: {role}")
        if not user_id:
            return jsonify({"error": "Authentication required"}), 401
        if role != "admin":
            user = User.query.get(user_id)
            if not user or user.email != "admin@pmail.com":
                return jsonify({"error": "Admin privileges required"}), 403
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

@admin_bp.route('/admin/auth-check', methods=['GET'])
def admin_auth_check():
    """Check if current user is admin"""
    user_id = session.get("user_id")
    role = session.get("role")
    print(f"Auth check - Session data: user_id={user_id}, role={role}")
    if not user_id:
        print("Auth check failed: No user_id in session")
        return jsonify({"isAdmin": False, "error": "Not authenticated"}), 401
    if role == "admin":
        user = User.query.get(user_id)
        print(f"Admin check by role successful for user {user_id}")
        return jsonify({
            "isAdmin": True,
            "email": user.email if user else "admin@pmail.com",
            "name": "Administrator"
        }), 200
    user = User.query.get(user_id)
    if user and user.email == "admin@pmail.com":
        session["role"] = "admin"
        print(f"Admin check by email successful for {user.email}")
        return jsonify({
            "isAdmin": True,
            "email": user.email,
            "name": "Administrator"
        }), 200
    print(f"Admin check failed for user {user_id}")
    return jsonify({"isAdmin": False, "error": "Not authorized"}), 403

@admin_bp.route('/admin/users', methods=['GET'])
@admin_required
def get_users():
    """Get all users with pagination and filtering"""
    try:
        page        = int(request.args.get('page', 1))
        per_page    = int(request.args.get('per_page', 10))
        search      = request.args.get('search', '').strip()
        role_filter = request.args.get('role', 'all')
        query = User.query

        if search:
            term = f"%{search}%"
            query = query.filter(
                func.lower(User.email).like(func.lower(term)) |
                func.lower(User.first_name).like(func.lower(term)) |
                func.lower(User.last_name).like(func.lower(term)) |
                func.lower(User.company_name).like(func.lower(term))
            )
        if role_filter != 'all':
            query = query.filter(User.role == role_filter)

        total_users = query.count()
        users = query.order_by(User.id)\
                     .offset((page - 1) * per_page)\
                     .limit(per_page).all()
        total_pages = (total_users + per_page - 1) // per_page if total_users else 1

        result = []
        for u in users:
            info = {
                "id": u.id,
                "email": u.email,
                "role": u.role,
                "created_at": u.created_at.strftime("%Y-%m-%d %H:%M:%S") if u.created_at else None,
                "status": "active"
            }
            if u.role == "employee":
                info.update({"first_name": u.first_name, "last_name": u.last_name})
            elif u.role == "employer":
                info.update({"company_name": u.company_name, "contact_name": u.contact_name})
            result.append(info)

        return jsonify({
            "users":      result,
            "page":       page,
            "totalPages": total_pages,
            "totalUsers": total_users
        }), 200

    except Exception as e:
        print(f"Error fetching users: {e}")
        traceback.print_exc()
        return jsonify({"error": f"Failed to fetch users: {str(e)}"}), 500

@admin_bp.route('/admin/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    """Delete a user and all associated data"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        if user.email == "admin@pmail.com":
            return jsonify({"error": "Cannot delete the admin account"}), 403

        LoginHistory.query.filter_by(user_id=user_id).delete()
        Message.query.filter((Message.sender_id == user_id) | (Message.recipient_id == user_id)).delete()
        db.session.delete(user)
        db.session.commit()

        return jsonify({"success": True, "message": f"User {user.email} deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error deleting user {user_id}: {e}")
        traceback.print_exc()
        return jsonify({"success": False, "message": f"Error deleting user: {str(e)}"}), 500

@admin_bp.route('/admin/dashboard-stats', methods=['GET'])
@admin_required
def get_dashboard_stats():
    """Get statistics for admin dashboard"""
    try:
        total_users       = User.query.count()
        employee_count    = User.query.filter_by(role="employee").count()
        employer_count    = User.query.filter_by(role="employer").count()
        active_jobs       = Job.query.filter((Job.deadline == None) | (Job.deadline >= datetime.utcnow())).count()
        application_count = Message.query.filter(
            Message.subject.like('%Application for:%'),
            Message.is_draft == False,
            Message.is_spam == False
        ).count()

        return jsonify({
            "totalUsers":       total_users,
            "employeeCount":    employee_count,
            "employerCount":    employer_count,
            "activeJobs":       active_jobs,
            "totalApplications": application_count,
            "newJobs":          active_jobs,
            "activeUsers":      total_users,
            "growth": {
                "users":        5,
                "jobs":         8,
                "applications": 12,
                "activeUsers":  15
            }
        }), 200

    except Exception as e:
        print(f"Error getting dashboard stats: {e}")
        traceback.print_exc()
        return jsonify({"error": f"Error getting dashboard stats: {str(e)}"}), 500

@admin_bp.route('/admin/jobs', methods=['GET'])
@admin_required
def admin_get_jobs():
    page       = int(request.args.get('page', 1))
    per_page   = int(request.args.get('per_page', 10))
    search     = request.args.get('search', '').strip()
    status     = request.args.get('status', 'all')
    category   = request.args.get('category', 'all')
    now        = datetime.utcnow()

    query = Job.query
    if search:
        term = f"%{search.lower()}%"
        query = query.filter(
            func.lower(Job.title).like(term) |
            func.lower(Job.company_name).like(term)
        )
    if category != 'all':
        query = query.filter(Job.category == category)
    if status == 'open':
        query = query.filter((Job.deadline == None) | (Job.deadline >= now))
    elif status == 'closed':
        query = query.filter(Job.deadline < now)

    total = query.count()
    jobs  = query.order_by(Job.id).offset((page-1)*per_page).limit(per_page).all()
    total_pages = (total + per_page - 1)//per_page or 1

    data = []
    for j in jobs:
        is_open = (j.deadline is None) or (j.deadline >= now)
        data.append({
            "id":           j.id,
            "title":        j.title,
            "company_name": j.company_name,
            "category":     j.category,
            "location":     j.location,
            "job_type":     j.job_type,
            "deadline":     j.deadline.strftime("%Y-%m-%d") if j.deadline else None,
            "is_open":      is_open,
            "created_at":   j.created_at.strftime("%Y-%m-%d %H:%M:%S")
        })

    return jsonify({"jobs": data, "totalPages": total_pages}), 200

@admin_bp.route('/admin/jobs/<int:job_id>', methods=['GET','DELETE'])
@admin_required
def admin_job_actions(job_id):
    job = Job.query.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404

    if request.method == 'GET':
        is_open = (job.deadline is None) or (job.deadline >= datetime.utcnow())
        return jsonify({
            "id":           job.id,
            "title":        job.title,
            "description":  job.description,
            "category":     job.category,
            "job_type":     job.job_type,
            "location":     job.location,
            "company_name": job.company_name,
            "deadline":     job.deadline.strftime("%Y-%m-%d") if job.deadline else None,
            "is_open":      is_open,
            "created_at":   job.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }), 200

    try:
        db.session.delete(job)
        db.session.commit()
        return jsonify({"success": True}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/admin/job-categories', methods=['GET'])
@admin_required
def get_job_categories_admin():
    """Return distinct job categories for admin filter"""
    cats = db.session.query(Job.category).distinct().all()
    return jsonify({
        "categories": [{"id": cat[0], "name": cat[0]} for cat in cats]
    }), 200

@admin_bp.route('/admin/reports/user-growth', methods=['GET'])
@admin_required
def report_user_growth():
    growth = db.session.query(
        func.date_format(User.created_at, '%Y-%m').label('month'),
        func.count(User.id).label('count')
    ).group_by('month').order_by('month').all()

    labels = [m for m,_ in growth]
    data   = [c for _,c in growth]

    employee_count   = User.query.filter_by(role='employee').count()
    employer_count   = User.query.filter_by(role='employer').count()
    total_users      = User.query.count()
    new_jobs         = Job.query.count()
    app_count        = Message.query.filter(
        Message.subject.like('%Application for:%'),
        Message.is_draft == False,
        Message.is_spam == False
    ).count()
    active_users     = total_users

    return jsonify({
        'labels':           labels,
        'datasets':         data,
        'userDistribution': {'employees': employee_count, 'employers': employer_count},
        'metrics': {
            'totalUsers':   total_users,
            'newJobs':      new_jobs,
            'applications': app_count,
            'activeUsers':  active_users
        }
    }), 200

@admin_bp.route('/admin/reports/job-postings', methods=['GET'])
@admin_required
def report_job_postings():
    growth = db.session.query(
        func.date_format(Job.created_at, '%Y-%m').label('month'),
        func.count(Job.id).label('count')
    ).group_by('month').order_by('month').all()

    labels = [m for m,_ in growth]
    data   = [c for _,c in growth]

    cats = db.session.query(Job.category, func.count(Job.id)).group_by(Job.category).all()
    job_categories = [{'name': cat, 'count': cnt} for cat,cnt in cats]

    total_users  = User.query.count()
    total_jobs   = Job.query.count()
    app_count    = Message.query.filter(
        Message.subject.like('%Application for:%'),
        Message.is_draft == False,
        Message.is_spam == False
    ).count()
    active_users = total_users

    return jsonify({
        'labels':        labels,
        'datasets':      data,
        'jobCategories': job_categories,
        'metrics': {
            'totalUsers':   total_users,
            'newJobs':      total_jobs,
            'applications': app_count,
            'activeUsers':  active_users
        }
    }), 200

@admin_bp.route('/admin/reports/application-stats', methods=['GET'])
@admin_required
def report_application_stats():
    growth = db.session.query(
        func.date_format(Message.created_at, '%Y-%m').label('month'),
        func.count(Message.id).label('count')
    ).filter(
        Message.subject.like('%Application for:%'),
        Message.is_draft == False,
        Message.is_spam == False
    ).group_by('month').order_by('month').all()

    labels = [m for m,_ in growth]
    data   = [c for _,c in growth]

    status_counts = dict(
        db.session.query(
            Message.status, func.count(Message.id)
        ).filter(
            Message.subject.like('%Application for:%'),
            Message.is_draft == False,
            Message.is_spam == False
        ).group_by(Message.status).all()
    )
    for s in ['Pending','Under Review','Accepted','Rejected']:
        status_counts.setdefault(s, 0)

    total_users        = User.query.count()
    total_jobs         = Job.query.count()
    total_applications = sum(data)
    active_users       = total_users

    return jsonify({
        'labels':            labels,
        'datasets':          data,
        'statusDistribution': status_counts,
        'metrics': {
            'totalUsers':   total_users,
            'newJobs':      total_jobs,
            'applications': total_applications,
            'activeUsers':  active_users
        }
    }), 200

@admin_bp.route('/admin/reports/user-activity', methods=['GET'])
@admin_required
def report_user_activity():
    try:
        # 1️⃣ Monthly login counts
        monthly_q = db.session.query(
            func.date_format(LoginHistory.login_time, '%Y-%m').label('month'),
            func.count(LoginHistory.id).label('count')
        ).group_by('month').order_by('month').all()
        labels = [m for m, _ in monthly_q]
        data   = [c for _, c in monthly_q]

        # 2️⃣ Activity type breakdown
        app_count = Message.query.filter(
            Message.subject.like('%Application for:%'),
            Message.is_draft == False,
            Message.is_spam  == False
        ).count()
        activity_types = {
            'logins':          sum(data),
            'applications':    app_count,
            'profile updates': 0,
            'other':           0
        }

        # 3️⃣ Peak‐usage heatmap (day‐of‐week × hour)
        # MySQL: DAYOFWEEK() returns 1=Sunday…7=Saturday
        heatmap_q = db.session.query(
            func.dayofweek(LoginHistory.login_time).label('dow'),
            func.hour(LoginHistory.login_time).label('hour'),
            func.count(LoginHistory.id).label('count')
        ).group_by(
            func.dayofweek(LoginHistory.login_time),
            func.hour(LoginHistory.login_time)
        ).all()
        days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
        heatmapData = [
            {
                'x': days[int(dow) - 1],
                'y': str(int(hour)),
                'v': cnt
            }
            for dow, hour, cnt in heatmap_q
        ]

        # 4️⃣ Average logins per week by hour
        # count distinct weeks in data (MySQL YEARWEEK mode=3 ISO week)
        week_count = db.session.query(
            func.count(func.distinct(func.yearweek(LoginHistory.login_time, 3)))
        ).scalar() or 1

        avg_hour_q = db.session.query(
            func.hour(LoginHistory.login_time).label('hour'),
            (func.count(LoginHistory.id) / week_count).label('avg')
        ).group_by('hour').order_by('hour').all()
        avgByHour = [
            {'hour': str(int(hour)), 'avg': float(avg)}
            for hour, avg in avg_hour_q
        ]

        # 5️⃣ Metrics
        total_users  = User.query.count()
        total_jobs   = Job.query.count()
        active_users = total_users

        return jsonify({
            'labels':         labels,
            'datasets':       data,
            'activityTypes':  activity_types,
            'heatmapData':    heatmapData,
            'avgByHour':      avgByHour,
            'metrics': {
                'totalUsers':   total_users,
                'newJobs':      total_jobs,
                'applications': app_count,
                'activeUsers':  active_users
            }
        }), 200

    except Exception as e:
        print(f"Error in report_user_activity: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500