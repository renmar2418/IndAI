"""
IndAI — Report Process API (Process Layer)
API-Led Architecture: Process Layer — Business logic for scan reports.

Retrieves and formats scan history and detailed reports.
"""

from flask import Blueprint, jsonify, g
from app.middleware.auth_middleware import login_required
from app.models.scan import Scan
from app.models.vulnerability import Vulnerability

report_process_bp = Blueprint("process_report", __name__)


@report_process_bp.route("/history", methods=["GET"])
@login_required
def get_scan_history():
    """
    Process API: Get the authenticated user's scan history.
    Returns summary data for the dashboard listing.
    """
    scans = Scan.find_by_user(g.current_user.id, limit=50)

    return jsonify({
        "data": [scan.to_summary_dict() for scan in scans],
        "count": len(scans),
    }), 200


@report_process_bp.route("/<int:scan_id>", methods=["GET"])
@login_required
def get_scan_report(scan_id):
    """
    Process API: Get a detailed report for a specific scan.
    Includes all vulnerabilities with fix suggestions.
    """
    scan = Scan.find_by_id(scan_id)

    if not scan:
        return jsonify({"error": "Scan not found"}), 404

    # Ensure user can only access their own scans
    if scan.user_id != g.current_user.id:
        return jsonify({"error": "Access denied"}), 403

    vulnerabilities = Vulnerability.find_by_scan(scan_id)

    # Build severity summary
    severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
    owasp_counts = {}

    for vuln in vulnerabilities:
        if vuln.severity in severity_counts:
            severity_counts[vuln.severity] += 1
        category = vuln.owasp_category or "Unknown"
        owasp_counts[category] = owasp_counts.get(category, 0) + 1

    return jsonify({
        "data": {
            "scan": scan.to_dict(),
            "vulnerabilities": [v.to_dict() for v in vulnerabilities],
            "summary": {
                "by_severity": severity_counts,
                "by_owasp": owasp_counts,
                "total": len(vulnerabilities),
            },
        }
    }), 200
