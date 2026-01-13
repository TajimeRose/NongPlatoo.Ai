"""ChatLog model - Store chat history with AI statistics."""

from datetime import datetime
from backend.extensions import db


class ChatLog(db.Model):
    """Model for storing chat conversations with AI statistics."""
    
    __tablename__ = 'chat_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # NULL for anonymous
    session_id = db.Column(db.String(100), nullable=True)  # Session identifier
    
    # Messages
    user_message = db.Column(db.Text, nullable=False)
    ai_response = db.Column(db.Text, nullable=False)
    
    # AI Statistics
    model_name = db.Column(db.String(50))  # e.g., 'gpt-4o'
    tokens_used = db.Column(db.Integer)  # Total tokens
    prompt_tokens = db.Column(db.Integer)  # Input tokens
    completion_tokens = db.Column(db.Integer)  # Output tokens
    latency_ms = db.Column(db.Integer)  # Response time in milliseconds
    
    # Context
    intent_type = db.Column(db.String(50))  # e.g., 'travel', 'restaurant', 'general'
    data_source = db.Column(db.String(50))  # e.g., 'database', 'gpt', 'fallback'
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'session_id': self.session_id,
            'user_message': self.user_message,
            'ai_response': self.ai_response,
            'model_name': self.model_name,
            'tokens_used': self.tokens_used,
            'prompt_tokens': self.prompt_tokens,
            'completion_tokens': self.completion_tokens,
            'latency_ms': self.latency_ms,
            'intent_type': self.intent_type,
            'data_source': self.data_source,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
    
    def __repr__(self):
        return f'<ChatLog {self.id}>'
