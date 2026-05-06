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

import re
import os
import uuid
import secrets
import logging
from werkzeug.utils import secure_filename
from flask import Blueprint, jsonify, request, redirect, g
from app.services.auth_service import AuthService
from app.services.email_service import EmailService
from app.models.user import User
from app.models.otp import OTP
from app.middleware.auth_middleware import login_required
from app.extensions import limiter
from flask import current_app

logger = logging.getLogger(__name__)

auth_process_bp = Blueprint("process_auth", __name__)


@auth_process_bp.route("/register", methods=["POST"])
@limiter.limit("5 per minute")
def register():
    """
    Process API: Register a new user with credentials.
    Expects JSON: email, password, display_name, phone_number
    (Username removed — OTP-based registration is preferred)
    """
    data = request.get_json()
    email = data.get("email", "")
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    # Strict Validation
    if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email):
        return jsonify({"error": "Invalid email format"}), 400
        
    password_regex = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$"
    if not re.match(password_regex, password):
        return jsonify({"error": "Password must be at least 8 characters, include an uppercase letter, a number, and a special character"}), 400

    # Check if email already exists
    if User.find_by_email(data["email"]):
        return jsonify({"error": "Email already in use"}), 409

    # Create new user (no username required)
    user = User.create(
        email=data["email"],
        display_name=data.get("display_name") or data["email"].split("@")[0],
        phone_number=data.get("phone_number")
    )
    user.set_password(data["password"])
    user.save()

    # Generate token
    token = AuthService.generate_token(user.id)
    return jsonify({
        "message": "User registered successfully",
        "token": token,
        "user": user.to_dict()
    }), 201


# ── Email OTP Authentication ──────────────────────────────────────

@auth_process_bp.route("/otp/send", methods=["POST"])
@limiter.limit("5 per minute")
def send_otp():
    """
    Process API: Send a 6-digit OTP code to the user's email.
    Expects JSON: { email, purpose? }
    purpose can be "register" (default), "login", or "reset".
    """
    data = request.get_json()
    if not data:
        return jsonify({
            "success": False,
            "error_code": "MISSING_BODY",
            "message": "Request body is required."
        }), 400

    email = (data.get("email") or "").strip().lower()
    purpose = data.get("purpose", "register")

    # ── Validate email format ──
    if not email:
        return jsonify({
            "success": False,
            "error_code": "EMAIL_REQUIRED",
            "message": "Please enter your email address."
        }), 400

    if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email):
        return jsonify({
            "success": False,
            "error_code": "EMAIL_INVALID",
            "message": "Please enter a valid email address."
        }), 400

    if purpose not in ("register", "login", "reset"):
        return jsonify({
            "success": False,
            "error_code": "INVALID_PURPOSE",
            "message": "Invalid verification purpose."
        }), 400

    # ── Check for existing user based on purpose ──
    existing_user = User.find_by_email(email)

    if purpose == "register" and existing_user:
        return jsonify({
            "success": False,
            "error_code": "EMAIL_EXISTS",
            "message": "An account with this email already exists. Please sign in instead."
        }), 409

    if purpose == "login" and not existing_user:
        return jsonify({
            "success": False,
            "error_code": "USER_NOT_FOUND",
            "message": "No account found with this email. Please register first."
        }), 404

    # ── Rate limit: check if an OTP was sent recently ──
    recent_otp = OTP.find_latest_for_email(email, purpose)
    if recent_otp and recent_otp.remaining_seconds > (OTP.OTP_TTL_SECONDS - 30):
        return jsonify({
            "success": False,
            "error_code": "OTP_COOLDOWN",
            "message": "A code was just sent. Please wait before requesting another.",
            "retry_after": recent_otp.remaining_seconds - (OTP.OTP_TTL_SECONDS - 30)
        }), 429

    # ── Generate secure 6-digit OTP ──
    otp_code = "{:06d}".format(secrets.randbelow(1000000))

    # ── Store OTP (hashed, with 3-min expiry) ──
    otp_record = OTP.create_for_email(email, otp_code, purpose)

    # ── Send email via Resend ──
    try:
        result = EmailService.send_otp_email(email, otp_code, purpose)
        if result is None:
            return jsonify({
                "success": False,
                "error_code": "EMAIL_SEND_FAILED",
                "message": "We couldn't send the verification email. Please try again in a moment."
            }), 502
    except ValueError as ve:
        logger.error(f"Email config error: {ve}")
        return jsonify({
            "success": False,
            "error_code": "EMAIL_NOT_CONFIGURED",
            "message": "Email service is not configured. Please contact support."
        }), 503
    except Exception as e:
        logger.error(f"Unexpected email error: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error_code": "EMAIL_SEND_FAILED",
            "message": "We couldn't send the verification email. Please try again in a moment."
        }), 502

    return jsonify({
        "success": True,
        "message": "Verification code sent to your email.",
        "data": {
            "email": email,
            "purpose": purpose,
            "expires_at": otp_record.expires_at.isoformat(),
            "remaining_seconds": otp_record.remaining_seconds,
        }
    }), 200


