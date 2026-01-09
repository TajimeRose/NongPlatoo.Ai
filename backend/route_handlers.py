"""Route handlers and helper functions for Flask application."""

import datetime
from typing import Dict, Any, Optional, Tuple
from flask import request, jsonify, Response
import logging

logger = logging.getLogger(__name__)


def handle_api_query(get_chat_response_func) -> Tuple[Dict[str, Any], int]:
    """
    Handle /api/query endpoint.
    
    Args:
        get_chat_response_func: The chat response function to call
        
    Returns:
        Tuple of (response_dict, status_code)
    """
    try:
        data = request.get_json()
        if not data or 'message' not in data:
            return {'error': 'Message is required'}, 400
        
        user_message = data['message']
        user_id = data.get('user_id', 'default')
        
        result = get_chat_response_func(user_message, user_id)
        
        return {
            'success': True,
            'response': result['response'],
            'structured_data': result.get('structured_data', []),
            'language': result.get('language', 'th'),
            'intent': result.get('intent'),
            'source': result.get('source'),
            'tokens_used': result.get('tokens_used'),
            'timestamp': datetime.datetime.now().isoformat()
        }, 200
    
    except Exception as error:
        logger.error(f"Error in /api/query: {error}")
        return {'error': str(error)}, 500


def handle_api_chat(chat_with_bot_func) -> Tuple[Dict[str, Any], int]:
    """
    Handle /api/chat endpoint.
    
    Args:
        chat_with_bot_func: The chat function to call
        
    Returns:
        Tuple of (response_dict, status_code)
    """
    try:
        data = request.get_json()
        if not data or 'message' not in data:
            return {'error': 'Message is required'}, 400
        
        user_message = data['message']
        user_id = data.get('user_id', 'default')
        
        bot_response = chat_with_bot_func(user_message, user_id)
        
        return {
            'success': True,
            'response': bot_response,
            'timestamp': datetime.datetime.now().isoformat()
        }, 200
    
    except Exception as error:
        logger.error(f"Error in /api/chat: {error}")
        return {'error': str(error)}, 500


def handle_visits(normalize_path_func, increment_visit_func, get_counts_func) -> Tuple[Dict[str, Any], int]:
    """
    Handle /api/visits endpoint for both GET and POST.
    
    Args:
        normalize_path_func: Function to normalize paths
        increment_visit_func: Function to increment visit count
        get_counts_func: Function to get all visit counts
        
    Returns:
        Tuple of (response_dict, status_code)
    """
    try:
        if request.method == 'POST':
            data = request.get_json(silent=True) or {}
            path = normalize_path_func(data.get('path') or '/')
            total, page_total, pages = increment_visit_func(path)
            return {
                'success': True,
                'path': path,
                'total': total,
                'page_total': page_total,
                'pages': pages
            }, 200

        counts = get_counts_func()
        return {
            'success': True,
            'total': counts.get('total', 0),
            'pages': counts.get('pages', {})
        }, 200
        
    except Exception as error:
        logger.error(f"Error in /api/visits: {error}")
        return {'error': str(error)}, 500


def handle_get_messages(get_conversation_memory_func) -> Tuple[Dict[str, Any], int]:
    """
    Handle GET /api/messages endpoint.
    
    Args:
        get_conversation_memory_func: Function to get conversation memory
        
    Returns:
        Tuple of (response_dict, status_code)
    """
    try:
        user_id = request.args.get('user_id', 'default')
        limit = int(request.args.get('limit', 20))
        
        memory = get_conversation_memory_func()
        history = memory.get_history(user_id, limit=limit)
        
        return {
            'success': True,
            'messages': history,
            'count': len(history)
        }, 200
        
    except Exception as error:
        logger.error(f"Error in /api/messages: {error}")
        return {'error': str(error)}, 500


def handle_clear_messages(get_conversation_memory_func) -> Tuple[Dict[str, Any], int]:
    """
    Handle POST /api/messages/clear endpoint.
    
    Args:
        get_conversation_memory_func: Function to get conversation memory
        
    Returns:
        Tuple of (response_dict, status_code)
    """
    try:
        data = request.get_json(silent=True) or {}
        user_id = data.get('user_id', 'default')
        
        memory = get_conversation_memory_func()
        memory.clear_history(user_id)
        
        return {
            'success': True,
            'message': f'Conversation history cleared for user: {user_id}'
        }, 200
        
    except Exception as error:
        logger.error(f"Error in /api/messages/clear: {error}")
        return {'error': str(error)}, 500


def mask_database_url(db_url: str) -> str:
    """
    Mask sensitive parts of database URL for logging.
    
    Args:
        db_url: The database URL to mask
        
    Returns:
        Masked database URL string
    """
    if '@' in db_url:
        parts = db_url.split('@')
        return f"{parts[0].split('://')[0]}://****:****@{parts[1]}"
    return db_url


def log_environment_info(logger_instance: logging.Logger, backend_dir: str) -> None:
    """
    Log environment and configuration information at startup.
    
    Args:
        logger_instance: Logger to use for output
        backend_dir: Path to backend directory
    """
    logger_instance.info("=" * 70)
    logger_instance.info("FLASK APP STARTUP - DATABASE CONNECTION CHECK")
    logger_instance.info("=" * 70)
    logger_instance.info(f"Python version: {__import__('sys').version}")
    logger_instance.info(f"Working directory: {__import__('os').getcwd()}")
    logger_instance.info(f"Backend directory: {backend_dir}")

    # Log environment status
    db_url = __import__('os').getenv("DATABASE_URL")
    if db_url:
        masked = mask_database_url(db_url)
        logger_instance.info(f"✓ DATABASE_URL is set: {masked}")
    else:
        logger_instance.warning("✗ DATABASE_URL environment variable not found")

    logger_instance.info(f"✓ POSTGRES_HOST: {__import__('os').getenv('POSTGRES_HOST', 'not set')}")
    logger_instance.info(f"✓ POSTGRES_PORT: {__import__('os').getenv('POSTGRES_PORT', 'not set')}")
    logger_instance.info(f"✓ POSTGRES_DB: {__import__('os').getenv('POSTGRES_DB', 'not set')}")
    logger_instance.info("=" * 70)
