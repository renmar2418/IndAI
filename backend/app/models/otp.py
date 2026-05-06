"""
IndAI — OTP Model
Stores one-time passwords for email-based authentication.

Each OTP record holds a hashed 6-digit code, the target email,
a purpose flag (register / login / reset), and an expiry timestamp.
"""

from datetime import datetime, timezone, timedelta
from werkzeug.security import generate_password_hash, check_password_hash

from app.extensions import db
from app.models.base_model import BaseModel


class OTP(BaseModel):
    """
    One-Time Password model for email verification.

    OOP Principles:
    - Inheritance: Inherits CRUD from BaseModel
    - Encapsulation: Hashing logic is internal
    """

    __tablename__ = "otps"

    # The email this OTP was sent to
    email = db.Column(db.String(255), nullable=False, index=True)

    # Hashed 6-digit code (never stored in plain text)
    code_hash = db.Column(db.String(255), nullable=False)

    # Purpose: "register", "login", or "reset"
    purpose = db.Column(db.String(20), nullable=False, default="register")

    # Expiry timestamp (3 minutes from creation)
    expires_at = db.Column(db.DateTime, nullable=False)

    # Track attempts to prevent brute-force
    attempts = db.Column(db.Integer, nullable=False, default=0)

    # Maximum allowed verification attempts
    MAX_ATTEMPTS = 5

    # OTP validity duration in seconds (3 minutes)
    OTP_TTL_SECONDS = 180

    def set_code(self, plain_code):
        """Hash and store the OTP code securely."""
        self.code_hash = generate_password_hash(
            plain_code, method="pbkdf2:sha256:260000"
        )

    def check_code(self, plain_code):
        """Verify a given code against the stored hash."""
        if not self.code_hash:
            return False
        return check_password_hash(self.code_hash, plain_code)

    @property
    def is_expired(self):
        """Check if this OTP has expired."""
        return datetime.now(timezone.utc) > self.expires_at.replace(tzinfo=timezone.utc)

    @property
    def is_locked(self):
        """Check if this OTP has exceeded maximum attempts."""
        return self.attempts >= self.MAX_ATTEMPTS

    @property
    def remaining_seconds(self):
        """Get the number of seconds remaining before expiry."""
        now = datetime.now(timezone.utc)
        expires = self.expires_at.replace(tzinfo=timezone.utc)
        delta = (expires - now).total_seconds()
        return max(0, int(delta))

    def increment_attempts(self):
        """Increment the attempt counter and persist."""
        self.attempts += 1
        db.session.commit()

    @classmethod
    def create_for_email(cls, email, plain_code, purpose="register"):
        """
        Create a new OTP for the given email.
        Invalidates any previous OTPs for this email+purpose.
        """
        # Delete any existing OTPs for this email+purpose
        cls.query.filter_by(email=email.lower(), purpose=purpose).delete()
        db.session.commit()

        otp = cls(
            email=email.lower(),
            purpose=purpose,
            expires_at=datetime.now(timezone.utc) + timedelta(seconds=cls.OTP_TTL_SECONDS),
            attempts=0,
        )
        otp.set_code(plain_code)
        db.session.add(otp)
        db.session.commit()
        return otp

    @classmethod
    def find_latest_for_email(cls, email, purpose="register"):
        """Find the most recent active OTP for a given email and purpose."""
        return (
            cls.query
            .filter_by(email=email.lower(), purpose=purpose)
            .order_by(cls.created_at.desc())
            .first()
        )

    @classmethod
    def cleanup_expired(cls):
        """Remove all expired OTP records (housekeeping)."""
        cls.query.filter(cls.expires_at < datetime.now(timezone.utc)).delete()
        db.session.commit()

    def to_dict(self):
        """Serialize — never expose the code hash."""
        return {
            "id": self.id,
            "email": self.email,
            "purpose": self.purpose,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "remaining_seconds": self.remaining_seconds,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<OTP id={self.id} email={self.email} purpose={self.purpose}>"
