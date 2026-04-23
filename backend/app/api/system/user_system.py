"""
IndAI — User System API (System Layer)
API-Led Architecture: System Layer — Direct data access operations.

Provides low-level CRUD operations on the users table.
Only called by Process APIs, never directly by the frontend.
"""

from flask import Blueprint, jsonify, request
from app.models.user import User

user_system_bp = Blueprint("system_users", __name__)


@user_system_bp.route("/<int:user_id>", methods=["GET"])
def get_user(user_id):
    """System API: Get a user by ID."""
    user = User.find_by_id(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"data": user.to_dict()}), 200


@user_system_bp.route("/google/<google_id>", methods=["GET"])
def get_user_by_google_id(google_id):
    """System API: Find a user by Google ID."""
    user = User.find_by_google_id(google_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"data": user.to_dict()}), 200


@user_system_bp.route("/", methods=["POST"])
def create_user():
    """System API: Create or update a user from Google profile."""
    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body is required"}), 400

    required_fields = ["google_id", "email", "display_name"]
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400

    user = User.find_or_create(
        google_id=data["google_id"],
        email=data["email"],
        display_name=data["display_name"],
        avatar_url=data.get("avatar_url"),
    )

    return jsonify({"data": user.to_dict()}), 201
