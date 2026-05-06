"""
IndAI — Application Configuration
Implements OOP Inheritance for environment-specific configs.
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration class (Abstraction)."""

    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-me")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB upload limit

    # Google OAuth
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI = os.getenv(
        "GOOGLE_REDIRECT_URI",
        "https://indai-webapp-d1857db81932.herokuapp.com/api/v1/process/auth/google/callback",
    )

    # Facebook OAuth
    FACEBOOK_APP_ID = os.getenv("FACEBOOK_APP_ID", "")
    FACEBOOK_APP_SECRET = os.getenv("FACEBOOK_APP_SECRET", "")
    FACEBOOK_REDIRECT_URI = os.getenv(
        "FACEBOOK_REDIRECT_URI",
        "https://indai-webapp-d1857db81932.herokuapp.com/api/v1/process/auth/facebook/callback",
    )

    # Superadmin
    SUPERADMIN_EMAIL = os.getenv("SUPERADMIN_EMAIL", "")

    # Hybrid AI Verification
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY", "")
    AI_VERIFY_ENABLED = os.getenv("AI_VERIFY_ENABLED", "true").lower() == "true"

    # Email Configuration (SMTP)
    MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT = int(os.getenv("MAIL_PORT", 587))
    MAIL_USE_TLS = os.getenv("MAIL_USE_TLS", "true").lower() == "true"
    MAIL_USERNAME = os.getenv("MAIL_USERNAME", "")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "")
    MAIL_DEFAULT_SENDER = os.getenv("MAIL_DEFAULT_SENDER", f"IndAI <{MAIL_USERNAME}>")

    # Frontend URLs (comma-separated for multiple origins)
    FRONTEND_URLS = os.getenv(
        "FRONTEND_URLS", "https://ind-ai-five.vercel.app,https://www.renmar.dev,http://localhost:5173,http://localhost:5174"
    ).split(",")
    FRONTEND_URL = os.getenv("FRONTEND_URL", FRONTEND_URLS[0])

    # Database
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///indai.db")

    # Fix Render PostgreSQL URI (they use postgres:// but SQLAlchemy needs postgresql://)
    if SQLALCHEMY_DATABASE_URI and SQLALCHEMY_DATABASE_URI.startswith("postgres://"):
        SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace(
            "postgres://", "postgresql://", 1
        )


class DevelopmentConfig(Config):
    """Development configuration (Inheritance)."""

    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///indai.db")


class ProductionConfig(Config):
    """Production configuration (Inheritance)."""

    DEBUG = False

    # Security enhancements for production (Cross-Origin Cookies)
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "None"
    REMEMBER_COOKIE_SECURE = True
    REMEMBER_COOKIE_HTTPONLY = True


class TestingConfig(Config):
    """Testing configuration (Inheritance)."""

    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"


# Factory method to get config by name
config_by_name = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
}


def get_config():
    """Factory method to return the appropriate config."""
    env = os.getenv("FLASK_ENV", "development")
    return config_by_name.get(env, DevelopmentConfig)
