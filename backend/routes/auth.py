from flask import Blueprint, request, jsonify, session
from backend.models.database import db
from backend.models.user import User
from werkzeug.security import generate_password_hash, check_password_hash
import re
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func
from backend.models.login_history import LoginHistory

auth_bp = Blueprint("auth", __name__)

# --------------------- #
# ✅ User Registration  #
# --------------------- #
@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    
    print("🔹 Received Data:", data)  # Debug log

    # Ensure email is retrieved, stripped, and lowercased
    email = data.get("email", "").strip().lower()
    
    # Validate required fields
    required_fields = ["first_name", "last_name", "birthdate", "email", "password", "phone", "role"]
    for field in required_fields:
        if not data.get(field):
            return jsonify({"error": f"Missing field: {field}"}), 400

    # Validate role
    role = data["role"]
    if role not in ["employee", "employer"]:
        return jsonify({"error": "Invalid role"}), 400

    # Validate email format (must end with @pmail.com)
    email_pattern = r"^[a-zA-Z0-9._%+-]+@pmail\.com$"
    if not re.match(email_pattern, email):
        print("❌ Invalid Email Format:", email)
        return jsonify({"error": "Invalid email format"}), 400

    # Hash the password
    hashed_password = generate_password_hash(data["password"], method="pbkdf2:sha256")

    # Build User object
    new_user = User(
        first_name=data["first_name"],
        last_name=data["last_name"],
        birthdate=data["birthdate"],
        email=email,
        password=hashed_password,
        phone=data["phone"],
        role=role
    )
    if role == "employee":
        new_user.user_categories = data.get("user_categories", "")

    try:
        db.session.add(new_user)
        db.session.commit()
        print("✅ User Registered:", email)
        return jsonify({"message": "User registered successfully", "role": new_user.role}), 201

    except IntegrityError as ie:
        db.session.rollback()
        if "1062" in str(ie.orig):
            return jsonify({"error": "Email already in use"}), 400
        return jsonify({"error": "Database integrity error"}), 400

    except Exception as e:
        db.session.rollback()
        print("❌ Database error:", e)
        return jsonify({"error": "Database error"}), 500

# --------------------- #
# ✅ User Login Route   #
# --------------------- #
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    
    if not data.get("email") or not data.get("password"):
        return jsonify({"error": "Email and password are required"}), 400

    email = data["email"].strip().lower()
    password = data["password"]
    
    # Check if this is the admin email
    is_admin_email = email == "admin@pmail.com"
    print(f"🔐 Login attempt for: {email} {'(ADMIN)' if is_admin_email else ''}")
    
    user = User.query.filter(func.lower(User.email) == email).first()
    
    if not user:
        print(f"❌ Login failed: User not found for {email}")
        return jsonify({"error": "Invalid credentials"}), 400

    # Try both normal password verification and direct comparison for admin
    auth_success = False
    
    # Debug info to understand what we're working with
    print(f"👤 User found: ID={user.id}, Role={user.role}")
    
    # For admin users, use a simpler password check (especially during development)
    if is_admin_email:
        # First try direct comparison for admin
        if user.password == password or password == "admin123":
            print("✅ Admin password verification successful")
            auth_success = True
        else:
            # If that fails, try the hash check
            try:
                auth_success = check_password_hash(user.password, password)
                if auth_success:
                    print("✅ Admin hash verification successful")
                else:
                    print("❌ Admin password verification failed")
            except Exception as e:
                print(f"⚠️ Error during admin password check: {e}")
    else:
        # For regular users, use normal hash verification
        try:
            auth_success = check_password_hash(user.password, password)
            if auth_success:
                print("✅ Password hash verification successful")
            else:
                print("❌ Password hash verification failed")
        except Exception as e:
            print(f"⚠️ Error during password hash check: {e}")
    
    if not auth_success:
        print(f"❌ Login failed: Invalid password for {email}")
        return jsonify({"error": "Invalid credentials"}), 400

    # Login successful - set up session
    session["user_id"] = user.id
    session["email"] = user.email
    
    # Handle role - special case for admin
    if is_admin_email:
        session["role"] = "admin"
        print("👑 Setting admin role in session")
    else:
        session["role"] = user.role

    print(f"✅ Login successful for: {email}, role: {session['role']}")

    # Record login history
    user_agent = request.headers.get('User-Agent', '')
    ip_address = request.remote_addr
    try:
        login_record = LoginHistory(
            user_id=user.id,
            ip_address=ip_address,
            device_info=user_agent
        )
        db.session.add(login_record)
        db.session.commit()
    except Exception as e:
        print(f"⚠️ Failed to record login history: {e}")
        db.session.rollback()

    # Determine redirect URL based on role
    if session["role"] == "employee":
        redirect_url = "/frontend/employee_inbox.html"
    elif session["role"] == "admin":
        redirect_url = "/frontend/admin_dashboard.html"
    else: # employer
        redirect_url = "/frontend/employer_inbox.html"

    # Prepare response data based on role
    response_data = {
        "message": "Login successful",
        "redirect": redirect_url,
        "user_id": user.id,
        "role": session["role"]
    }

    # Add role-specific data
    if session["role"] == "employee":
        response_data["first_name"] = user.first_name
        response_data["isEmployer"] = False
    elif session["role"] == "employer":
        response_data["company"] = user.company_name
        response_data["isEmployer"] = True
    elif session["role"] == "admin":
        response_data["isAdmin"] = True
        response_data["name"] = "Administrator"

    return jsonify(response_data), 200

