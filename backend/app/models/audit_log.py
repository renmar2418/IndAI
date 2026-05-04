from app.extensions import db
from datetime import datetime

class AuditLog(db.Model):
    """
    Enterprise Audit Log: Tracks all actions performed by superadmins and admins.
    """
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    admin_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    action = db.Column(db.String(50), nullable=False, index=True) # e.g., 'update_role', 'delete_user'
    target_type = db.Column(db.String(50), nullable=True)         # e.g., 'user', 'system_setting'
    target_id = db.Column(db.String(50), nullable=True)           # e.g., user_id affected
    details = db.Column(db.Text, nullable=True)                   # JSON string or human-readable description
    ip_address = db.Column(db.String(45), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    # Relationships
    admin = db.relationship("User", foreign_keys=[admin_id])

    @classmethod
    def log_action(cls, admin_id, action, target_type=None, target_id=None, details=None, ip_address=None):
        log = cls(
            admin_id=admin_id,
            action=action,
            target_type=target_type,
            target_id=str(target_id) if target_id else None,
            details=details,
            ip_address=ip_address
        )
        db.session.add(log)
        db.session.commit()
        return log

    def to_dict(self):
        return {
            "id": self.id,
            "admin_id": self.admin_id,
            "admin_email": self.admin.email if self.admin else "Unknown",
            "action": self.action,
            "target_type": self.target_type,
            "target_id": self.target_id,
            "details": self.details,
            "ip_address": self.ip_address,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
