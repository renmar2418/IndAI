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

        # Check maintenance mode
        from app.models.system_config import SystemConfig
        from flask import current_app
        
        is_maintenance = SystemConfig.get_value("maintenance_mode", False)
        
        if is_maintenance and user.role != 'admin':
            superadmin_email = current_app.config.get("SUPERADMIN_EMAIL")
            if not superadmin_email or user.email != superadmin_email:
                return jsonify({
                    "error": "Maintenance Mode",
                    "message": "IndAI is currently undergoing scheduled maintenance. Only administrators can access the platform right now. Please check back later."
                }), 503

        return f(*args, **kwargs)

    return decorated_function


def maybe_login(f):
    """
    Optional authentication decorator.
    Populates g.current_user if a valid JWT token is present,
    but does NOT block the request if the token is missing or invalid.
    Use this for public endpoints where logged-in users get extra features.
    """

    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")

        if auth_header.startswith("Bearer "):
            token = auth_header.split("Bearer ", 1)[1].strip()
            if token:
                payload = AuthService.validate_token(token)
                if payload:
                    user = User.find_by_id(payload.get("user_id"))
                    if user:
                        g.current_user = user

        return f(*args, **kwargs)

    return decorated_function
