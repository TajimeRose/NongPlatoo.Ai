"""
Conversation Memory Manager
Handles short-term conversation history for AI chatbot
"""

from typing import Dict, List, Optional
import time
from collections import defaultdict

from .constants import MAX_MESSAGES_PER_USER, CONVERSATION_TTL_SECONDS


class ConversationMemory:
    """
    Manages conversation history for multiple users/sessions
    Stores last N messages per user to provide context to AI
    """
    
    def __init__(
        self, 
        max_messages_per_user: int = MAX_MESSAGES_PER_USER, 
        ttl_seconds: int = CONVERSATION_TTL_SECONDS
    ):
        """
        Initialize conversation memory
        
        Args:
            max_messages_per_user: Maximum number of message pairs to keep per user
            ttl_seconds: Time to live for conversations in seconds
        """
        self.max_messages = max_messages_per_user
        self.ttl_seconds = ttl_seconds
        
        # Structure: {user_id: {"messages": [...], "last_activity": timestamp}}
        self._conversations: Dict[str, Dict] = defaultdict(
            lambda: {"messages": [], "last_activity": time.time()}
        )
    
    def add_message(self, user_id: str, role: str, content: str) -> None:
        """
        Add a message to user's conversation history
        
        Args:
            user_id: User identifier
            role: Message role ("user" or "assistant")
            content: Message content
        """
        self._cleanup_expired()
        
        conversation = self._conversations[user_id]
        conversation["messages"].append({
            "role": role,
            "content": content
        })
        conversation["last_activity"] = time.time()
        
        # Keep only last N message pairs (N user + N assistant = 2N messages)
        max_total_messages = self.max_messages * 2
        if len(conversation["messages"]) > max_total_messages:
            conversation["messages"] = conversation["messages"][-max_total_messages:]
    
    def get_history(self, user_id: str, limit: Optional[int] = None) -> List[Dict[str, str]]:
        """
        Get conversation history for a user
        
        Args:
            user_id: User identifier
            limit: Maximum number of messages to return (default: all within max_messages)
        
        Returns:
            List of message dictionaries with "role" and "content"
        """
        self._cleanup_expired()
        
        if user_id not in self._conversations:
            return []
        
        messages = self._conversations[user_id]["messages"]
        
        if limit:
            return messages[-limit:]
        return messages
    
    def clear_history(self, user_id: str) -> None:
        """
        Clear conversation history for a specific user
        
        Args:
            user_id: User identifier
        """
        if user_id in self._conversations:
            del self._conversations[user_id]
    
    def _cleanup_expired(self) -> None:
        """Remove expired conversations based on TTL"""
        current_time = time.time()
        expired_users = [
            user_id for user_id, conv in self._conversations.items()
            if current_time - conv["last_activity"] > self.ttl_seconds
        ]
        
        for user_id in expired_users:
            del self._conversations[user_id]
    
    def get_stats(self) -> Dict:
        """
        Get memory statistics
        
        Returns:
            Dictionary with memory stats
        """
        self._cleanup_expired()
        
        return {
            "active_conversations": len(self._conversations),
            "total_messages": sum(len(conv["messages"]) for conv in self._conversations.values()),
            "max_messages_per_user": self.max_messages,
            "ttl_seconds": self.ttl_seconds
        }


# Global singleton instance
_memory_instance: Optional[ConversationMemory] = None


def get_conversation_memory() -> ConversationMemory:
    """
    Get or create the global conversation memory instance
    
    Returns:
        ConversationMemory singleton instance
    """
    global _memory_instance
    
    if _memory_instance is None:
        _memory_instance = ConversationMemory(
            max_messages_per_user=10,  # Keep last 10 exchanges (20 messages)
            ttl_seconds=1800  # 30 minutes
        )
    
    return _memory_instance
