"""
IndAI — Shared Snippet Model
Represents a shareable, potentially ephemeral code snippet.
"""

from datetime import datetime, timezone
from app.extensions import db
from app.models.base_model import BaseModel


class SharedSnippet(BaseModel):
    """
    SharedSnippet model for the Snippet Sharing feature.
    Includes support for expiry, read limits (burn after N reads), and password protection.
    """

    __tablename__ = "shared_snippets"

    short_id = db.Column(db.String(12), unique=True, nullable=False, index=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=True, index=True
    )
    title = db.Column(db.String(100), nullable=False)
    code = db.Column(db.Text, nullable=False)
    language = db.Column(db.String(50), nullable=False, default="text")
    
    # Expiry and Burn logic
    expiry_at = db.Column(db.DateTime, nullable=True) # None means never
    max_reads = db.Column(db.Integer, nullable=True) # None means infinite
    read_count = db.Column(db.Integer, nullable=False, default=0)
    
    # Security
    password_hash = db.Column(db.String(255), nullable=True)
    revoke_token = db.Column(db.String(64), unique=True, nullable=True)
    
    # Repro Context
    repro_context = db.Column(db.Text, nullable=True)

    def to_dict(self):
        """Full serialization — includes code (used after reveal)."""
        return {
            "id": self.id,
            "short_id": self.short_id,
            "user_id": self.user_id,
            "title": self.title,
            "code": self.code,
            "language": self.language,
            "expiry_at": self.expiry_at.isoformat() if self.expiry_at else None,
            "max_reads": self.max_reads,
            "read_count": self.read_count,
            "is_protected": self.password_hash is not None,
            "repro_context": self.repro_context,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def to_metadata_dict(self):
        """Metadata-only serialization — NO code, NO read consumed.
        Used for the receiver landing page (two-step reveal)."""
        code_bytes = len(self.code.encode('utf-8')) if self.code else 0
        return {
            "short_id": self.short_id,
            "title": self.title,
            "language": self.language,
            "is_protected": self.password_hash is not None,
            "max_reads": self.max_reads,
            "read_count": self.read_count,
            "size_bytes": code_bytes,
            "expiry_at": self.expiry_at.isoformat() if self.expiry_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    @classmethod
    def find_by_short_id(cls, short_id):
        """Find a snippet by its unique shareable short_id."""
        return cls.query.filter_by(short_id=short_id).first()

    @classmethod
    def find_by_revoke_token(cls, revoke_token):
        """Find a snippet by its private revoke token."""
        return cls.query.filter_by(revoke_token=revoke_token).first()

    def is_expired(self):
        """Check if the snippet has reached its expiry time."""
        if not self.expiry_at:
            return False
        # Ensure comparison is offset-aware
        now = datetime.now(timezone.utc)
        # SQLAlchemy might return naive datetime, so we ensure it's comparable
        expiry = self.expiry_at.replace(tzinfo=timezone.utc) if not self.expiry_at.tzinfo else self.expiry_at
        return now > expiry

    def is_burned(self):
        """Check if the snippet has reached its read limit."""
        if not self.max_reads:
            return False
        return self.read_count >= self.max_reads

    def increment_read_count(self):
        """Increment read count and persist."""
        self.update(read_count=self.read_count + 1)

    def __repr__(self):
        return f"<SharedSnippet short_id={self.short_id} title={self.title}>"
