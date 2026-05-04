"""
IndAI — Experience API (Experience Layer)
API-Led Architecture: Experience Layer — Frontend-facing gateway.

Aggregates Process API responses and formats them specifically
for the React frontend. This layer is the ONLY layer the frontend calls.
"""

import logging
from flask import Blueprint, jsonify, request, g
from app.middleware.auth_middleware import login_required
from app.models.scan import Scan
from app.models.vulnerability import Vulnerability
from app.engine.scanner import Scanner
from app.services.file_processor import FileProcessor
from app.services.summary_generator import SummaryGenerator
from app.services.llm_service import llm_service
from app.extensions import limiter

experience_bp = Blueprint("experience", __name__)

_scanner = Scanner()


@experience_bp.route("/scan", methods=["POST"])
@login_required
@limiter.limit("30 per minute")
def submit_scan():
    """
    Experience API: Submit code for scanning.
    Frontend-optimized: includes all data needed to render results immediately.
    """
    data = request.get_json()

    if not data or "code" not in data:
        return jsonify({"error": "Missing 'code' field"}), 400

    source_code = data["code"]
    language = data.get("language", "javascript")

    if not source_code.strip():
        return jsonify({"error": "Code cannot be empty"}), 400

    if len(source_code) > 50000000:
        return jsonify({"error": "Code exceeds maximum size (50MB)"}), 400

    # Create scan record
    scan = Scan.create(
        user_id=g.current_user.id,
        original_code=source_code,
        language=language,
        status=Scan.STATUS_SCANNING,
    )

    try:
        # Run the scanner
        results = _scanner.scan(source_code, language)

        # Store vulnerabilities
        if results["findings"]:
            Vulnerability.create_batch(scan.id, results["findings"])

        # Update scan record
        scan.update(
            corrected_code=results["corrected_code"],
            vulnerability_count=results["total_issues"],
            status=Scan.STATUS_COMPLETED,
        )

        # Generate AI summary (default: English)
        ai_summary = SummaryGenerator.generate(
            results["findings"], language_code=language, lang="en"
        )

        # Format response for frontend
        return jsonify({
            "success": True,
            "data": {
                "scan_id": scan.id,
                "status": "completed",
                "original_code": source_code,
                "corrected_code": results["corrected_code"],
                "language": language,
                "vulnerabilities": results["findings"],
                "summary": results["summary"],
                "total_issues": results["total_issues"],
                "ai_summary": ai_summary,
                "created_at": scan.created_at.isoformat(),
            }
        }), 200

    except ValueError as ve:
        # Input validation error — not valid code
        scan.update(status=Scan.STATUS_FAILED)
        return jsonify({
            "success": False,
            "error": "invalid_code",
            "message": str(ve),
            "scan_id": scan.id,
        }), 422

    except Exception as e:
        logging.error(f"Scan execution failed: {str(e)}", exc_info=True)
        scan.update(status=Scan.STATUS_FAILED)
        return jsonify({
            "success": False,
            "error": "The security scan encountered an internal error. Our team has been notified.",
            "scan_id": scan.id,
        }), 500


@experience_bp.route("/dashboard", methods=["GET"])
@login_required
def get_dashboard():
    """
    Experience API: Get aggregated dashboard data.
    Combines user stats, recent scans, and overall metrics.
    """
    user = g.current_user
    scans = Scan.find_by_user(user.id, limit=10)

    # Calculate aggregate stats
    all_scans = Scan.find_by_user(user.id, limit=1000)
    total_scans = len(all_scans)
    total_vulnerabilities = sum(s.vulnerability_count for s in all_scans)
    completed_scans = [s for s in all_scans if s.status == Scan.STATUS_COMPLETED]
    scans_with_fixes = [s for s in completed_scans if s.corrected_code]

    return jsonify({
        "success": True,
        "data": {
            "user": user.to_dict(),
            "stats": {
                "total_scans": total_scans,
                "total_vulnerabilities": total_vulnerabilities,
                "scans_with_fixes": len(scans_with_fixes),
                "average_vulnerabilities": (
                    round(total_vulnerabilities / total_scans, 1)
                    if total_scans > 0 else 0
                ),
            },
            "recent_scans": [scan.to_summary_dict() for scan in scans],
            "available_rules": len(_scanner.get_available_rules()),
        }
    }), 200


