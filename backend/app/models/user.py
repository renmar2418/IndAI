"""
IndAI — User Model
Demonstrates: Inheritance (extends BaseModel), Polymorphism (overrides to_dict)

Represents a student user who authenticates via Google OAuth.
"""

from werkzeug.security import generate_password_hash, check_password_hash

from app.extensions import db
from app.models.base_model import BaseModel


class User(BaseModel):
    """
    User model for students authenticated via Google OAuth.

    OOP Principles:
    - Inheritance: Inherits CRUD from BaseModel
    - Polymorphism: Overrides to_dict() to exclude sensitive fields
    - Encapsulation: Google ID handling is internal
    """

    __tablename__ = "users"

    # Social Login (Google)
    google_id = db.Column(db.String(255), unique=True, nullable=True, index=True)
    
    # Social Login (Facebook)
    facebook_id = db.Column(db.String(255), unique=True, nullable=True, index=True)
    
    # RBAC (Role-Based Access Control)
    role = db.Column(db.String(20), default='user', nullable=False)
    
    # Traditional Login
    username = db.Column(db.String(255), unique=True, nullable=True, index=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=True)
    phone_number = db.Column(db.String(50), nullable=True)
    
    # Profile Info
    display_name = db.Column(db.String(255), nullable=False)
    avatar_url = db.Column(db.String(512), nullable=True)

    # Relationship — One User has Many Scans (Composition)
    scans = db.relationship(
        "Scan", backref="user", lazy="dynamic", cascade="all, delete-orphan"
    )

    def set_password(self, password):
        """Securely hash the password and store it."""
        # Using a strong hashing method: pbkdf2:sha256:600000
        self.password_hash = generate_password_hash(password, method="pbkdf2:sha256:600000")

    def check_password(self, password):
        """Verify a given password against the stored hash."""
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        """
        Polymorphism — Override base serialization.
        Excludes google_id and password_hash for security when sending to frontend.
        """
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "display_name": self.display_name,
            "avatar_url": self.avatar_url,
            "phone_number": self.phone_number,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    @property
    def is_admin(self):
        """Check if the user has admin privileges."""
        return self.role == 'admin'

    @classmethod
    def find_by_google_id(cls, google_id):
        """Find a user by their Google account ID."""
        return cls.query.filter_by(google_id=google_id).first()

    @classmethod
    def find_by_email(cls, email):
        """Find a user by email address."""
        return cls.query.filter_by(email=email).first()

    @classmethod
    def find_by_facebook_id(cls, facebook_id):
        """Find a user by their Facebook account ID."""
        return cls.query.filter_by(facebook_id=facebook_id).first()

    @classmethod
    def find_or_create(cls, email, display_name, avatar_url=None, google_id=None, facebook_id=None):
        """
        Find an existing user by Social ID or Email, or create a new one.
        Supports Google and Facebook OAuth. If found by email but no social ID
        is linked, it syncs the social ID.
        """
        # Try to find by Google ID
        if google_id:
            user = cls.find_by_google_id(google_id)
            if user:
                user.update(
                    email=email, display_name=display_name, avatar_url=avatar_url
                )
                return user

        # Try to find by Facebook ID
        if facebook_id:
            user = cls.find_by_facebook_id(facebook_id)
            if user:
                user.update(
                    email=email, display_name=display_name,
                    avatar_url=avatar_url if not user.avatar_url else user.avatar_url
                )
                return user

        # Next, try to find by Email to sync traditional accounts with social
        user_by_email = cls.find_by_email(email)
        if user_by_email:
            update_data = {}
            if google_id and not user_by_email.google_id:
                update_data['google_id'] = google_id
            if facebook_id and not user_by_email.facebook_id:
                update_data['facebook_id'] = facebook_id
            if avatar_url and not user_by_email.avatar_url:
                update_data['avatar_url'] = avatar_url
            if update_data:
                user_by_email.update(**update_data)
            return user_by_email

        # If completely new, create the user
        base_username = email.split("@")[0]
        username = base_username
        
        # Ensure username uniqueness
        counter = 1
        while cls.query.filter_by(username=username).first():
            username = f"{base_username}{counter}"
            counter += 1

        return cls.create(
            google_id=google_id,
            facebook_id=facebook_id,
            username=username,
            email=email,
            display_name=display_name,
            avatar_url=avatar_url,
        )

    def get_scan_history(self, limit=20):
        """Get the user's most recent scans."""
        return (
            self.scans.order_by(self.__class__.scans.property.mapper.class_.created_at.desc())
            .limit(limit)
            .all()
        )

    def get_scan_count(self):
        """Get total number of scans by this user."""
        return self.scans.count()

    def __repr__(self):
        return f"<User id={self.id} email={self.email}>"