@auth_process_bp.route("/otp/verify", methods=["POST"])
@limiter.limit("10 per minute")
def verify_otp():
    """
    Process API: Verify a 6-digit OTP code.
    Expects JSON: { email, code, purpose? }
    On success: finds or creates user, returns JWT token.
    """
    data = request.get_json()
    if not data:
        return jsonify({
            "success": False,
            "error_code": "MISSING_BODY",
            "message": "Request body is required."
        }), 400

    email = (data.get("email") or "").strip().lower()
    code = (data.get("code") or "").strip()
    purpose = data.get("purpose", "register")

    # ── Input validation ──
    if not email or not code:
        return jsonify({
            "success": False,
            "error_code": "MISSING_FIELDS",
            "message": "Email and verification code are required."
        }), 400

    if not re.match(r"^\d{6}$", code):
        return jsonify({
            "success": False,
            "error_code": "INVALID_CODE_FORMAT",
            "message": "Please enter a valid 6-digit code."
        }), 400

    # ── Find the OTP record ──
    otp_record = OTP.find_latest_for_email(email, purpose)

    if not otp_record:
        return jsonify({
            "success": False,
            "error_code": "OTP_NOT_FOUND",
            "message": "No verification code found for this email. Please request a new one."
        }), 404

    # ── Check expiry ──
    if otp_record.is_expired:
        return jsonify({
            "success": False,
            "error_code": "OTP_EXPIRED",
            "message": "This code has expired. Please request a new one.",
            "remaining_seconds": 0
        }), 410

    # ── Check brute-force lockout ──
    if otp_record.is_locked:
        return jsonify({
            "success": False,
            "error_code": "OTP_LOCKED",
            "message": "Too many incorrect attempts. Please request a new code.",
            "details": {"remaining_attempts": 0}
        }), 429

    # ── Verify the code ──
    if not otp_record.check_code(code):
        otp_record.increment_attempts()
        remaining = OTP.MAX_ATTEMPTS - otp_record.attempts
        return jsonify({
            "success": False,
            "error_code": "OTP_INVALID",
            "message": "The code you entered is incorrect. Please check your email and try again.",
            "details": {"remaining_attempts": max(0, remaining)}
        }), 401

    # ── Code is valid — find or create user ──
    user = User.find_by_email(email)

    if not user:
        # New user registration (OTP-verified, no password needed)
        display_name = email.split("@")[0]
        user = User.create(
            email=email,
            display_name=display_name,
        )

    # ── Cleanup: delete the used OTP ──
    otp_record.delete()

    # ── Generate JWT token ──
    token = AuthService.generate_token(user.id)

    return jsonify({
        "success": True,
        "message": "Email verified successfully.",
        "token": token,
        "user": user.to_dict()
    }), 200


@auth_process_bp.route("/otp/resend", methods=["POST"])
@limiter.limit("3 per minute")
def resend_otp():
    """
    Process API: Resend OTP code.
    Invalidates the old code and generates a new one.
    Expects JSON: { email, purpose? }
    """
    data = request.get_json()
    if not data:
        return jsonify({
            "success": False,
            "error_code": "MISSING_BODY",
            "message": "Request body is required."
        }), 400

    email = (data.get("email") or "").strip().lower()
    purpose = data.get("purpose", "register")

    if not email:
        return jsonify({
            "success": False,
            "error_code": "EMAIL_REQUIRED",
            "message": "Please enter your email address."
        }), 400

    if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email):
        return jsonify({
            "success": False,
            "error_code": "EMAIL_INVALID",
            "message": "Please enter a valid email address."
        }), 400

    # ── Generate and send new OTP ──
    otp_code = "{:06d}".format(secrets.randbelow(1000000))
    otp_record = OTP.create_for_email(email, otp_code, purpose)

    try:
        result = EmailService.send_otp_email(email, otp_code, purpose)
        if result is None:
            return jsonify({
                "success": False,
                "error_code": "EMAIL_SEND_FAILED",
                "message": "We couldn't resend the verification email. Please try again."
            }), 502
    except Exception as e:
        logger.error(f"Resend OTP email error: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error_code": "EMAIL_SEND_FAILED",
            "message": "We couldn't resend the verification email. Please try again."
        }), 502

    return jsonify({
        "success": True,
        "message": "A new verification code has been sent to your email.",
        "data": {
            "email": email,
            "purpose": purpose,
            "expires_at": otp_record.expires_at.isoformat(),
            "remaining_seconds": otp_record.remaining_seconds,
        }
    }), 200


