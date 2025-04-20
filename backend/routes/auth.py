from flask import Blueprint, request, jsonify, session
from backend.models.database import db
from backend.models.user import User
from werkzeug.security import generate_password_hash, check_password_hash
import re
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

    # Check if email already exists (case-insensitive)
    existing_user = User.query.filter(func.lower(User.email) == email).first()
    if existing_user:
        return jsonify({"error": "Email already in use"}), 400

    # Hash the password
    hashed_password = generate_password_hash(data["password"], method="pbkdf2:sha256")

    # Insert into database
    try:
        new_user = User(
            first_name=data["first_name"],
            last_name=data["last_name"],
            birthdate=data["birthdate"],
            email=email,
            password=hashed_password,
            phone=data["phone"],
            role=role
        )
        db.session.add(new_user)
        db.session.commit()
        print("✅ User Registered:", email)

        # Return the role so the frontend can decide where to redirect (optional)
        return jsonify({
            "message": "User registered successfully",
            "role": new_user.role
        }), 201

    except Exception as e:
        db.session.rollback()
        print("❌ Database error:", str(e))
        return jsonify({"error": "Database error", "details": str(e)}), 500

# --------------------- #
# ✅ User Login Route   #
# --------------------- #
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    
    if not data.get("email") or not data.get("password"):
        return jsonify({"error": "Email and password are required"}), 400

    email = data["email"].strip().lower()
    user = User.query.filter(func.lower(User.email) == email).first()

    if not user or not check_password_hash(user.password, data["password"]):
        print(f"❌ Login failed for: {email}")
        return jsonify({"error": "Invalid credentials"}), 400

    session["user_id"] = user.id
    session["email"] = user.email
    session["role"] = user.role

    print(f"✅ Login successful for: {email}")

    # Record login history
    user_agent = request.headers.get('User-Agent', '')
    ip_address = request.remote_addr
    login_record = LoginHistory(
        user_id=user.id,
        ip_address=ip_address,
        device_info=user_agent
    )
    db.session.add(login_record)
    db.session.commit()

    if user.role == "employee":
        redirect_url = "/frontend/employee_inbox.html"
    else:
        redirect_url = "/frontend/employer_inbox.html"

    return jsonify({
        "message": "Login successful",
        "redirect": redirect_url,
        "user_id": user.id,
        "first_name": user.first_name,  # Include first name in response
        "role": user.role
    }), 200

# --------------------- #
# ✅ User Logout Route  #
# --------------------- #
@auth_bp.route("/logout", methods=["POST"])
def logout():
    session.pop("user_id", None)
    session.pop("role", None)
    return jsonify({"message": "Logged out successfully"}), 200
