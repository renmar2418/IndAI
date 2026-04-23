"""
IndAI — User Model
Demonstrates: Inheritance (extends BaseModel), Polymorphism (overrides to_dict)

Represents a student user who authenticates via Google OAuth.
"""

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

    google_id = db.Column(db.String(255), unique=True, nullable=False, index=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    display_name = db.Column(db.String(255), nullable=False)
    avatar_url = db.Column(db.String(512), nullable=True)

    # Relationship — One User has Many Scans (Composition)
    scans = db.relationship(
        "Scan", backref="user", lazy="dynamic", cascade="all, delete-orphan"
    )

    def to_dict(self):
        """
        Polymorphism — Override base serialization.
        Excludes google_id for security when sending to frontend.
        """
        return {
            "id": self.id,
            "email": self.email,
            "display_name": self.display_name,
            "avatar_url": self.avatar_url,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    @classmethod
    def find_by_google_id(cls, google_id):
        """Find a user by their Google account ID."""
        return cls.query.filter_by(google_id=google_id).first()

    @classmethod
    def find_by_email(cls, email):
        """Find a user by email address."""
        return cls.query.filter_by(email=email).first()

    @classmethod
    def find_or_create(cls, google_id, email, display_name, avatar_url=None):
        """
        Find an existing user by Google ID, or create a new one.
        Demonstrates the Repository Pattern within the Model.
        """
        user = cls.find_by_google_id(google_id)
        if user:
            # Update profile info in case it changed on Google's side
            user.update(
                email=email, display_name=display_name, avatar_url=avatar_url
            )
            return user
        return cls.create(
            google_id=google_id,
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