@experience_bp.route("/scan/<int:scan_id>", methods=["GET"])
@login_required
def get_scan_detail(scan_id):
    """
    Experience API: Get full scan detail for the scan detail page.
    Includes original code, corrected code, and all vulnerabilities.
    """
    scan = Scan.find_by_id(scan_id)

    if not scan:
        return jsonify({"success": False, "error": "Scan not found"}), 404

    if scan.user_id != g.current_user.id:
        return jsonify({"success": False, "error": "Access denied"}), 403

    vulnerabilities = Vulnerability.find_by_scan(scan_id)

    # Build severity summary
    severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
    for vuln in vulnerabilities:
        if vuln.severity in severity_counts:
            severity_counts[vuln.severity] += 1

    return jsonify({
        "success": True,
        "data": {
            "scan": scan.to_dict(),
            "vulnerabilities": [v.to_dict() for v in vulnerabilities],
            "summary": {
                "by_severity": severity_counts,
                "total": len(vulnerabilities),
            },
        }
    }), 200


@experience_bp.route("/scan/<int:scan_id>", methods=["DELETE"])
@login_required
def delete_scan(scan_id):
    """
    Experience API: Delete a scan and all its vulnerabilities.
    Only the scan owner can delete their scans.
    """
    scan = Scan.find_by_id(scan_id)

    if not scan:
        return jsonify({"success": False, "error": "Scan not found"}), 404

    if scan.user_id != g.current_user.id:
        return jsonify({"success": False, "error": "Access denied"}), 403

    scan.delete()  # cascade deletes vulnerabilities too

    return jsonify({
        "success": True,
        "message": f"Scan #{scan_id} deleted successfully",
    }), 200


