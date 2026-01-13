"""Activity Tracking Model - Re-export UserActivityLog from db.py for compatibility."""

# Re-export the existing UserActivityLog model from db.py
# This ensures we use the same table schema that already exists in the database

try:
    from backend.db import UserActivityLog as ActivityLog
except ImportError:
    # Fallback if db.py import fails
    from datetime import datetime
    from backend.extensions import db
    
    class ActivityLog(db.Model):
        """Model for tracking user activities (clicks, page views, actions)."""
        
        __tablename__ = 'user_activity_logs'
        
        id = db.Column(db.Integer, primary_key=True)
        user_id = db.Column(db.String, nullable=True)
        action_type = db.Column(db.String, nullable=False)
        target_element = db.Column(db.String, nullable=True)
        page_url = db.Column(db.Text, nullable=True)
        meta_data = db.Column(db.Text, nullable=True)
        ip_address = db.Column(db.String, nullable=True)
        created_at = db.Column(db.DateTime, default=datetime.utcnow)
        
        def to_dict(self):
            return {
                "id": self.id,
                "user_id": self.user_id,
                "action_type": self.action_type,
                "target_element": self.target_element,
                "page_url": self.page_url,
                "meta_data": self.meta_data,
                "ip_address": self.ip_address,
                "created_at": self.created_at.isoformat() if self.created_at else None
            }
