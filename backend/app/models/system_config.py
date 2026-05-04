from app.extensions import db
from app.models.base_model import BaseModel

class SystemConfig(BaseModel):
    """
    IndAI — SystemConfig Model
    Stores global configuration flags (e.g. maintenance_mode, rate limits) managed by superadmins.
    """
    __tablename__ = 'system_configs'

    key = db.Column(db.String(100), unique=True, nullable=False)
    value = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    description = db.Column(db.String(255), nullable=True)
    is_boolean = db.Column(db.Boolean, default=True)

    def to_dict(self):
        return {
            "id": self.id,
            "key": self.key,
            "value": self.value.lower() == 'true' if self.is_boolean else self.value,
            "category": self.category,
            "description": self.description
        }

    @classmethod
    def get_value(cls, key, default=None):
        config = cls.query.filter_by(key=key).first()
        if not config:
            return default
        if config.is_boolean:
            return config.value.lower() == 'true'
        return config.value

    @classmethod
    def set_value(cls, key, value, category="general", description="", is_boolean=True):
        config = cls.query.filter_by(key=key).first()
        val_str = str(value).lower() if is_boolean else str(value)
        if config:
            config.value = val_str
        else:
            config = cls(
                key=key, 
                value=val_str, 
                category=category, 
                description=description, 
                is_boolean=is_boolean
            )
            db.session.add(config)
        db.session.commit()
        return config
