"""
IndAI — Scan System API (System Layer)
API-Led Architecture: System Layer — Direct data access for scans/vulnerabilities.

Provides low-level CRUD operations on scans and vulnerabilities tables.
Only called by Process APIs, never directly by the frontend.
"""

from flask import Blueprint, jsonify, request
from app.models.scan import Scan
from app.models.vulnerability import Vulnerability

scan_system_bp = Blueprint("system_scans", __name__)


@scan_system_bp.route("/", methods=["GET"])
def list_scans():
    """System API: List scans, optionally filtered by user_id."""
    user_id = request.args.get("user_id", type=int)
    limit = request.args.get("limit", 20, type=int)

    if user_id:
        scans = Scan.find_by_user(user_id, limit=limit)
    else:
        scans = Scan.find_all()

    return jsonify({
        "data": [scan.to_summary_dict() for scan in scans],
        "count": len(scans),
    }), 200


@scan_system_bp.route("/<int:scan_id>", methods=["GET"])
def get_scan(scan_id):
    """System API: Get a scan by ID."""
    scan = Scan.find_by_id(scan_id)
    if not scan:
        return jsonify({"error": "Scan not found"}), 404
    return jsonify({"data": scan.to_dict()}), 200


@scan_system_bp.route("/", methods=["POST"])
def create_scan():
    """System API: Create a new scan record."""
    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body is required"}), 400

    if "user_id" not in data or "original_code" not in data:
        return jsonify({"error": "Missing user_id or original_code"}), 400

    scan = Scan.create(
        user_id=data["user_id"],
        original_code=data["original_code"],
        language=data.get("language", "javascript"),
        status=Scan.STATUS_PENDING,
    )

    return jsonify({"data": scan.to_dict()}), 201


@scan_system_bp.route("/<int:scan_id>", methods=["PUT"])
def update_scan(scan_id):
    """System API: Update a scan record."""
    scan = Scan.find_by_id(scan_id)
    if not scan:
        return jsonify({"error": "Scan not found"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    # Update allowed fields
    allowed_fields = ["status", "corrected_code", "vulnerability_count"]
    for field in allowed_fields:
        if field in data:
            setattr(scan, field, data[field])

    scan.save()
    return jsonify({"data": scan.to_dict()}), 200


@scan_system_bp.route("/<int:scan_id>/vulnerabilities", methods=["GET"])
def get_scan_vulnerabilities(scan_id):
    """System API: Get all vulnerabilities for a scan."""
    scan = Scan.find_by_id(scan_id)
    if not scan:
        return jsonify({"error": "Scan not found"}), 404

    vulnerabilities = Vulnerability.find_by_scan(scan_id)
    return jsonify({
        "data": [v.to_dict() for v in vulnerabilities],
        "count": len(vulnerabilities),
    }), 200


@scan_system_bp.route("/<int:scan_id>/vulnerabilities", methods=["POST"])
def create_vulnerabilities(scan_id):
    """System API: Batch-create vulnerabilities for a scan."""
    scan = Scan.find_by_id(scan_id)
    if not scan:
        return jsonify({"error": "Scan not found"}), 404

    data = request.get_json()
    if not data or "findings" not in data:
        return jsonify({"error": "Missing findings array"}), 400

    vulnerabilities = Vulnerability.create_batch(scan_id, data["findings"])
    return jsonify({
        "data": [v.to_dict() for v in vulnerabilities],
        "count": len(vulnerabilities),
    }), 201
