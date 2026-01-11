from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from ..db import get_session_factory, UserActivityLog
from sqlalchemy.exc import SQLAlchemyError
import logging

logger = logging.getLogger(__name__)

# Create Blueprint
tracking_bp = Blueprint('tracking', __name__)

@tracking_bp.route('/api/track/activity', methods=['POST'])
def track_activity():
    """
    Endpoint to log user activities such as clicks, views, and scrolls.
    Automatically extracts IP address and User ID (from JWT if available).
    """
    try:
        data = request.get_json(silent=True) or {}
        
        # 1. Try to find user_id (if token is attached)
        current_user_id = None
        try:
            # Check JWT optionally (doesn't fail if token is missing or invalid)
            verify_jwt_in_request(optional=True)
            current_user_id = get_jwt_identity()
        except Exception:
            # If no token or invalid, treat as guest
            pass

        # 2. Extract IP address - handle potential proxies
        user_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
        if user_ip and ',' in user_ip:
            # If multiple IPs (X-Forwarded-For: client, proxy1, proxy2), take the first one
            user_ip = user_ip.split(',')[0].strip()

        # 3. Action details from request body
        action_type = data.get('action_type', 'unknown')
        target_element = data.get('target_element', 'unknown')
        page_url = data.get('page_url', '')
        meta_data = data.get('meta_data', {})

        # 4. Save to Database using the project's session factory
        session_factory = get_session_factory()
        session = session_factory()
        try:
            log_entry = UserActivityLog(
                user_id=current_user_id,
                action_type=action_type,
                target_element=target_element,
                page_url=page_url,
                meta_data=meta_data,
                ip_address=user_ip
            )
            session.add(log_entry)
            session.commit()
            return jsonify({"success": True, "msg": "Logged successfully"}), 201
        except SQLAlchemyError as db_err:
            session.rollback()
            logger.error(f"Database error while tracking: {db_err}")
            return jsonify({"success": False, "error": "Database error occurred"}), 500
        finally:
            session.close()
            
    except Exception as e:
        logger.error(f"Unexpected error in track_activity: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
