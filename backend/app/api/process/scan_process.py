"""
IndAI — Scan Process API (Process Layer)
API-Led Architecture: Process Layer — Business logic for code scanning.

Orchestrates the complete scanning pipeline:
1. Receive code from Experience API
2. Create scan record (via System API/Model)
3. Run Security Scanner engine
4. Store findings (via System API/Model)
5. Generate corrected code
6. Return results
"""

from flask import Blueprint, jsonify, request, g
from app.middleware.auth_middleware import login_required
from app.extensions import limiter
from app.models.scan import Scan
from app.models.vulnerability import Vulnerability
from app.engine.scanner import Scanner

scan_process_bp = Blueprint("process_scan", __name__)

# Singleton scanner instance
_scanner = Scanner()


@scan_process_bp.route("/analyze", methods=["POST"])
@login_required
def analyze_code():
    """
    Process API: Submit code for security analysis.

    Orchestrates the full scanning pipeline:
    1. Validate input
    2. Create scan record
    3. Run scanner engine
    4. Store vulnerabilities
    5. Return formatted results
    """
    data = request.get_json()

    if not data or "code" not in data:
        return jsonify({"error": "Missing 'code' field in request body"}), 400

    source_code = data["code"]
    language = data.get("language", "javascript")

    if not source_code.strip():
        return jsonify({"error": "Code cannot be empty"}), 400

    if len(source_code) > 100000:  # 100KB limit
        return jsonify({"error": "Code exceeds maximum size (100KB)"}), 400

    # Step 1: Create scan record with PENDING status
    scan = Scan.create(
        user_id=g.current_user.id,
        original_code=source_code,
        language=language,
        status=Scan.STATUS_PENDING,
    )

    try:
        # Step 2: Update status to SCANNING
        scan.update_status(Scan.STATUS_SCANNING)

        # Step 3: Run the security scanner
        results = _scanner.scan(source_code, language)

        # Step 4: Store vulnerabilities in database
        if results["findings"]:
            Vulnerability.create_batch(scan.id, results["findings"])

        # Step 5: Update scan with results
        scan.update(
            corrected_code=results["corrected_code"],
            vulnerability_count=results["total_issues"],
            status=Scan.STATUS_COMPLETED,
        )

        # Step 6: Return formatted results
        return jsonify({
            "data": {
                "scan_id": scan.id,
                "status": scan.status,
                "original_code": source_code,
                "corrected_code": results["corrected_code"],
                "language": language,
                "findings": results["findings"],
                "summary": results["summary"],
                "total_issues": results["total_issues"],
                "created_at": scan.created_at.isoformat(),
            }
        }), 200

    except ValueError as ve:
        # Input validation error (not valid code)
        scan.update_status(Scan.STATUS_FAILED)
        return jsonify({
            "error": "invalid_code",
            "message": str(ve),
            "scan_id": scan.id,
        }), 422

    except Exception as e:
        scan.update_status(Scan.STATUS_FAILED)
        return jsonify({
            "error": "Scan failed",
            "message": str(e),
            "scan_id": scan.id,
        }), 500


@scan_process_bp.route("/demo-scan", methods=["POST"])
@limiter.limit("5 per day")
def demo_scan():
    """
    Process API: Unauthenticated Demo Scan.
    Rate limited to 5 per day per IP.
    Does NOT save to database to prevent bloat.
    """
    data = request.get_json()

    if not data or "code" not in data:
        return jsonify({"error": "Missing 'code' field in request body"}), 400

    source_code = data["code"]
    language = data.get("language", "javascript")

    if not source_code.strip():
        return jsonify({"error": "Code cannot be empty"}), 400

    if len(source_code) > 10000:  # Stricter 10KB limit for demo
        return jsonify({"error": "Code exceeds maximum demo size (10KB)"}), 400

    try:
        # Run the security scanner directly without DB overhead
        results = _scanner.scan(source_code, language)

        # Return formatted results directly
        return jsonify({
            "data": {
                "scan_id": "demo-scan",
                "status": "completed",
                "original_code": source_code,
                "corrected_code": results["corrected_code"],
                "language": language,
                "findings": results["findings"],
                "summary": results["summary"],
                "total_issues": results["total_issues"],
            }
        }), 200

    except ValueError as ve:
        # Input validation error (not valid code)
        return jsonify({
            "error": "invalid_code",
            "message": str(ve),
        }), 422

    except Exception as e:
        return jsonify({
            "error": "Scan failed",
            "message": str(e),
        }), 500


@scan_process_bp.route("/rules", methods=["GET"])
def get_available_rules():
    """Process API: List all available security scanning rules."""
    rules = _scanner.get_available_rules()
    return jsonify({
        "data": rules,
        "count": len(rules),
    }), 200