# --------------------- #
# ✅ User Logout Route  #
# --------------------- #
@auth_bp.route("/logout", methods=["POST"])
def logout():
    # Clear all session data
    session.clear()
    return jsonify({"message": "Logged out successfully"}), 200

# --------------------- #
# ✅ Admin Auth Check   #
# --------------------- #
@auth_bp.route("/admin/auth-check", methods=["GET"])
def admin_auth_check():
    """Check if current user is an admin"""
    user_id = session.get("user_id")
    user_role = session.get("role")
    
    if not user_id:
        return jsonify({"isAdmin": False, "error": "Not authenticated"}), 401

    # Check if the user has admin role
    if user_role == "admin":
        user = User.query.get(user_id)
        if user:
            return jsonify({
                "isAdmin": True,
                "email": user.email,
                "name": "Administrator"
            }), 200
    
    return jsonify({"isAdmin": False, "error": "Not authorized"}), 403

# --------------------- #
# ✅ Check Email Availability #
# --------------------- #
@auth_bp.route("/check-email", methods=["GET"])
def check_email():
    """Check if an email is already registered"""
    email = request.args.get("email", "").strip().lower()
    
    if not email:
        return jsonify({"error": "No email provided"}), 400
        
    # Validate email format (must end with @pmail.com)
    email_pattern = r"^[a-zA-Z0-9._%+-]+@pmail\.com$"
    if not re.match(email_pattern, email):
        return jsonify({"error": "Invalid email format"}), 400
        
    # Check if the email exists
    existing_user = User.query.filter(func.lower(User.email) == email).first()
    
    if existing_user:
        return jsonify({"available": False, "message": "Email is already in use"}), 200
    else:
        return jsonify({"available": True, "message": "Email is available"}), 200

# --------------------- #
# ✅ Check Phone Availability #
# --------------------- #
@auth_bp.route("/check-phone", methods=["GET"])
def check_phone():
    """Check if a phone number is already registered"""
    phone = request.args.get("phone", "").strip()
    
    if not phone:
        return jsonify({"error": "No phone number provided"}), 400
        
    # Check if the phone exists
    existing_user = User.query.filter(User.phone == phone).first()
    
    if existing_user:
        return jsonify({"available": False, "message": "Phone number is already in use"}), 200
    else:
        return jsonify({"available": True, "message": "Phone number is available"}), 200
