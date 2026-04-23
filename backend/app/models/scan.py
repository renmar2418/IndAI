"""
IndAI — Scan Model
Demonstrates: Inheritance, Composition (contains Vulnerabilities), Encapsulation

Represents a code security scan performed by a user.
"""

from app.extensions import db
from app.models.base_model import BaseModel


class Scan(BaseModel):
    """
    Scan model representing a single code security audit.

    OOP Principles:
    - Inheritance: Inherits CRUD from BaseModel
    - Composition: Contains a collection of Vulnerability objects
    - Encapsulation: Status management is controlled through methods
    """

    __tablename__ = "scans"

    # Status constants (Encapsulation of valid states)
    STATUS_PENDING = "pending"
    STATUS_SCANNING = "scanning"
    STATUS_COMPLETED = "completed"
    STATUS_FAILED = "failed"

    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )
    original_code = db.Column(db.Text, nullable=False)
    corrected_code = db.Column(db.Text, nullable=True)
    language = db.Column(db.String(50), nullable=False, default="javascript")
    status = db.Column(db.String(20), nullable=False, default=STATUS_PENDING)
    vulnerability_count = db.Column(db.Integer, nullable=False, default=0)

    # Relationship — One Scan has Many Vulnerabilities (Composition)
    vulnerabilities = db.relationship(
        "Vulnerability", backref="scan", lazy="dynamic", cascade="all, delete-orphan"
    )

    def to_dict(self):
        """Polymorphism — Custom serialization including vulnerability summary."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "original_code": self.original_code,
            "corrected_code": self.corrected_code,
            "language": self.language,
            "status": self.status,
            "vulnerability_count": self.vulnerability_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def to_summary_dict(self):
        """Lightweight summary for dashboard listings."""
        return {
            "id": self.id,
            "language": self.language,
            "status": self.status,
            "vulnerability_count": self.vulnerability_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def to_detail_dict(self):
        """Full detail including vulnerabilities for scan detail page."""
        data = self.to_dict()
        data["vulnerabilities"] = [v.to_dict() for v in self.get_vulnerabilities()]
        return data

    def get_vulnerabilities(self):
        """Get all vulnerabilities found in this scan (Composition access)."""
        return self.vulnerabilities.all()

    def update_status(self, status):
        """
        Encapsulation — Controlled status transitions.
        Validates the new status before applying.
        """
        valid_statuses = [
            self.STATUS_PENDING,
            self.STATUS_SCANNING,
            self.STATUS_COMPLETED,
            self.STATUS_FAILED,
        ]
        if status not in valid_statuses:
            raise ValueError(f"Invalid status: {status}. Must be one of {valid_statuses}")
        self.update(status=status)

    def set_corrected_code(self, code):
        """Set the auto-corrected code after scanning."""
        self.update(corrected_code=code)

    def set_vulnerability_count(self, count):
        """Update the vulnerability count."""
        self.update(vulnerability_count=count)

    @classmethod
    def find_by_user(cls, user_id, limit=20):
        """Find all scans for a specific user, most recent first."""
        return (
            cls.query.filter_by(user_id=user_id)
            .order_by(cls.created_at.desc())
            .limit(limit)
            .all()
        )

    def __repr__(self):
        return f"<Scan id={self.id} status={self.status} vulns={self.vulnerability_count}>"
