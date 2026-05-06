"""
IndAI — Application Factory (Factory Pattern)
Creates and configures the Flask application.
"""

from flask import Flask
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix
from flask_talisman import Talisman

from config import get_config
from app.extensions import db, migrate, limiter


def create_app(config_class=None):
    """
    Application Factory Pattern.
    Creates a new Flask app instance with all extensions and blueprints registered.
    """
    app = Flask(__name__, static_folder=None)

    # Trust Render/Vercel reverse proxies so rate limiter uses the correct client IP
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

    # Load configuration
    if config_class is None:
        config_class = get_config()
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    limiter.init_app(app)

    # Apply HTTP Security Headers (Force HTTPS in Production)
    is_prod = not app.config.get("DEBUG", False)
    Talisman(app, content_security_policy=None, force_https=is_prod)

    # CORS — allow frontend origin
    CORS(
        app,
        origins=app.config.get("FRONTEND_URLS", []),
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    )

    # Register all API blueprints (API-Led Architecture)
    _register_blueprints(app)

    # Create tables if they don't exist (development convenience)
    with app.app_context():
        # Import models so SQLAlchemy knows about them
        from app.models import user, scan, vulnerability, feedback, shared_snippet, github_connection, otp  # noqa: F401

        db.create_all()
        
        # FIX: Ensure google_id and facebook_id are nullable in the actual database
        try:
            db.session.execute(db.text("ALTER TABLE users ALTER COLUMN google_id DROP NOT NULL"))
            db.session.execute(db.text("ALTER TABLE users ALTER COLUMN facebook_id DROP NOT NULL"))
            db.session.commit()
        except Exception:
            db.session.rollback()

    # Global IP Blacklist Middleware
    @app.before_request
    def check_ip_blacklist():
        from flask import request, jsonify
        
        # Bypass for CORS preflight
        if request.method == "OPTIONS":
            return
            
        try:
            from app.models.blacklisted_ip import BlacklistedIP
            client_ip = request.remote_addr
            if client_ip and BlacklistedIP.is_blacklisted(client_ip):
                return jsonify({
                    "error": "Access Denied",
                    "message": "Your IP address has been permanently banned from accessing this platform due to policy violations."
                }), 403
        except Exception as e:
            import logging
            logging.error(f"IP Blacklist check failed: {e}")

    return app


def _register_blueprints(app):
    """Register all API layer blueprints."""

    # System API Layer — Data Access
    from app.api.system.user_system import user_system_bp
    from app.api.system.scan_system import scan_system_bp
    from app.api.system.share_system import share_system_bp

    app.register_blueprint(user_system_bp, url_prefix="/api/v1/system/users")
    app.register_blueprint(scan_system_bp, url_prefix="/api/v1/system/scans")
    app.register_blueprint(share_system_bp, url_prefix="/api/v1/system/share")

    # Process API Layer — Business Logic
    from app.api.process.auth_process import auth_process_bp
    from app.api.process.scan_process import scan_process_bp
    from app.api.process.report_process import report_process_bp
    from app.api.process.github_process import github_process_bp
    from app.api.process.share_process import share_process_bp
    from app.api.process.admin_process import admin_process_bp

    app.register_blueprint(auth_process_bp, url_prefix="/api/v1/process/auth")
    app.register_blueprint(scan_process_bp, url_prefix="/api/v1/process/scan")
    app.register_blueprint(report_process_bp, url_prefix="/api/v1/process/report")
    app.register_blueprint(github_process_bp, url_prefix="/api/v1/process/github")
    app.register_blueprint(share_process_bp, url_prefix="/api/v1/process/share")
    app.register_blueprint(admin_process_bp, url_prefix="/api/v1/process/admin")

    # Experience API Layer — Frontend Gateway
    from app.api.experience.experience_api import experience_bp

    app.register_blueprint(experience_bp, url_prefix="/api/v1/experience")
