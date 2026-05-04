"""
IndAI — Share System API (System Layer)
Direct data access for shared snippets.
"""

from flask import Blueprint, jsonify, request
from app.models.shared_snippet import SharedSnippet

share_system_bp = Blueprint("system_share", __name__)


@share_system_bp.route("/", methods=["POST"])
def create_snippet():
    """System API: Create a new shared snippet record."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    snippet = SharedSnippet.create(
        short_id=data["short_id"],
        user_id=data.get("user_id"),
        title=data["title"],
        code=data["code"],
        language=data.get("language", "text"),
        expiry_at=data.get("expiry_at"),
        max_reads=data.get("max_reads"),
        password_hash=data.get("password_hash"),
        repro_context=data.get("repro_context"),
    )

    return jsonify({"data": snippet.to_dict()}), 201


@share_system_bp.route("/<string:short_id>", methods=["GET"])
def get_snippet(short_id):
    """System API: Get a snippet by its short ID."""
    snippet = SharedSnippet.find_by_short_id(short_id)
    if not snippet:
        return jsonify({"error": "Snippet not found"}), 404
    return jsonify({"data": snippet.to_dict()}), 200


@share_system_bp.route("/<string:short_id>", methods=["PUT"])
def update_snippet(short_id):
    """System API: Update a snippet (e.g., increment read count)."""
    snippet = SharedSnippet.find_by_short_id(short_id)
    if not snippet:
        return jsonify({"error": "Snippet not found"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    # Only allow updating read_count or expiry
    if "read_count" in data:
        snippet.read_count = data["read_count"]
    
    snippet.save()
    return jsonify({"data": snippet.to_dict()}), 200


@share_system_bp.route("/<string:short_id>", methods=["DELETE"])
def delete_snippet(short_id):
    """System API: Delete a snippet."""
    snippet = SharedSnippet.find_by_short_id(short_id)
    if not snippet:
        return jsonify({"error": "Snippet not found"}), 404
    
    snippet.delete()
    return jsonify({"message": "Snippet deleted"}), 200
