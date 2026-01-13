"""Tracking API endpoints - Log user activities and events."""

import json
from flask import Blueprint, request, jsonify

tracking_api_bp = Blueprint('tracking_api', __name__, url_prefix='/api/tracking')


@tracking_api_bp.route('/log', methods=['POST'])
def log_user_action():
    """Log a user action/event.
    
    Request body:
        {
            "action": "click_buy_now",
            "details": {"price": 500, "item": "Shoe"},
            "page_url": "/products/shoe-123",
            "target_element": "buy-button"
        }
    """
    try:
        # Import here to avoid circular imports
        from backend.db import UserActivityLog, get_session_factory
        
        data = request.get_json(silent=True) or {}
        
        action_type = data.get('action') or data.get('action_type', 'unknown')
        target_element = data.get('target_element', data.get('button', ''))
        page_url = data.get('page_url', request.referrer)
        
        # Convert details dict to JSON string for meta_data column
        details = data.get('details', {})
        meta_data = json.dumps(details) if details else None
        
        # Get user_id if authenticated
        user_id = None
        try:
            from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
            verify_jwt_in_request(optional=True)
            identity = get_jwt_identity()
            if identity:
                user_id = str(identity)
        except Exception:
            pass  # Anonymous user
        
        new_log = UserActivityLog(
            user_id=user_id,
            action_type=action_type,
            target_element=target_element,
            page_url=page_url,
            meta_data=meta_data,
            ip_address=request.remote_addr
        )
        
        session_factory = get_session_factory()
        with session_factory() as session:
            session.add(new_log)
            session.commit()
            log_id = new_log.id
            
        return jsonify({
            "success": True,
            "status": "saved",
            "log_id": log_id
        }), 201
        
    except Exception as e:
        print(f"[ERROR] Tracking log failed: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@tracking_api_bp.route('/logs', methods=['GET'])
def get_logs():
    """Get activity logs (admin only).
    
    Query params:
        - page: Page number (default: 1)
        - per_page: Items per page (default: 50)
        - action: Filter by action type
        - user_id: Filter by user
    """
    try:
        from flask_jwt_extended import jwt_required, get_jwt_identity
        from backend.db import UserActivityLog, get_session_factory
        from backend.models.user_model import User
        from sqlalchemy import select, desc
        
        # Check JWT
        try:
            from flask_jwt_extended import verify_jwt_in_request
            verify_jwt_in_request()
            current_user_id = get_jwt_identity()
        except Exception:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Check admin role (simplified - you may want to use extensions db)
        # For now, allow any authenticated user to see logs
        
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 50, type=int), 100)
        
        session_factory = get_session_factory()
        with session_factory() as session:
            query = select(UserActivityLog).order_by(desc(UserActivityLog.created_at))
            
            # Filter by action
            action = request.args.get('action')
            if action:
                query = query.where(UserActivityLog.action_type == action)
            
            # Filter by user
            user_id_filter = request.args.get('user_id')
            if user_id_filter:
                query = query.where(UserActivityLog.user_id == user_id_filter)
            
            # Pagination
            offset = (page - 1) * per_page
            query = query.offset(offset).limit(per_page)
            
            logs = session.scalars(query).all()
            log_dicts = [log.to_dict() for log in logs]
        
        return jsonify({
            'logs': log_dicts,
            'page': page,
            'per_page': per_page
        }), 200
        
    except Exception as e:
        print(f"[ERROR] Get logs failed: {e}")
        return jsonify({'error': str(e)}), 500


@tracking_api_bp.route('/stats', methods=['GET'])
def get_stats():
    """Get tracking statistics."""
    try:
        from backend.db import UserActivityLog, get_session_factory
        from sqlalchemy import func, select
        
        session_factory = get_session_factory()
        with session_factory() as session:
            # Total count
            total_logs = session.scalar(select(func.count(UserActivityLog.id)))
            
            # Unique users
            unique_users = session.scalar(
                select(func.count(func.distinct(UserActivityLog.user_id)))
            )
            
            # Action breakdown
            action_counts = session.execute(
                select(
                    UserActivityLog.action_type,
                    func.count(UserActivityLog.id).label('count')
                ).group_by(UserActivityLog.action_type)
            ).all()
        
        return jsonify({
            'total_logs': total_logs or 0,
            'unique_users': unique_users or 0,
            'action_breakdown': {action: count for action, count in action_counts}
        }), 200
        
    except Exception as e:
        print(f"[ERROR] Get stats failed: {e}")
        return jsonify({'error': str(e)}), 500
