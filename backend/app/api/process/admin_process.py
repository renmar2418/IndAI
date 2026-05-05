"""
IndAI — Admin Process API (Process Layer)
API-Led Architecture: Process Layer — Business logic for platform administration.

Handles:
- Dashboard statistics
- User management (promote, delete)
- Platform-wide scan monitoring
"""

from flask import Blueprint, jsonify, request
from app.models.user import User
from app.models.scan import Scan
from app.models.vulnerability import Vulnerability
from app.middleware.auth_middleware import login_required
from app.middleware.admin_middleware import admin_required
from app.extensions import db, limiter

admin_process_bp = Blueprint("process_admin", __name__)

@admin_process_bp.route("/dashboard", methods=["GET"])
@login_required
@admin_required
def get_dashboard_stats():
    """
    Get aggregate statistics for the admin dashboard.
    """
    from datetime import datetime, timedelta
    from sqlalchemy import func
    
    total_users = User.query.count()
    total_scans = Scan.query.count()
    total_vulns = Vulnerability.query.count()
    active_scans = Scan.query.filter_by(status='scanning').count()
    
    # Recent users (last 5)
    recent_users = User.query.order_by(User.created_at.desc()).limit(5).all()
    
    # Vulnerability Distribution
    vuln_dist = db.session.query(
        Vulnerability.severity, 
        func.count(Vulnerability.id)
    ).group_by(Vulnerability.severity).all()
    
    severity_map = { 'Critical': 0, 'High': 0, 'Medium': 0, 'Low': 0 }
    for severity, count in vuln_dist:
        if severity in severity_map:
            severity_map[severity] = count
            
    vuln_dist_data = [
        { "severity": 'Critical', "count": severity_map['Critical'], "fill": 'var(--admin-severity-danger)' },
        { "severity": 'High', "count": severity_map['High'], "fill": 'var(--admin-severity-warning)' },
        { "severity": 'Medium', "count": severity_map['Medium'], "fill": 'var(--admin-severity-info)' },
        { "severity": 'Low', "count": severity_map['Low'], "fill": '#6c757d' }
    ]
    
    # Scans over time (last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=6)
    recent_scans = db.session.query(
        func.date(Scan.created_at).label('date'),
        func.count(Scan.id)
    ).filter(Scan.created_at >= seven_days_ago)\
     .group_by(func.date(Scan.created_at)).all()
     
    scan_counts_by_date = {str(d): count for d, count in recent_scans}
    
    scan_trend_data = []
    for i in range(7):
        d = (datetime.utcnow() - timedelta(days=6-i)).date()
        scan_trend_data.append({
            "date": d.strftime("%a"),
            "scans": scan_counts_by_date.get(str(d), 0)
        })
    
    return jsonify({
        "stats": {
            "totalUsers": total_users,
            "totalScans": total_scans,
            "totalVulnerabilities": total_vulns,
            "activeScans": active_scans
        },
        "recentUsers": [u.to_dict() for u in recent_users],
        "charts": {
            "vulnDistData": vuln_dist_data,
            "scanTrendData": scan_trend_data
        }
    }), 200


