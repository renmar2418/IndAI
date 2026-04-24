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

    # Google OAuth
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI = os.getenv(
        "GOOGLE_REDIRECT_URI",
        "http://localhost:5000/api/v1/process/auth/google/callback",
    )

    # Frontend URLs (comma-separated for multiple origins)
    FRONTEND_URLS = os.getenv(
        "FRONTEND_URLS", "http://localhost:5173,https://ind-ai-five.vercel.app"
    ).split(",")

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
