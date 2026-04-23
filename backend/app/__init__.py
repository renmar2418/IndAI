"""
IndAI — Application Factory (Factory Pattern)
Creates and configures the Flask application.
"""

from flask import Flask
from flask_cors import CORS

from config import get_config
from app.extensions import db, migrate, limiter


def create_app(config_class=None):
    """
    Application Factory Pattern.
    Creates a new Flask app instance with all extensions and blueprints registered.
    """
    app = Flask(__name__, static_folder=None)

    # Load configuration
    if config_class is None:
        config_class = get_config()
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    limiter.init_app(app)

    # CORS — allow frontend origin
    CORS(
        app,
        origins=[app.config["FRONTEND_URL"]],
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    )

    # Register all API blueprints (API-Led Architecture)
    _register_blueprints(app)

    # Create tables if they don't exist (development convenience)
    with app.app_context():
        # Import models so SQLAlchemy knows about them
        from app.models import user, scan, vulnerability, feedback  # noqa: F401

        db.create_all()

    return app


def _register_blueprints(app):
    """Register all API layer blueprints."""

    # System API Layer — Data Access
    from app.api.system.user_system import user_system_bp
    from app.api.system.scan_system import scan_system_bp

    app.register_blueprint(user_system_bp, url_prefix="/api/v1/system/users")
    app.register_blueprint(scan_system_bp, url_prefix="/api/v1/system/scans")

    # Process API Layer — Business Logic
    from app.api.process.auth_process import auth_process_bp
    from app.api.process.scan_process import scan_process_bp
    from app.api.process.report_process import report_process_bp
    from app.api.process.github_process import github_process_bp

    app.register_blueprint(auth_process_bp, url_prefix="/api/v1/process/auth")
    app.register_blueprint(scan_process_bp, url_prefix="/api/v1/process/scan")
    app.register_blueprint(report_process_bp, url_prefix="/api/v1/process/report")
    app.register_blueprint(github_process_bp, url_prefix="/api/v1/process/github")

    # Experience API Layer — Frontend Gateway
    from app.api.experience.experience_api import experience_bp

    app.register_blueprint(experience_bp, url_prefix="/api/v1/experience")