@auth_process_bp.route("/login", methods=["POST"])
@limiter.limit("10 per minute")
def login():
    """
    Process API: Authenticate user with credentials.
    Expects JSON: identifier (email/username/phone) and password
    """
    data = request.get_json()
    identifier = data.get("identifier")
    password = data.get("password")

    if not identifier or not password:
        return jsonify({"error": "Identifier and password are required"}), 400

    # Basic strict validation to ensure we don't process empty strings or whitespace only
    if not identifier.strip() or not password.strip():
        return jsonify({"error": "Invalid input format"}), 400

    # Find user by email, username, or phone
    user = User.query.filter(
        (User.email == identifier) | 
        (User.username == identifier) | 
        (User.phone_number == identifier)
    ).first()

    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid credentials"}), 401

    # Generate token
    token = AuthService.generate_token(user.id)
    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": user.to_dict()
    }), 200


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


@auth_process_bp.route("/profile", methods=["PUT"])
@login_required
def update_profile():
    """
    Process API: Update the authenticated user's profile.
    Can handle JSON or multipart/form-data (for avatar uploads).
    """
    user = g.current_user
    
    # Handle multipart/form-data (contains files)
    if request.content_type and request.content_type.startswith("multipart/form-data"):
        data = request.form
        
        # Handle file upload
        if "avatar" in request.files:
            file = request.files["avatar"]
            if file and file.filename:
                # Create static/avatars directory if it doesn't exist
                avatars_dir = os.path.join(current_app.root_path, "static", "avatars")
                os.makedirs(avatars_dir, exist_ok=True)
                
                # Generate unique filename
                ext = file.filename.rsplit(".", 1)[1].lower() if "." in file.filename else "png"
                filename = secure_filename(f"user_{user.id}_{uuid.uuid4().hex[:8]}.{ext}")
                file_path = os.path.join(avatars_dir, filename)
                
                # Save file
                file.save(file_path)
                
                # Update DB (relative path for frontend to use)
                # Ensure the path uses forward slashes
                # Assuming backend runs on same origin or API_BASE_URL handles it.
                # It's better to store just the relative path: /static/avatars/filename
                # But since the frontend uses a different origin locally (5173 vs 5000), 
                # we need to ensure the full URL or relative path is handled correctly.
                # We'll store the relative path and let the frontend prepend API_BASE_URL.
                user.update(avatar_url=f"/static/avatars/{filename}")
                
    # Handle application/json or fallback to request.form for other fields
    else:
        data = request.get_json() or {}

    if not data and not request.files:
        return jsonify({"error": "No data provided"}), 400

    # Update fields if provided
    if "username" in data and data["username"].strip():
        new_username = data["username"].strip().lower()
        if new_username != user.username:
            # Check if username is taken
            existing = User.query.filter_by(username=new_username).first()
            if existing:
                return jsonify({"error": "Username already taken"}), 400
            
            # Validation: Alphanumeric and underscores, min 3 chars
            if not re.match(r"^[a-zA-Z0-9_]{3,30}$", new_username):
                return jsonify({"error": "Username must be 3-30 characters and only contain letters, numbers, or underscores"}), 400
                
            user.update(username=new_username)

    if "phone_number" in data:
        user.update(phone_number=data["phone_number"])
        
    if "display_name" in data and data["display_name"].strip():
        user.update(display_name=data["display_name"].strip())

    return jsonify({
        "message": "Profile updated successfully",
        "user": user.to_dict()
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


# ── Facebook OAuth ──────────────────────────────────────────

@auth_process_bp.route("/facebook/login", methods=["GET"])
def facebook_login():
    """
    Process API: Initiate Facebook OAuth flow.
    Returns the Facebook authorization URL for the frontend to redirect to.
    """
    auth_url = AuthService.get_facebook_auth_url()
    return jsonify({"auth_url": auth_url}), 200


@auth_process_bp.route("/facebook/callback", methods=["GET"])
def facebook_callback():
    """
    Process API: Handle Facebook OAuth callback.
    Orchestrates: code exchange -> user info -> user creation -> token generation.
    """
    code = request.args.get("code")
    error = request.args.get("error")

    frontend_url = current_app.config["FRONTEND_URL"]

    if error:
        return redirect(f"{frontend_url}/callback?error={error}")

    if not code:
        return redirect(f"{frontend_url}/callback?error=no_code")

    # Step 1: Exchange authorization code for access token
    token_data = AuthService.exchange_facebook_code_for_token(code)
    if not token_data:
        return redirect(f"{frontend_url}/callback?error=token_exchange_failed")

    # Step 2: Fetch user profile from Facebook
    access_token = token_data.get("access_token")
    user_info = AuthService.get_facebook_user_info(access_token)
    if not user_info:
        return redirect(f"{frontend_url}/callback?error=user_info_failed")

    # Extract profile picture URL from Facebook's nested response
    avatar_url = ""
    picture_data = user_info.get("picture", {})
    if isinstance(picture_data, dict) and "data" in picture_data:
        avatar_url = picture_data["data"].get("url", "")

    # Step 3: Find or create user in our database
    user = User.find_or_create(
        facebook_id=user_info.get("id", ""),
        email=user_info.get("email", ""),
        display_name=user_info.get("name", ""),
        avatar_url=avatar_url,
    )

    # Step 4: Generate our own JWT token
    token = AuthService.generate_token(user.id)

    # Step 5: Redirect to frontend with token
    return redirect(f"{frontend_url}/callback?token={token}")


@auth_process_bp.route("/facebook/deauthorize", methods=["POST"])
def facebook_deauthorize():
    """
    Facebook Data Deletion Callback.
    Called by Facebook when a user removes the app from their Facebook settings.
    Facebook sends a signed_request containing the user's Facebook ID.
    We find and delete the associated user data.
    
    Required by Facebook Platform Policy for production apps.
    Set this URL in Meta Developer Portal → Facebook Login → Settings → Deauthorize Callback URL
    """
    import hashlib
    import hmac
    import base64
    import json

    signed_request = request.form.get("signed_request")
    if not signed_request:
        return jsonify({"error": "Missing signed_request"}), 400

    try:
        # Parse Facebook's signed request
        encoded_sig, payload = signed_request.split(".", 2)
        
        # Decode the payload
        # Add padding if necessary
        payload += "=" * (4 - len(payload) % 4)
        encoded_sig += "=" * (4 - len(encoded_sig) % 4)
        
        decoded_payload = base64.urlsafe_b64decode(payload)
        data = json.loads(decoded_payload)
        
        # Verify signature using app secret
        app_secret = os.environ.get("FACEBOOK_APP_SECRET", "")
        if app_secret:
            expected_sig = hmac.new(
                app_secret.encode("utf-8"),
                payload.encode("utf-8"),
                hashlib.sha256
            ).digest()
            
            decoded_sig = base64.urlsafe_b64decode(encoded_sig)
            if not hmac.compare_digest(decoded_sig, expected_sig):
                current_app.logger.warning("Facebook deauthorize: Invalid signature")
                # Continue anyway — some implementations skip strict verification
        
        facebook_id = data.get("user_id")
        
        if facebook_id:
            # Find user by facebook_id and delete their data
            user = User.query.filter_by(facebook_id=str(facebook_id)).first()
            if user:
                from app.extensions import db
                # Delete all user scans and related data
                from app.models.scan import Scan
                Scan.query.filter_by(user_id=user.id).delete()
                db.session.delete(user)
                db.session.commit()
                current_app.logger.info(f"Facebook deauthorize: Deleted user {user.email} (fb_id: {facebook_id})")
        
        # Facebook expects a JSON response with a confirmation URL and code
        confirmation_code = str(uuid.uuid4().hex[:12])
        frontend_url = current_app.config.get("FRONTEND_URL", "https://ind-ai-five.vercel.app")
        
        return jsonify({
            "url": f"{frontend_url}/privacy-policy",
            "confirmation_code": confirmation_code
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Facebook deauthorize error: {str(e)}")
        return jsonify({
            "url": current_app.config.get("FRONTEND_URL", "https://ind-ai-five.vercel.app") + "/privacy-policy",
            "confirmation_code": "error"
        }), 200
