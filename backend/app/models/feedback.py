"""
IndAI — Feedback Model
Stores user ratings (thumbs up/down) for AI Assistant responses.
"""

from datetime import datetime
from app.extensions import db

class Feedback(db.Model):
    __tablename__ = "feedback"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    message_id = db.Column(db.String(100), nullable=False)
    rating = db.Column(db.String(20), nullable=False)  # 'upvote' or 'downvote'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    user = db.relationship("User", backref=db.backref("feedback", lazy=True))

    def __repr__(self):
        return f"<Feedback {self.id} for Msg {self.message_id}: {self.rating}>"

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "message_id": self.message_id,
            "rating": self.rating,
            "created_at": self.created_at.isoformat() + "Z"
        }
