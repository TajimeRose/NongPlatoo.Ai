"""Extensions module - DB, JWT, Migration setup for NongPlatoo.Ai."""

import os
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate

# Initialize extensions (without app binding yet)
db = SQLAlchemy()
jwt = JWTManager()
migrate = Migrate()


def init_extensions(app):
    """Initialize all extensions with the Flask app instance.
    
    Call this from your main app.py after creating the Flask app:
        from backend.extensions import init_extensions
        init_extensions(app)
    """
    # Database configuration
    database_url = os.getenv('DATABASE_URL', 'sqlite:///app.db')
    
    # Fix for Heroku/Coolify postgres:// vs postgresql://
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'pool_pre_ping': True,
        'connect_args': {'connect_timeout': 3}
    }
    
    # JWT configuration
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'nong-platoo-super-secret-key')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 3600  # 1 hour
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = 2592000  # 30 days
    
    # Initialize extensions with app
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    
    # Create tables if they don't exist
    with app.app_context():
        db.create_all()
    
    return app
