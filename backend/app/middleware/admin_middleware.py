"""
IndAI — Admin Middleware
Provides role-based access control (RBAC) decorators.
"""

from functools import wraps
from flask import jsonify, g, current_app
from app.middleware.auth_middleware import login_required

def admin_required(f):
    """
    Decorator to require admin privileges.
    Must be stacked on top of @login_required (or includes it).
    
    Usage:
        @app.route('/admin/dashboard')
        @login_required
        @admin_required
        def admin_dashboard():
            ...
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Ensure user is authenticated first (g.current_user should be set by @login_required)
        if not getattr(g, 'current_user', None):
            return jsonify({"error": "Authentication required"}), 401
            
        # Check if user has admin role OR is the superadmin
        is_superadmin = False
        superadmin_email = current_app.config.get("SUPERADMIN_EMAIL")
        if superadmin_email and g.current_user.email == superadmin_email:
            is_superadmin = True

        if not g.current_user.is_admin and not is_superadmin:
            return jsonify({"error": "Admin privileges required"}), 403
            
        # Optional: Inject the superadmin flag into the request context
        g.is_superadmin = is_superadmin
            
        return f(*args, **kwargs)
        
    return decorated_function
