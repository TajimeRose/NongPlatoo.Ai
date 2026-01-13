"""Users API endpoints - CRUD operations for user management."""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from backend.extensions import db
from backend.models.user_model import User

users_bp = Blueprint('users', __name__, url_prefix='/api/users')


@users_bp.route('', methods=['GET'])
@jwt_required()
def get_users():
    """Get all users (admin only).
    
    Query params:
        - page: Page number (default: 1)
        - per_page: Items per page (default: 20, max: 100)
        - role: Filter by role
        - search: Search by username or email
    """
    current_user_id = get_jwt_identity()
    current_user = User.query.get(int(current_user_id))
    
    # Only admins can list all users
    if not current_user or current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    # Pagination
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    
    # Build query
    query = User.query
    
    # Filter by role
    role = request.args.get('role')
    if role:
        query = query.filter_by(role=role)
    
    # Search by username or email
    search = request.args.get('search')
    if search:
        search_term = f'%{search}%'
        query = query.filter(
            (User.username.ilike(search_term)) | 
            (User.email.ilike(search_term))
        )
    
    # Order by created_at (newest first)
    query = query.order_by(User.created_at.desc())
    
    # Paginate
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'users': [user.to_dict() for user in pagination.items],
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
        'pages': pagination.pages
    }), 200


@users_bp.route('/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user(user_id):
    """Get a specific user by ID."""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(int(current_user_id))
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Users can see their own full info, others see limited info
    include_email = (current_user.id == user.id or current_user.role == 'admin')
    
    return jsonify({
        'user': user.to_dict(include_email=include_email)
    }), 200


@users_bp.route('/<int:user_id>', methods=['PUT', 'PATCH'])
@jwt_required()
def update_user(user_id):
    """Update a user's information.
    
    Request body (all optional):
        {
            "first_name": "John",
            "last_name": "Doe",
            "phone": "+66123456789",
            "avatar_url": "https://example.com/avatar.jpg"
        }
    """
    current_user_id = get_jwt_identity()
    current_user = User.query.get(int(current_user_id))
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Only the user themselves or admin can update
    if current_user.id != user.id and current_user.role != 'admin':
        return jsonify({'error': 'Permission denied'}), 403
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Update allowed fields
    allowed_fields = ['first_name', 'last_name', 'phone', 'avatar_url']
    for field in allowed_fields:
        if field in data:
            setattr(user, field, data[field])
    
    # Admin can update role and status
    if current_user.role == 'admin':
        if 'role' in data:
            user.role = data['role']
        if 'is_active' in data:
            user.is_active = data['is_active']
        if 'is_verified' in data:
            user.is_verified = data['is_verified']
    
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to update user: {str(e)}'}), 500
    
    return jsonify({
        'message': 'User updated successfully',
        'user': user.to_dict(include_email=True)
    }), 200


@users_bp.route('/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    """Delete a user (admin only or self-delete)."""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(int(current_user_id))
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Only admin or user themselves can delete
    if current_user.id != user.id and current_user.role != 'admin':
        return jsonify({'error': 'Permission denied'}), 403
    
    # Prevent admin from deleting themselves (safety)
    if current_user.id == user.id and current_user.role == 'admin':
        return jsonify({'error': 'Admin cannot delete their own account'}), 400
    
    try:
        db.session.delete(user)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to delete user: {str(e)}'}), 500
    
    return jsonify({
        'message': 'User deleted successfully'
    }), 200


@users_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """Get current user's profile (shortcut for /api/users/me)."""
    current_user_id = get_jwt_identity()
    user = User.query.get(int(current_user_id))
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'user': user.to_dict(include_email=True)
    }), 200


@users_bp.route('/profile', methods=['PUT', 'PATCH'])
@jwt_required()
def update_profile():
    """Update current user's profile."""
    current_user_id = get_jwt_identity()
    user = User.query.get(int(current_user_id))
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Update allowed fields
    allowed_fields = ['first_name', 'last_name', 'phone', 'avatar_url']
    for field in allowed_fields:
        if field in data:
            setattr(user, field, data[field])
    
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to update profile: {str(e)}'}), 500
    
    return jsonify({
        'message': 'Profile updated successfully',
        'user': user.to_dict(include_email=True)
    }), 200
