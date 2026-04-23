"""
IndAI — Auth Middleware
Protects routes by validating JWT tokens.
"""

from functools import wraps
from flask import request, jsonify, g
from app.services.auth_service import AuthService
from app.models.user import User


def login_required(f):
    """
    Decorator to protect routes that require authentication.
    Validates the JWT token from the Authorization header
    and injects the current user into Flask's g context.
    """

    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Extract token from Authorization header
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return jsonify({
                "error": "Authentication required",
                "message": "Please provide a valid Bearer token in the Authorization header."
            }), 401

        token = auth_header.split("Bearer ", 1)[1].strip()

        if not token:
            return jsonify({
                "error": "Token missing",
                "message": "Bearer token is empty."
            }), 401

        # Validate token
        payload = AuthService.validate_token(token)
        if payload is None:
            return jsonify({
                "error": "Invalid or expired token",
                "message": "Please log in again."
            }), 401

        # Load user from database
        user = User.find_by_id(payload.get("user_id"))
        if user is None:
            return jsonify({
                "error": "User not found",
                "message": "The authenticated user no longer exists."
            }), 401

        # Inject user into request context
        g.current_user = user

        return f(*args, **kwargs)

    return decorated_function
