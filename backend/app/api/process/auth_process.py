"""
IndAI — Auth Process API (Process Layer)
API-Led Architecture: Process Layer — Business logic for authentication.

Orchestrates the Google OAuth flow:
1. Redirect user to Google
2. Handle callback with authorization code
3. Exchange code for tokens
4. Fetch user profile
5. Create/find user in database
6. Generate JWT token

Note: Google's 2-Step Verification (Google Prompt) is handled automatically
by Google during the OAuth consent screen. If the user has 2SV enabled on
their Google account, Google will send a push notification to their trusted
device before completing the login — no custom code needed on our side.
"""

from flask import Blueprint, jsonify, request, redirect, g
from app.services.auth_service import AuthService
from app.models.user import User
from app.middleware.auth_middleware import login_required
from flask import current_app

auth_process_bp = Blueprint("process_auth", __name__)


@auth_process_bp.route("/google/login", methods=["GET"])
def google_login():
    """
    Process API: Initiate Google OAuth flow.
    Redirects the user to Google's consent screen.
    Google handles 2SV/Google Prompt automatically if user has it enabled.
    """
    auth_url = AuthService.get_google_auth_url()
    return jsonify({"auth_url": auth_url}), 200


@auth_process_bp.route("/google/callback", methods=["GET"])
def google_callback():
    """
    Process API: Handle Google OAuth callback.
    Orchestrates: code exchange -> user info -> user creation -> token generation.
    By this point, Google has already verified the user's identity
    (including 2SV/Google Prompt if enabled).
    """
    code = request.args.get("code")
    error = request.args.get("error")

    if error:
        frontend_url = current_app.config["FRONTEND_URL"]
        return redirect(f"{frontend_url}/callback?error={error}")

    if not code:
        frontend_url = current_app.config["FRONTEND_URL"]
        return redirect(f"{frontend_url}/callback?error=no_code")

    # Step 1: Exchange authorization code for tokens
    token_data = AuthService.exchange_code_for_tokens(code)
    if not token_data:
        frontend_url = current_app.config["FRONTEND_URL"]
        return redirect(f"{frontend_url}/callback?error=token_exchange_failed")

    # Step 2: Fetch user profile from Google
    access_token = token_data.get("access_token")
    user_info = AuthService.get_google_user_info(access_token)
    if not user_info:
        frontend_url = current_app.config["FRONTEND_URL"]
        return redirect(f"{frontend_url}/callback?error=user_info_failed")

    # Step 3: Find or create user in our database
    user = User.find_or_create(
        google_id=user_info.get("sub", ""),
        email=user_info.get("email", ""),
        display_name=user_info.get("name", ""),
        avatar_url=user_info.get("picture", ""),
    )

    # Step 4: Generate our own JWT token
    token = AuthService.generate_token(user.id)

    # Step 5: Redirect to frontend with token
    frontend_url = current_app.config["FRONTEND_URL"]
    return redirect(f"{frontend_url}/callback?token={token}")


@auth_process_bp.route("/status", methods=["GET"])
@login_required
def auth_status():
    """
    Process API: Check if the current token is valid.
    Returns the authenticated user's profile.
    """
    return jsonify({
        "authenticated": True,
        "user": g.current_user.to_dict(),
    }), 200


@auth_process_bp.route("/logout", methods=["POST"])
@login_required
def logout():
    """
    Process API: Log out the user.
    Client-side should discard the token.
    """
    return jsonify({
        "message": "Logged out successfully",
        "authenticated": False,
    }), 200
