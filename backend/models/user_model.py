"""User model for authentication and user management."""

from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from backend.extensions import db


class User(db.Model):
    """User model for authentication."""
    
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    
    # Profile fields
    first_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50))
    phone = db.Column(db.String(20))
    avatar_url = db.Column(db.String(500))
    
    # Account status
    role = db.Column(db.String(20), default='user')  # 'user', 'admin', 'moderator'
    is_active = db.Column(db.Boolean, default=True)
    is_verified = db.Column(db.Boolean, default=False)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    
    def set_password(self, password: str):
        """Hash and set the user's password."""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password: str) -> bool:
        """Verify the user's password."""
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self, include_email: bool = False) -> dict:
        """Convert user to dictionary (safe for API responses)."""
        data = {
            'id': self.id,
            'username': self.username,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'avatar_url': self.avatar_url,
            'role': self.role,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        if include_email:
            data['email'] = self.email
            data['phone'] = self.phone
            data['is_verified'] = self.is_verified
            data['last_login'] = self.last_login.isoformat() if self.last_login else None
        return data
    
    def __repr__(self):
        return f'<User {self.username}>'
