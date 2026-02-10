"""API package - Export all blueprints."""

from backend.api.auth import auth_bp
from backend.api.users import users_bp
from backend.api.tracking import tracking_api_bp
from backend.api.feedback import feedback_api_bp

__all__ = ['auth_bp', 'users_bp', 'tracking_api_bp', 'feedback_api_bp']


def register_api_blueprints(app):
    """Register all API blueprints with the Flask app.
    
    Call this from your main app.py:
        from backend.api import register_api_blueprints
        register_api_blueprints(app)
    """
    app.register_blueprint(auth_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(tracking_api_bp)
    app.register_blueprint(feedback_api_bp)
    return app
