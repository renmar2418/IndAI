from app.extensions import db
from app.models.base_model import BaseModel

class BlacklistedIP(BaseModel):
    """
    IndAI — BlacklistedIP Model
    Stores IP addresses that are blocked from accessing the platform.
    """
    __tablename__ = 'blacklisted_ips'

    ip_address = db.Column(db.String(45), unique=True, nullable=False, index=True)
    reason = db.Column(db.Text, nullable=True)
    admin_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # Admin who blacklisted it

    def to_dict(self):
        return {
            "id": self.id,
            "ip_address": self.ip_address,
            "reason": self.reason,
            "admin_id": self.admin_id,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

    @classmethod
    def is_blacklisted(cls, ip):
        return cls.query.filter_by(ip_address=ip).first() is not None

    @classmethod
    def blacklist(cls, ip, reason=None, admin_id=None):
        existing = cls.query.filter_by(ip_address=ip).first()
        if existing:
            return existing
        entry = cls(ip_address=ip, reason=reason, admin_id=admin_id)
        db.session.add(entry)
        db.session.commit()
        return entry
        
    @classmethod
    def remove(cls, ip):
        entry = cls.query.filter_by(ip_address=ip).first()
        if entry:
            db.session.delete(entry)
            db.session.commit()
            return True
        return False
