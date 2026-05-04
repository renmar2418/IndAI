"""
IndAI — GitHub Connection Model

Stores OAuth tokens and metadata for users connected to GitHub.
"""

from app.extensions import db
from app.models.base_model import BaseModel


class GitHubConnection(BaseModel):
    __tablename__ = "github_connections"

    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    github_username = db.Column(db.String(255), nullable=False)
    access_token = db.Column(db.Text, nullable=False)

    user = db.relationship(
        "User", 
        backref=db.backref("github_connection", uselist=False, cascade="all, delete-orphan")
    )

    def to_dict(self):
        """Serialize without sensitive token."""
        return {
            "id": self.id,
            "github_username": self.github_username,
            "connected_at": self.created_at.isoformat() if self.created_at else None,
        }

    @classmethod
    def upsert(cls, user_id, github_username, access_token):
        """Update existing or create new connection."""
        conn = cls.query.filter_by(user_id=user_id).first()
        if conn:
            conn.update(github_username=github_username, access_token=access_token)
            return conn
        return cls.create(user_id=user_id, github_username=github_username, access_token=access_token)