@experience_bp.route("/scan/<int:scan_id>/suggestions", methods=["GET"])
@login_required
def get_owasp_suggestions(scan_id):
    """
    Experience API: Get OWASP-based remediation suggestions for a scan.
    Analyzes the scan's vulnerabilities and provides prioritized solutions.
    """
    scan = Scan.find_by_id(scan_id)

    if not scan:
        return jsonify({"success": False, "error": "Scan not found"}), 404

    if scan.user_id != g.current_user.id:
        return jsonify({"success": False, "error": "Access denied"}), 403

    vulnerabilities = Vulnerability.find_by_scan(scan_id)

    if not vulnerabilities:
        return jsonify({
            "success": True,
            "data": {
                "suggestions": [],
                "message": "No vulnerabilities found — code is clean!",
            }
        }), 200

    # OWASP remediation knowledge base
    owasp_guides = {
        "A01:2021 Broken Access Control": {
            "priority": 1,
            "solution": "Implement proper access control checks on every endpoint. Use role-based access control (RBAC) and deny by default.",
            "steps": [
                "Validate user permissions on every server-side request",
                "Use parameterized routes instead of user-controlled identifiers",
                "Implement CORS policies to restrict cross-origin access",
                "Disable directory listing and remove sensitive files from web root",
            ],
            "reference": "https://owasp.org/Top10/A01_2021-Broken_Access_Control/",
        },
        "A02:2021 Cryptographic Failures": {
            "priority": 2,
            "solution": "Use strong, modern encryption algorithms. Never use MD5 or SHA1 for security. Use bcrypt/argon2 for passwords.",
            "steps": [
                "Replace MD5/SHA1 with SHA-256 or bcrypt for hashing",
                "Use AES-256-GCM for encryption at rest",
                "Enforce TLS 1.2+ for data in transit",
                "Never store passwords in plain text",
            ],
            "reference": "https://owasp.org/Top10/A02_2021-Cryptographic_Failures/",
        },
        "A03:2021 Injection": {
            "priority": 1,
            "solution": "Use parameterized queries and input validation. Never concatenate user input into SQL, OS commands, or eval().",
            "steps": [
                "Use prepared statements / parameterized queries for SQL",
                "Sanitize and validate all user inputs",
                "Use ORM frameworks instead of raw queries",
                "Avoid eval(), exec(), and system() with user data",
            ],
            "reference": "https://owasp.org/Top10/A03_2021-Injection/",
        },
        "A04:2021 Insecure Design": {
            "priority": 2,
            "solution": "Apply secure design patterns from the start. Use threat modeling and security review during development.",
            "steps": [
                "Conduct threat modeling during design phase",
                "Implement defense-in-depth with multiple security layers",
                "Use established security patterns and frameworks",
                "Review architecture for trust boundary violations",
            ],
            "reference": "https://owasp.org/Top10/A04_2021-Insecure_Design/",
        },
        "A05:2021 Security Misconfiguration": {
            "priority": 2,
            "solution": "Harden all configurations. Remove defaults, disable debug mode, and keep software updated.",
            "steps": [
                "Remove default credentials and sample applications",
                "Disable debug/verbose error output in production",
                "Configure security headers (CSP, HSTS, X-Frame-Options)",
                "Regularly update and patch all dependencies",
            ],
            "reference": "https://owasp.org/Top10/A05_2021-Security_Misconfiguration/",
        },
        "A06:2021 Vulnerable Components": {
            "priority": 3,
            "solution": "Keep all dependencies updated. Use dependency scanners to identify known vulnerabilities.",
            "steps": [
                "Run npm audit / pip-audit regularly",
                "Subscribe to security advisories for your libraries",
                "Remove unused dependencies",
                "Use lock files to pin dependency versions",
            ],
            "reference": "https://owasp.org/Top10/A06_2021-Vulnerable_and_Outdated_Components/",
        },
        "A07:2021 Auth Failures": {
            "priority": 1,
            "solution": "Implement strong authentication. Use MFA, secure session management, and rate limiting.",
            "steps": [
                "Enforce strong password policies",
                "Implement multi-factor authentication (MFA)",
                "Use secure session tokens with proper expiry",
                "Add rate limiting to prevent brute force attacks",
            ],
            "reference": "https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/",
        },
        "A08:2021 Data Integrity": {
            "priority": 2,
            "solution": "Validate data integrity. Use signed serialization and verify data sources.",
            "steps": [
                "Avoid deserializing untrusted data",
                "Use signed tokens (JWT) for state transfer",
                "Implement integrity checks for critical data",
                "Use SRI (Subresource Integrity) for CDN resources",
            ],
            "reference": "https://owasp.org/Top10/A08_2021-Software_and_Data_Integrity_Failures/",
        },
        "A09:2021 Logging Failures": {
            "priority": 3,
            "solution": "Implement comprehensive security logging. Monitor for suspicious activity.",
            "steps": [
                "Log all authentication and authorization events",
                "Include timestamps, user IDs, and IP addresses",
                "Set up alerts for suspicious patterns",
                "Protect log files from tampering",
            ],
            "reference": "https://owasp.org/Top10/A09_2021-Security_Logging_and_Monitoring_Failures/",
        },
        "A10:2021 SSRF": {
            "priority": 2,
            "solution": "Validate and sanitize all URLs. Use allowlists for permitted domains and protocols.",
            "steps": [
                "Validate all user-supplied URLs against an allowlist",
                "Block requests to internal/private IP ranges",
                "Disable HTTP redirects in server-side requests",
                "Enforce HTTPS-only for outgoing connections",
            ],
            "reference": "https://owasp.org/Top10/A10_2021-Server-Side_Request_Forgery_(SSRF)/",
        },
    }

    # Build suggestions from actual vulnerabilities
    seen_categories = {}
    suggestions = []

    for vuln in vulnerabilities:
        category = vuln.owasp_category
        if category not in seen_categories:
            seen_categories[category] = {
                "count": 0,
                "severities": [],
                "titles": [],
            }
        seen_categories[category]["count"] += 1
        seen_categories[category]["severities"].append(vuln.severity)
        if len(seen_categories[category]["titles"]) < 3:
            seen_categories[category]["titles"].append(vuln.title)

    severity_priority = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}

    for category, info in seen_categories.items():
        guide = owasp_guides.get(category, {
            "priority": 3,
            "solution": f"Review and fix issues related to {category}.",
            "steps": [
                "Identify the root cause of the vulnerability",
                "Apply the suggested fix from the scan results",
                "Test the fix thoroughly",
                "Monitor for regressions",
            ],
            "reference": "https://owasp.org/Top10/",
        })

        worst_severity = min(info["severities"], key=lambda s: severity_priority.get(s, 5))

        suggestions.append({
            "owasp_category": category,
            "vulnerability_count": info["count"],
            "worst_severity": worst_severity,
            "affected_rules": info["titles"],
            "solution": guide["solution"],
            "steps": guide["steps"],
            "reference": guide["reference"],
            "priority": guide["priority"],
        })

    # Sort by priority (1=fix first), then by worst severity
    suggestions.sort(key=lambda s: (s["priority"], severity_priority.get(s["worst_severity"], 5)))

    return jsonify({
        "success": True,
        "data": {
            "scan_id": scan_id,
            "total_categories": len(suggestions),
            "suggestions": suggestions,
        }
    }), 200


@experience_bp.route("/scan/<int:scan_id>/summary", methods=["GET"])
@login_required
@limiter.limit("15 per minute")
def get_scan_summary(scan_id):
    """
    Experience API: Get AI-generated summary for a scan in any supported language.
    Query params: ?lang=en (default), tl, fr, zh, es, ja, ko
    """
    scan = Scan.find_by_id(scan_id)

    if not scan:
        return jsonify({"success": False, "error": "Scan not found"}), 404

    if scan.user_id != g.current_user.id:
        return jsonify({"success": False, "error": "Access denied"}), 403

    lang = request.args.get("lang", "en")
    vulnerabilities = Vulnerability.find_by_scan(scan_id)

    # Convert vuln objects to dicts for the generator
    findings = [v.to_dict() for v in vulnerabilities] if vulnerabilities else []

    summary = SummaryGenerator.generate(
        findings, language_code=scan.language, lang=lang
    )

    return jsonify({
        "success": True,
        "data": summary,
    }), 200


