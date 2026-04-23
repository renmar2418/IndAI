"""
IndAI — Flask Extensions (Singleton Pattern)
Single shared instances of database and migration objects.
"""

from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Singleton instances — initialized once, shared across the app
db = SQLAlchemy()
migrate = Migrate()
# Explicitly use memory storage to silence the development warning. 
# In a real production environment with multiple workers, we would use a Redis URL here.
limiter = Limiter(key_func=get_remote_address, storage_uri="memory://")
