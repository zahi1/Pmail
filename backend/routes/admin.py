from flask import Blueprint, request, jsonify, session
from backend.models.database import db
from backend.models.user import User
from backend.models.message import Message
from backend.models.login_history import LoginHistory
from sqlalchemy import func
import traceback
from datetime import datetime
from backend.models.job import Job

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
            
        # Check if the user is admin - either by role or by special email
        if role != "admin":
            # Fallback check by email
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
        
    # Check if user is admin by role
    if role == "admin":
        user = User.query.get(user_id)
        print(f"Admin check by role successful for user {user_id}")
        return jsonify({
            "isAdmin": True,
            "email": user.email if user else "admin@pmail.com",
            "name": "Administrator"
        }), 200
    
    # Fallback check by email
    user = User.query.get(user_id)
    if user and user.email == "admin@pmail.com":
        # Update session for future requests
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
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))
        search = request.args.get('search', '')
        role_filter = request.args.get('role', 'all')
        
        print(f"Loading users: page={page}, per_page={per_page}, search='{search}', role='{role_filter}'")
        
        # Start with base query
        query = User.query
        
        # Apply search filter if provided - enhanced to better search across multiple fields
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (func.lower(User.email).like(func.lower(search_term))) | 
                (func.lower(User.first_name).like(func.lower(search_term))) |
                (func.lower(User.last_name).like(func.lower(search_term))) |
                (func.lower(User.company_name).like(func.lower(search_term)))
            )
        
        # Apply role filter if not 'all'
        if role_filter != 'all':
            query = query.filter(User.role == role_filter)
        
        # Count total for pagination
        total_users = query.count()
        
        # Apply pagination
        users = query.order_by(User.id).offset((page - 1) * per_page).limit(per_page).all()
        
        # Calculate total pages
        total_pages = (total_users + per_page - 1) // per_page if total_users > 0 else 1
        
        # Format results
        result = []
        for user in users:
            user_data = {
                "id": user.id,
                "email": user.email,
                "role": user.role,
                "created_at": user.created_at.strftime("%Y-%m-%d %H:%M:%S") if user.created_at else None,
                "status": "active"  # Default status
            }
            
            # Add role-specific fields
            if user.role == "employee":
                user_data.update({
                    "first_name": user.first_name,
                    "last_name": user.last_name
                })
            elif user.role == "employer":
                user_data.update({
                    "company_name": user.company_name,
                    "contact_name": user.contact_name
                })
            
            result.append(user_data)
        
        print(f"Found {len(result)} users, total: {total_users}, pages: {total_pages}")
        
        return jsonify({
            "users": result,
            "page": page,
            "totalPages": total_pages,
            "totalUsers": total_users
        }), 200
        
    except Exception as e:
        import traceback
        print(f"Error fetching users: {e}")
        print(traceback.format_exc())
        return jsonify({"error": f"Failed to fetch users: {str(e)}"}), 500

@admin_bp.route('/admin/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    """Delete a user and all associated data"""
    try:
        user = User.query.get(user_id)
        
        if not user:
            print(f"User {user_id} not found for deletion")
            return jsonify({"error": "User not found"}), 404
        
        # Prevent deleting the admin account
        if user.email == "admin@pmail.com":
            print(f"Attempted to delete admin account {user_id}")
            return jsonify({"error": "Cannot delete the admin account"}), 403
        
        # Delete associated login history
        LoginHistory.query.filter_by(user_id=user_id).delete()
        print(f"Deleted login history for user {user_id}")
        
        # Delete messages sent by or to the user
        Message.query.filter((Message.sender_id == user_id) | 
                            (Message.recipient_id == user_id)).delete()
        print(f"Deleted messages for user {user_id}")
        
        # Delete the user
        db.session.delete(user)
        db.session.commit()
        
        print(f"Successfully deleted user {user_id}")
        
        return jsonify({
            "success": True,
            "message": f"User {user.email} deleted successfully"
        }), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting user {user_id}: {e}")
        traceback.print_exc()
        return jsonify({
            "success": False,
            "message": f"Error deleting user: {str(e)}"
        }), 500

@admin_bp.route('/admin/dashboard-stats', methods=['GET'])
@admin_required
def get_dashboard_stats():
    """Get statistics for admin dashboard"""
    try:
        # Count users by role
        total_users = User.query.count()
        employee_count = User.query.filter_by(role="employee").count()
        employer_count = User.query.filter_by(role="employer").count()
        
        # Count active jobs by deadline (only jobs not expired)
        active_jobs = 0
        try:
            from backend.models.job import Job
            active_jobs = Job.query.filter(
                (Job.deadline == None) | (Job.deadline >= datetime.utcnow())
            ).count()
        except ImportError:
            pass
        
        # Count applications - assuming we can derive this from messages with application subjects
        try:
            from backend.models.message import Message
            application_count = Message.query.filter(
                Message.subject.like('%Application for:%'), 
                Message.is_draft == False,
                Message.is_spam == False
            ).count()
            total_applications = application_count
        except Exception as e:
            print(f"Error counting applications: {e}")
        
        # Include stats about user growth - mock data for now
        # In a real system, we would calculate this from historical data
        return jsonify({
            "totalUsers": total_users,
            "employeeCount": employee_count,
            "employerCount": employer_count,
            "activeJobs": active_jobs,
            "totalApplications": total_applications,
            "newJobs": active_jobs, # simplification - in real system would count recent jobs
            "activeUsers": total_users,
            "growth": {
                "users": 5,  # Mock data
                "jobs": 8,
                "applications": 12,
                "activeUsers": 15
            }
        }), 200
    except Exception as e:
        print(f"Error getting dashboard stats: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "error": f"Error getting dashboard stats: {str(e)}"
        }), 500

@admin_bp.route('/admin/jobs', methods=['GET'])
@admin_required
def admin_get_jobs():
    page      = int(request.args.get('page', 1))
    per_page  = int(request.args.get('per_page', 10))
    search    = request.args.get('search', '').strip()
    status    = request.args.get('status', 'all')
    category  = request.args.get('category', 'all')

    query = Job.query
    # search by title or company
    if search:
        term = f"%{search.lower()}%"
        query = query.filter(
            func.lower(Job.title).like(term) |
            func.lower(Job.company_name).like(term)
        )
    # filter by category
    if category != 'all':
        query = query.filter(Job.category == category)
    # filter by status
    now = datetime.utcnow()
    if status == 'open':
        query = query.filter((Job.deadline == None) | (Job.deadline >= now))
    elif status == 'closed':
        query = query.filter(Job.deadline < now)
    # count & paginate
    total = query.count()
    jobs = query.order_by(Job.id)\
                .offset((page-1)*per_page)\
                .limit(per_page)\
                .all()
    total_pages = (total + per_page - 1)//per_page or 1

    data = []
    for j in jobs:
        is_open = (j.deadline is None) or (j.deadline >= now)
        data.append({
            "id": j.id,
            "title": j.title,
            "company_name": j.company_name,
            "category": j.category,
            "location": j.location,
            "job_type": j.job_type,
            "deadline": j.deadline.strftime("%Y-%m-%d") if j.deadline else None,
            "is_open": is_open,
            "created_at": j.created_at.strftime("%Y-%m-%d %H:%M:%S")
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
            "id": job.id,
            "title": job.title,
            "description": job.description,
            "category": job.category,
            "job_type": job.job_type,
            "location": job.location,
            "company_name": job.company_name,
            "deadline": job.deadline.strftime("%Y-%m-%d") if job.deadline else None,
            "is_open": is_open,
            "created_at": job.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }), 200

    # DELETE
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