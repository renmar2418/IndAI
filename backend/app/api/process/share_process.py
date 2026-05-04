"""
IndAI — Share Process API (Process Layer)
Business logic for snippet sharing.

Endpoints:
  POST   /create                      → Create a snippet (public, optional auth)
  GET    /retrieve/<short_id>         → Get snippet metadata only (no code, no read consumed)
  POST   /retrieve/<short_id>/reveal  → Reveal code (consumes a read, checks password/burn)
  DELETE /revoke/<revoke_token>       → Sender-initiated manual delete via private token
"""

import secrets
import string
from datetime import datetime, timedelta, timezone
from flask import Blueprint, jsonify, request, g
from werkzeug.security import generate_password_hash, check_password_hash

from app.models.shared_snippet import SharedSnippet
from app.middleware.auth_middleware import maybe_login

share_process_bp = Blueprint("process_share", __name__)


def generate_short_id(length=12):
    """Generate a unique, URL-safe short ID."""
    alphabet = string.ascii_letters + string.digits
    while True:
        short_id = "".join(secrets.choice(alphabet) for _ in range(length))
        if not SharedSnippet.find_by_short_id(short_id):
            return short_id


def generate_revoke_token(length=48):
    """Generate a cryptographically secure revoke token."""
    return secrets.token_urlsafe(length)


def parse_expiry(expiry_str):
    """Convert expiry string to datetime."""
    now = datetime.now(timezone.utc)
    if expiry_str == "1 Hour":
        return now + timedelta(hours=1)
    elif expiry_str == "8 Hours":
        return now + timedelta(hours=8)
    elif expiry_str == "24 Hours" or expiry_str == "1 Day":
        return now + timedelta(days=1)
    elif expiry_str == "7 Days":
        return now + timedelta(days=7)
    elif expiry_str == "10 Days":
        return now + timedelta(days=10)
    elif expiry_str == "15 Days":
        return now + timedelta(days=15)
    elif expiry_str == "30 Days":
        return now + timedelta(days=30)
    elif expiry_str == "60 Days":
        return now + timedelta(days=60)
    elif expiry_str == "90 Days":
        return now + timedelta(days=90)
    elif expiry_str == "180 Days":
        return now + timedelta(days=180)
    elif expiry_str == "365 Days":
        return now + timedelta(days=365)
    return None  # Forever


@share_process_bp.route("/create", methods=["POST"])
@maybe_login
def create_shareable_link():
    """
    Process API: Create a shareable snippet.
    Public endpoint — optional auth captures user_id if logged in.
    """
    data = request.get_json()
    if not data or "code" not in data or "title" not in data:
        return jsonify({"error": "Missing code or title"}), 400

    code = data["code"]
    title = data["title"]
    language = data.get("language", "text")
    expiry_str = data.get("expiry", "8 Hours")
    read_once = data.get("read_once", False)
    max_reads_str = data.get("burn_reads", "infinite")
    password = data.get("password")
    repro_context = data.get("repro_context")

    # Business Logic: Calculate Expiry
    expiry_at = parse_expiry(expiry_str)

    # Business Logic: Calculate Max Reads
    max_reads = 1 if read_once else None
    if not read_once and max_reads_str != "infinite":
        try:
            # Extract number from string like "3 reads"
            max_reads = int(max_reads_str.split()[0])
        except (ValueError, IndexError):
            max_reads = None

    # Business Logic: Password Hashing
    password_hash = generate_password_hash(password) if password else None

    # Business Logic: Generate IDs
    short_id = generate_short_id()
    revoke_token = generate_revoke_token()

    # Persist: Capture user_id if logged in (optional auth)
    user = getattr(g, 'current_user', None)
    user_id = user.id if user else None

    snippet = SharedSnippet.create(
        short_id=short_id,
        user_id=user_id,
        title=title,
        code=code,
        language=language,
        expiry_at=expiry_at,
        max_reads=max_reads,
        password_hash=password_hash,
        revoke_token=revoke_token,
        repro_context=repro_context,
    )

    return jsonify({
        "success": True,
        "data": {
            "short_id": snippet.short_id,
            "share_url": f"/s/{snippet.short_id}",
            "revoke_token": snippet.revoke_token,
            "expires_at": snippet.expiry_at.isoformat() if snippet.expiry_at else None,
            "created_at": snippet.created_at.isoformat() if snippet.created_at else None,
            "max_reads": snippet.max_reads,
            "is_protected": snippet.password_hash is not None,
        }
    }), 201


@share_process_bp.route("/retrieve/<string:short_id>", methods=["GET"])
def get_snippet_metadata(short_id):
    """
    Process API: Get snippet metadata only.
    Does NOT return code. Does NOT consume a read.
    Used for the receiver landing page (two-step reveal).
    """
    snippet = SharedSnippet.find_by_short_id(short_id)
    if not snippet:
        return jsonify({"error": "Snippet not found"}), 404

    # Check Expiry
    if snippet.is_expired():
        snippet.delete()
        return jsonify({"error": "Snippet has expired"}), 410

    # Check Burn Limits (already exhausted)
    if snippet.is_burned():
        snippet.delete()
        return jsonify({"error": "Snippet has reached its read limit"}), 410

    return jsonify({
        "success": True,
        "data": snippet.to_metadata_dict()
    }), 200


@share_process_bp.route("/retrieve/<string:short_id>/reveal", methods=["POST"])
def reveal_snippet(short_id):
    """
    Process API: Reveal snippet code — consumes a read.
    Validates password if protected. Checks burn limits.
    """
    snippet = SharedSnippet.find_by_short_id(short_id)
    if not snippet:
        return jsonify({"error": "Snippet not found"}), 404

    # 1. Check Expiry
    if snippet.is_expired():
        snippet.delete()
        return jsonify({"error": "Snippet has expired"}), 410

    # 2. Check Password
    data = request.get_json() or {}
    password = data.get("password")

    if snippet.password_hash:
        if not password:
            return jsonify({"error": "password_required"}), 401
        if not check_password_hash(snippet.password_hash, password):
            return jsonify({"error": "Invalid password"}), 401

    # 3. Check Burn Limits (before incrementing)
    if snippet.is_burned():
        snippet.delete()
        return jsonify({"error": "Snippet has reached its read limit"}), 410

    # 4. Increment read count
    snippet.increment_read_count()

    # 5. Return full data including code
    return jsonify({
        "success": True,
        "data": snippet.to_dict()
    }), 200


@share_process_bp.route("/revoke/<string:revoke_token>", methods=["DELETE"])
def revoke_snippet(revoke_token):
    """
    Process API: Sender-initiated snippet deletion via private revoke token.
    This allows the sender to manually delete a snippet without authentication.
    """
    snippet = SharedSnippet.find_by_revoke_token(revoke_token)
    if not snippet:
        return jsonify({"error": "Invalid revoke link or snippet already deleted"}), 404

    snippet.delete()
    return jsonify({
        "success": True,
        "message": "Snippet has been permanently deleted"
    }), 200