@experience_bp.route("/summary/languages", methods=["GET"])
def get_summary_languages():
    """Experience API: Get list of supported summary languages."""
    return jsonify({
        "success": True,
        "data": SummaryGenerator.get_supported_languages(),
    }), 200

@experience_bp.route("/rules", methods=["GET"])
def get_rules():
    """Experience API: Get all available scanning rules for the UI."""
    rules = _scanner.get_available_rules()
    return jsonify({
        "success": True,
        "data": rules,
        "count": len(rules),
    }), 200


@experience_bp.route("/upload", methods=["POST"])
@login_required
def upload_file():
    """
    Experience API: Upload a file for text extraction.
    Supports code files, text, PDF, DOCX, PPTX, XLSX, CSV, ODF.
    Returns extracted text content for the code editor.
    """
    if 'file' not in request.files:
        return jsonify({
            "success": False,
            "error": "No file uploaded",
        }), 400

    file = request.files['file']
    if not file.filename:
        return jsonify({
            "success": False,
            "error": "No file selected",
        }), 400

    try:
        result = FileProcessor.process(file)
        return jsonify({
            "success": True,
            "data": result,
        }), 200

    except ValueError as ve:
        return jsonify({
            "success": False,
            "error": str(ve),
        }), 422

    except Exception as e:
        logging.error(f"File upload processing failed: {str(e)}", exc_info=True)
        return jsonify({
            "success": False,
            "error": "Failed to process the uploaded file due to an internal error.",
        }), 500


@experience_bp.route("/agent/feedback", methods=["POST"])
@login_required
@limiter.limit("30 per minute")
def agent_feedback():
    """
    Experience API: Store user feedback (thumbs up/down) for an AI response.
    """
    try:
        data = request.json
        if not data or "message_id" not in data or "rating" not in data:
            return jsonify({"error": "Missing message_id or rating"}), 400

        rating = data["rating"]
        if rating not in ["upvote", "downvote"]:
            return jsonify({"error": "Invalid rating type"}), 400

        # Import locally to avoid circular dependencies if any
        from app.models.feedback import Feedback
        from app.extensions import db

        feedback = Feedback(
            user_id=g.current_user.id,
            message_id=data["message_id"],
            rating=rating
        )
        
        db.session.add(feedback)
        db.session.commit()

        return jsonify({"success": True, "message": "Feedback saved"}), 201

    except Exception as e:
        logging.error(f"Agent feedback storage failed: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to save feedback due to a system error."}), 500


@experience_bp.route("/agent/chat", methods=["POST"])
@login_required
@limiter.limit("15 per minute")
def agent_chat():
    """
    Experience API: Send chat history to the LLM agent and get a response.
    Expects JSON: { "history": [ {"role": "user"|"model", "text": "..."} ], "context": { "page": "..." } }
    """
    data = request.get_json()
    if not data or "history" not in data:
        return jsonify({"error": "Missing 'history' field"}), 400

    chat_history = data["history"]
    context = data.get("context", {})

    response_data = llm_service.generate_agent_response(chat_history, context)

    return jsonify({
        "success": True,
        "data": response_data
    }), 200


@experience_bp.route("/share", methods=["POST"])
def create_snippet():
    """Experience API: Create a shareable snippet (public, optional auth)."""
    from app.api.process.share_process import create_shareable_link
    return create_shareable_link()


@experience_bp.route("/share/<string:short_id>", methods=["GET"])
def get_snippet_metadata(short_id):
    """Experience API: Get snippet metadata only (no code, no read consumed)."""
    from app.api.process.share_process import get_snippet_metadata
    return get_snippet_metadata(short_id)


@experience_bp.route("/share/<string:short_id>/reveal", methods=["POST"])
@limiter.limit("10 per minute")
def reveal_snippet(short_id):
    """Experience API: Reveal snippet code (consumes a read). Rate-limited to prevent password brute-force."""
    from app.api.process.share_process import reveal_snippet
    return reveal_snippet(short_id)


@experience_bp.route("/share/revoke/<string:revoke_token>", methods=["DELETE"])
def revoke_snippet(revoke_token):
    """Experience API: Sender-initiated snippet deletion via private revoke token."""
    from app.api.process.share_process import revoke_snippet
    return revoke_snippet(revoke_token)

