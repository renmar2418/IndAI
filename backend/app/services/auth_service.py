"""
IndAI — Auth Service
Handles JWT token creation/validation and Google OAuth token exchange.
"""

import time
import requests
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from flask import current_app


class AuthService:
    """
    Service class for authentication operations.
    Encapsulates token management and OAuth logic.
    """

    # Google OAuth endpoints
    GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
    GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
    GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

    @staticmethod
    def generate_token(user_id):
        """
        Generate a signed JWT-like token for the user.
        Uses itsdangerous for simplicity and security.
        """
        serializer = URLSafeTimedSerializer(current_app.config["SECRET_KEY"])
        return serializer.dumps({"user_id": user_id, "iat": int(time.time())})

    @staticmethod
    def validate_token(token, max_age=86400):
        """
        Validate and decode a token.
        Default max_age is 24 hours.

        Returns:
            dict or None: The decoded payload, or None if invalid.
        """
        serializer = URLSafeTimedSerializer(current_app.config["SECRET_KEY"])
        try:
            data = serializer.loads(token, max_age=max_age)
            return data
        except (BadSignature, SignatureExpired):
            return None

    @staticmethod
    def get_google_auth_url():
        """Build the Google OAuth authorization URL."""
        params = {
            "client_id": current_app.config["GOOGLE_CLIENT_ID"],
            "redirect_uri": current_app.config["GOOGLE_REDIRECT_URI"],
            "response_type": "code",
            "scope": "openid email profile",
            "access_type": "offline",
            "prompt": "consent",
        }
        query_string = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{AuthService.GOOGLE_AUTH_URL}?{query_string}"

    @staticmethod
    def exchange_code_for_tokens(code):
        """
        Exchange an authorization code for access/refresh tokens.

        Returns:
            dict or None: Token response from Google, or None on failure.
        """
        data = {
            "code": code,
            "client_id": current_app.config["GOOGLE_CLIENT_ID"],
            "client_secret": current_app.config["GOOGLE_CLIENT_SECRET"],
            "redirect_uri": current_app.config["GOOGLE_REDIRECT_URI"],
            "grant_type": "authorization_code",
        }
        response = requests.post(AuthService.GOOGLE_TOKEN_URL, data=data, timeout=10)
        if response.status_code == 200:
            return response.json()
        return None

    @staticmethod
    def get_google_user_info(access_token):
        """
        Fetch user profile information from Google.

        Returns:
            dict or None: User info containing sub, email, name, picture.
        """
        headers = {"Authorization": f"Bearer {access_token}"}
        response = requests.get(
            AuthService.GOOGLE_USERINFO_URL, headers=headers, timeout=10
        )
        if response.status_code == 200:
            return response.json()
        return None
