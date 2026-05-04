from app.extensions import db
from app.models.base_model import BaseModel
from datetime import datetime

class SystemAlert(BaseModel):
    """
    IndAI — SystemAlert Model
    Stores active system alerts for the superadmin portal (e.g. Rate limits, failures, threat intelligence).
    """
    __tablename__ = 'system_alerts'

    title = db.Column(db.String(100), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(50), nullable=False)  # 'security', 'system', 'info'
    unread = db.Column(db.Boolean, default=True)

    def to_dict(self):
        # Format time relatively (e.g., "10 minutes ago")
        diff = datetime.utcnow() - self.created_at
        if diff.days > 0:
            time_str = f"{diff.days}d ago"
        elif diff.seconds >= 3600:
            time_str = f"{diff.seconds // 3600}h ago"
        elif diff.seconds >= 60:
            time_str = f"{diff.seconds // 60}m ago"
        else:
            time_str = "Just now"

        return {
            "id": self.id,
            "title": self.title,
            "message": self.message,
            "type": self.type,
            "unread": self.unread,
            "time": time_str
        }

    @classmethod
    def create_alert(cls, title, message, type='system'):
        alert = cls(title=title, message=message, type=type)
        db.session.add(alert)
        db.session.commit()
        return alert
