"""
IndAI — Base Model (Abstract Base Class)
Demonstrates: Abstraction, Encapsulation, Template Method Pattern

All domain models inherit from this class to get shared CRUD operations
and common fields (id, created_at, updated_at).
"""

from datetime import datetime, timezone
from app.extensions import db


class BaseModel(db.Model):
    """
    Abstract base model providing common fields and CRUD operations.

    OOP Principles:
    - Abstraction: Hides complex DB operations behind simple methods
    - Encapsulation: Data access controlled through methods
    - Template Method: to_dict() can be overridden by subclasses
    """

    __abstract__ = True  # SQLAlchemy won't create a table for this class

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def save(self):
        """
        Persist the current instance to the database.
        Encapsulates the add + commit pattern.
        """
        db.session.add(self)
        db.session.commit()
        return self

    def delete(self):
        """
        Remove the current instance from the database.
        Encapsulates the delete + commit pattern.
        """
        db.session.delete(self)
        db.session.commit()

    def update(self, **kwargs):
        """
        Update specific fields on the instance.
        Encapsulates field-level updates with commit.
        """
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
        self.updated_at = datetime.now(timezone.utc)
        db.session.commit()
        return self

    def to_dict(self):
        """
        Template Method — serialize the model to a dictionary.
        Subclasses override this to customize serialization.
        """
        result = {}
        for column in self.__table__.columns:
            value = getattr(self, column.name)
            if isinstance(value, datetime):
                value = value.isoformat()
            result[column.name] = value
        return result

    @classmethod
    def find_by_id(cls, record_id):
        """Find a record by its primary key."""
        return db.session.get(cls, record_id)

    @classmethod
    def find_all(cls, **filters):
        """Find all records, optionally filtered."""
        query = cls.query
        for key, value in filters.items():
            if hasattr(cls, key):
                query = query.filter(getattr(cls, key) == value)
        return query.all()

    @classmethod
    def create(cls, **kwargs):
        """Factory method to create and persist a new instance."""
        instance = cls(**kwargs)
        return instance.save()

    def __repr__(self):
        return f"<{self.__class__.__name__} id={self.id}>"