@admin_process_bp.route("/users", methods=["GET"])
@login_required
@admin_required
def get_users():
    """
    Get a paginated list of all users, with optional search.
    """
    page = request.args.get('page', 1, type=int)
    search = request.args.get('search', '', type=str)
    per_page = 20
    
    query = User.query
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (User.email.ilike(search_term)) | 
            (User.username.ilike(search_term)) |
            (User.display_name.ilike(search_term))
        )
        
    pagination = query.order_by(User.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    
    users_data = []
    for u in pagination.items:
        u_dict = u.to_dict()
        u_dict['scan_count'] = u.get_scan_count()
        users_data.append(u_dict)
        
    return jsonify({
        "users": [user.to_dict() for user in pagination.items],
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": page
    }), 200

@admin_process_bp.route("/users/<int:user_id>/impersonate", methods=["POST"])
@login_required
@admin_required
@limiter.limit("5 per minute")
def impersonate_user(user_id):
    """
    Impersonation Mode: Generates a valid login token for another user.
    """
    from flask import g
    from app.services.auth_service import AuthService
    from app.models.audit_log import AuditLog
    
    target_user = User.find_by_id(user_id)
    if not target_user:
        return jsonify({"error": "User not found"}), 404
        
    if target_user.role == 'admin':
        return jsonify({"error": "Cannot impersonate another administrator"}), 403
        
    # Generate token for the target user
    token = AuthService.generate_token(target_user.id)
    
    # Audit Log
    AuditLog.log_action(
        admin_id=g.current_user.id,
        action="impersonate",
        target_type="user",
        target_id=target_user.id,
        details=f"Admin {g.current_user.email} assumed the identity of {target_user.email}",
        ip_address=request.remote_addr
    )
    
    return jsonify({
        "message": f"Now impersonating {target_user.email}",
        "token": token,
        "user": target_user.to_dict()
    }), 200


@admin_process_bp.route("/users/<int:user_id>/role", methods=["PUT"])
@login_required
@admin_required
def update_user_role(user_id):
    """
    Update a user's role (promote/demote).
    Only the superadmin can perform this action.
    """
    from flask import g
    from app.models.audit_log import AuditLog
    
    if not getattr(g, 'is_superadmin', False):
        return jsonify({"error": "Only the Superadmin can modify roles"}), 403

    data = request.get_json()
    new_role = data.get("role")
    
    if new_role not in ["user", "admin"]:
        return jsonify({"error": "Invalid role"}), 400
        
    user = User.find_by_id(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    user.update(role=new_role)
    
    # Audit Log
    AuditLog.log_action(
        admin_id=g.current_user.id,
        action="update_role",
        target_type="user",
        target_id=user.id,
        details=f"Changed role to {new_role}",
        ip_address=request.remote_addr
    )
    
    return jsonify({"message": f"User role updated to {new_role}", "user": user.to_dict()}), 200


@admin_process_bp.route("/users", methods=["POST"])
@login_required
@admin_required
def create_user():
    """
    Manually create a new user account.
    """
    from flask import g
    from app.models.audit_log import AuditLog
    
    data = request.get_json()
    email = data.get("email")
    display_name = data.get("display_name", "")
    role = data.get("role", "user")
    
    if not email:
        return jsonify({"error": "Email is required"}), 400
        
    if User.find_by_email(email):
        return jsonify({"error": "User with this email already exists"}), 400
        
    user = User(
        email=email,
        display_name=display_name or email.split("@")[0],
        role=role
    )
    user.save()
    
    # Audit Log
    AuditLog.log_action(
        admin_id=g.current_user.id,
        action="create_user",
        target_type="user",
        target_id=user.id,
        details=f"Created new {role} account: {email}",
        ip_address=request.remote_addr
    )
    
    return jsonify({"message": "User successfully created", "user": user.to_dict()}), 201


@admin_process_bp.route("/users/<int:user_id>", methods=["DELETE"])
@login_required
@admin_required
def delete_user(user_id):
    """
    Permanently delete a user and all their associated data (scans, vulns).
    """
    from flask import g
    from app.models.audit_log import AuditLog
    
    if user_id == g.current_user.id:
        return jsonify({"error": "You cannot delete your own admin account"}), 400
        
    user = User.find_by_id(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    from flask import current_app
    superadmin_email = current_app.config.get("SUPERADMIN_EMAIL")
    if superadmin_email and user.email == superadmin_email:
        return jsonify({"error": "The Superadmin account cannot be deleted"}), 403
        
    email_deleted = user.email
    # Cascade delete is handled by SQLAlchemy relationship configuration
    user.delete()
    
    # Audit Log
    AuditLog.log_action(
        admin_id=g.current_user.id,
        action="delete_user",
        target_type="user",
        target_id=user_id,
        details=f"Deleted user account: {email_deleted}",
        ip_address=request.remote_addr
    )
    
    return jsonify({"message": "User successfully deleted"}), 200


@admin_process_bp.route("/scans", methods=["GET"])
@login_required
@admin_required
def get_all_scans():
    """
    Get a paginated list of all scans across the platform.
    """
    page = request.args.get('page', 1, type=int)
    per_page = 20
    
    pagination = Scan.query.order_by(Scan.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    
    scans_data = []
    for s in pagination.items:
        s_dict = s.to_dict()
        user = User.find_by_id(s.user_id)
        s_dict['user'] = {"id": user.id, "email": user.email, "display_name": user.display_name} if user else None
        scans_data.append(s_dict)
        
    return jsonify({
        "scans": scans_data,
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": page
    }), 200


@admin_process_bp.route("/audit", methods=["GET"])
@login_required
@admin_required
def get_audit_logs():
    """
    Get a paginated list of all audit logs for compliance and security monitoring.
    """
    from app.models.audit_log import AuditLog
    
    page = request.args.get('page', 1, type=int)
    per_page = 30
    
    pagination = AuditLog.query.order_by(AuditLog.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    
    logs_data = []
    for log in pagination.items:
        log_dict = log.to_dict()
        # Fetch admin details
        admin = User.find_by_id(log.admin_id)
        log_dict['admin_email'] = admin.email if admin else "Unknown"
        logs_data.append(log_dict)
        
    return jsonify({
        "logs": logs_data,
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": page
    }), 200

@admin_process_bp.route("/config", methods=["GET"])
@login_required
@admin_required
def get_system_config():
    """
    Get all global system configurations.
    """
    from app.models.system_config import SystemConfig
    configs = SystemConfig.query.all()
    return jsonify({"configs": [c.to_dict() for c in configs]}), 200

@admin_process_bp.route("/config", methods=["PUT"])
@login_required
@admin_required
def update_system_config():
    """
    Update a specific system configuration.
    Expects JSON: { "key": "maintenance_mode", "value": "true" }
    """
    from flask import g
    from app.models.system_config import SystemConfig
    from app.models.audit_log import AuditLog
    
    data = request.get_json()
    key = data.get("key")
    value = data.get("value")
    
    if not key or value is None:
        return jsonify({"error": "Key and value are required"}), 400
        
    config = SystemConfig.set_value(key, value)
    
    # Audit Log
    AuditLog.log_action(
        admin_id=g.current_user.id,
        action="update_config",
        target_type="system",
        target_id=config.id,
        details=f"Updated setting {key} to {value}",
        ip_address=request.remote_addr
    )
    
    return jsonify({"message": f"Configuration {key} updated", "config": config.to_dict()}), 200

@admin_process_bp.route("/alerts", methods=["GET"])
@login_required
@admin_required
def get_system_alerts():
    """
    Get all active system alerts.
    """
    from app.models.system_alert import SystemAlert
    alerts = SystemAlert.query.order_by(SystemAlert.created_at.desc()).all()
    return jsonify({"alerts": [a.to_dict() for a in alerts]}), 200

@admin_process_bp.route("/alerts/read", methods=["PUT"])
@login_required
@admin_required
def mark_alerts_read():
    """
    Mark all active system alerts as read.
    """
    from app.models.system_alert import SystemAlert
    from app.extensions import db
    SystemAlert.query.filter_by(unread=True).update({"unread": False})
    db.session.commit()
    return jsonify({"message": "Alerts marked as read"}), 200

@admin_process_bp.route("/alerts", methods=["DELETE"])
@login_required
@admin_required
def clear_system_alerts():
    """
    Delete all system alerts.
    """
    from app.models.system_alert import SystemAlert
    from app.extensions import db
    SystemAlert.query.delete()
    db.session.commit()
    return jsonify({"message": "All alerts cleared"}), 200

@admin_process_bp.route("/health", methods=["GET"])
@login_required
@admin_required
def get_system_health():
    """
    Get live infrastructure health metrics.
    """
    import psutil
    from app.extensions import db
    from sqlalchemy.exc import OperationalError
    
    cpu_usage = psutil.cpu_percent(interval=0.5)
    memory = psutil.virtual_memory()
    
    db_status = "Healthy"
    try:
        # Ping DB
        from sqlalchemy import text
        db.session.execute(text("SELECT 1"))
    except OperationalError:
        db_status = "Unreachable"
        
    return jsonify({
        "cpu_usage": cpu_usage,
        "memory_usage": memory.percent,
        "db_status": db_status
    }), 200

@admin_process_bp.route("/blacklist", methods=["POST"])
@login_required
@admin_required
@limiter.limit("10 per minute")
def blacklist_ip():
    """
    Permanently block an IP address.
    Expects JSON: { "ip_address": "192.168.1.x", "reason": "..." }
    """
    from flask import g
    from app.models.blacklisted_ip import BlacklistedIP
    from app.models.audit_log import AuditLog
    
    data = request.get_json()
    ip = data.get("ip_address")
    reason = data.get("reason", "Malicious activity detected")
    
    if not ip:
        return jsonify({"error": "IP Address is required"}), 400
        
    BlacklistedIP.blacklist(ip=ip, reason=reason, admin_id=g.current_user.id)
    
    # Audit Log
    AuditLog.log_action(
        admin_id=g.current_user.id,
        action="blacklist_ip",
        target_type="ip",
        target_id=None,
        details=f"Blacklisted IP {ip} for: {reason}",
        ip_address=request.remote_addr
    )
    
    return jsonify({"message": f"IP {ip} has been permanently blacklisted"}), 200

@admin_process_bp.route("/report/csv", methods=["GET"])
@login_required
@admin_required
def export_compliance_report():
    """
    Generate a CSV compliance report of all vulnerabilities.
    """
    import io
    import csv
    from flask import Response
    from app.models.vulnerability import Vulnerability
    from app.models.scan import Scan
    from app.models.user import User
    
    vulns = db.session.query(
        Vulnerability.id,
        Vulnerability.title,
        Vulnerability.severity,
        Scan.id.label("scan_id"),
        Scan.language,
        User.email.label("user_email"),
        Vulnerability.created_at
    ).join(Scan, Vulnerability.scan_id == Scan.id)\
     .join(User, Scan.user_id == User.id).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(['Vuln ID', 'Title', 'Severity', 'Scan ID', 'Language', 'User', 'Date Detected'])
    
    for v in vulns:
        writer.writerow([
            v.id,
            v.title,
            v.severity,
            v.scan_id,
            v.language,
            v.user_email,
            v.created_at.strftime("%Y-%m-%d %H:%M:%S")
        ])
        
    # Audit Log
    from app.models.audit_log import AuditLog
    from flask import g
    AuditLog.log_action(
        admin_id=g.current_user.id,
        action="export_report",
        target_type="system",
        target_id=None,
        details="Exported full compliance CSV report",
        ip_address=request.remote_addr
    )
    
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-disposition": "attachment; filename=indai_compliance_report.csv"}
    )
