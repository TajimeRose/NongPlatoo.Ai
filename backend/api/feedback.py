"""Feedback API endpoints - Handle AI response feedback (like/dislike)."""

from flask import Blueprint, request, jsonify
from datetime import datetime

feedback_api_bp = Blueprint('feedback_api', __name__, url_prefix='/api/feedback')


@feedback_api_bp.route('', methods=['POST'])
def save_feedback():
    """Save feedback for an AI response.
    
    Request body:
        {
            "chat_log_id": 123,
            "type": "like" or "dislike",
            "comment": "Optional comment"
        }
    
    If feedback already exists for this chat_log_id, it will be updated (not duplicated).
    """
    try:
        from backend.db import MessageFeedback, get_session_factory
        from sqlalchemy import select
        
        data = request.get_json(silent=True) or {}
        
        chat_log_id = data.get('chat_log_id')
        feedback_type = data.get('type', 'like')  # 'like' or 'dislike'
        comment = data.get('comment', '')
        
        if not chat_log_id:
            return jsonify({'success': False, 'error': 'chat_log_id is required'}), 400
        
        # Get user_id if authenticated
        user_id = 'anonymous'
        try:
            from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
            verify_jwt_in_request(optional=True)
            identity = get_jwt_identity()
            if identity:
                user_id = str(identity)
        except Exception:
            pass
        
        session_factory = get_session_factory()
        with session_factory() as session:
            # Use chat_log_id as the unique identifier
            message_id_str = str(chat_log_id)
            
            # Check if feedback already exists for this chat_log_id
            existing_feedback = session.scalar(
                select(MessageFeedback).where(
                    MessageFeedback.chat_log_id == chat_log_id
                )
            )
            
            if existing_feedback:
                # Update existing feedback
                print(f"[INFO] Updating existing feedback for chat_log_id={chat_log_id}")
                existing_feedback.feedback_type = feedback_type
                existing_feedback.feedback_comment = comment
                existing_feedback.user_id = user_id
                existing_feedback.message_id = message_id_str
                session.commit()
                feedback_id = existing_feedback.id
                is_update = True
                print(f"[OK] Feedback updated: id={feedback_id}, type={feedback_type}")
            else:
                # Create new feedback
                print(f"[INFO] Creating new feedback for chat_log_id={chat_log_id}")
                new_feedback = MessageFeedback(
                    message_id=message_id_str,
                    user_id=user_id,
                    feedback_type=feedback_type,
                    feedback_comment=comment,
                    chat_log_id=chat_log_id,
                )
                session.add(new_feedback)
                session.commit()
                feedback_id = new_feedback.id
                is_update = False
                print(f"[OK] Feedback created: id={feedback_id}, type={feedback_type}")
        
        return jsonify({
            'success': True,
            'feedback_id': feedback_id,
            'type': feedback_type,
            'is_update': is_update
        }), 201 if not is_update else 200
        
    except Exception as e:
        print(f"[ERROR] Feedback save failed: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@feedback_api_bp.route('/stats', methods=['GET'])
def get_feedback_stats():
    """Get feedback statistics."""
    try:
        from backend.db import MessageFeedback, get_session_factory
        from sqlalchemy import func, select
        
        session_factory = get_session_factory()
        with session_factory() as session:
            # Count likes
            likes = session.scalar(
                select(func.count(MessageFeedback.id)).where(
                    MessageFeedback.feedback_type == 'like'
                )
            ) or 0
            
            # Count dislikes
            dislikes = session.scalar(
                select(func.count(MessageFeedback.id)).where(
                    MessageFeedback.feedback_type == 'dislike'
                )
            ) or 0
        
        total = likes + dislikes
        satisfaction_rate = round((likes / total * 100), 1) if total > 0 else 0
        
        return jsonify({
            'likes': likes,
            'dislikes': dislikes,
            'total': total,
            'satisfaction_rate': satisfaction_rate
        }), 200
        
    except Exception as e:
        print(f"[ERROR] Feedback stats failed: {e}")
        return jsonify({'error': str(e)}), 500
