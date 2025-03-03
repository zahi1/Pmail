# backend/routes/profile.py
from flask import Blueprint, request, jsonify, session
from backend.models.database import db
from backend.models.user import User

profile_bp = Blueprint("profile", __name__)

@profile_bp.route("/profile", methods=["GET"])
def get_profile():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    user_data = {
        "id": user.id,
        "email": user.email,
        "phone": user.phone,
        "birthdate": user.birthdate.strftime("%Y-%m-%d") if user.birthdate else None,
        "role": user.role
    }

    if user.role == "employee":
        user_data.update({
            "first_name": user.first_name,
            "last_name": user.last_name,
        })
    elif user.role == "employer":
        user_data.update({
            "company_name": user.company_name,
            "contact_name": user.contact_name,
            "address": user.address
        })

    return jsonify(user_data), 200

@profile_bp.route("/profile", methods=["PUT"])
def update_profile():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.role == "employee":
        allowed_fields = ["first_name", "last_name", "birthdate", "phone"]
    elif user.role == "employer":
        allowed_fields = ["company_name", "contact_name", "address", "birthdate", "phone"]
    else:
        allowed_fields = []

    for field in allowed_fields:
        if field in data:
            setattr(user, field, data[field])
    try:
        db.session.commit()
        return jsonify({"message": "Profile updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Database error", "details": str(e)}), 500
