"""Flask app for Samut Songkhram tourism."""

import json
import os
import sys
import datetime
from dotenv import load_dotenv
from flask import Flask, request, jsonify, Response, send_from_directory, abort
from flask_cors import CORS

# Ensure the current directory and optional 'backend' subdirectory are in sys.path.
current_dir = os.path.dirname(__file__)
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)
backend_dir = os.path.join(current_dir, 'backend')
if os.path.isdir(backend_dir) and backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

load_dotenv()

# Resolve static roots (prefer backend/static, then frontend/dist, then legacy ./static)
BASE_DIR = os.path.dirname(__file__)
STATIC_ROOTS = [
    os.path.join(BASE_DIR, "backend", "static"),
    os.path.join(BASE_DIR, "frontend", "dist"),
    os.path.join(BASE_DIR, "static"),
]

# Local utilities
from backend.visit_counter import get_counts, increment_visit, normalize_path

app = Flask(__name__)
CORS(app)

try:
    # Attempt to import chat utilities from either root or the 'backend' package.
    from chat import chat_with_bot, get_chat_response
except Exception as e:
    # Fallback definitions to prevent NameError if imports fail. These will
    # raise a runtime error when used, making the failure explicit.
    def chat_with_bot(*args: object, **kwargs: object) -> str:
        raise RuntimeError(f"Chat module unavailable: {e}")

    def get_chat_response(*args: object, **kwargs: object) -> dict:
        return {
            'response': '',
            'structured_data': [],
            'language': 'th',
            'intent': None,
            'source': 'error',
            'error': f'Chat module unavailable: {e}',
        }
    print(f"⚠️ Warning: Could not import chat module: {e}")

try:
    # Import database initialization helper
    from db import init_db
except Exception as e:
    # Provide a noop init_db to avoid UnboundLocalError; it will log the issue.
    def init_db() -> None:
        print(f"[WARN] init_db unavailable due to import error: {e}")
    print(f"⚠️ Warning: Could not import db module: {e}")

FIREBASE_ENV_MAP = {
    'apiKey': 'FIREBASE_API_KEY',
    'authDomain': 'FIREBASE_AUTH_DOMAIN',
    'projectId': 'FIREBASE_PROJECT_ID',
    'storageBucket': 'FIREBASE_STORAGE_BUCKET',
    'messagingSenderId': 'FIREBASE_MESSAGING_SENDER_ID',
    'appId': 'FIREBASE_APP_ID',
    'databaseURL': 'FIREBASE_DATABASE_URL',
}
def _find_static_file(filename: str) -> tuple[str, str] | None:
    """Return (folder, filename) for the first static folder containing the file."""
    for folder in STATIC_ROOTS:
        candidate = os.path.join(folder, filename)
        if os.path.isfile(candidate):
            return folder, filename
    return None


def _find_asset_file(path: str) -> tuple[str, str] | None:
    """Return (folder, path) for the first assets folder containing the file."""
    for folder in STATIC_ROOTS:
        candidate = os.path.join(folder, "assets", path)
        if os.path.isfile(candidate):
            return os.path.join(folder, "assets"), path
    return None

@app.route('/')
def index():
    found = _find_static_file('index.html')
    if found:
        folder, fname = found
        return send_from_directory(folder, fname)
    abort(404)
    
@app.route('/assets/<path:path>')
def send_assets(path):
    found = _find_asset_file(path)
    if found:
        folder, fname = found
        return send_from_directory(folder, fname)
    abort(404)

@app.route('/api/query', methods=['POST'])
def api_query():
    try:
        data = request.get_json()
        if not data or 'message' not in data:
            return jsonify({'error': 'Message is required'}), 400
        
        user_message = data['message']
        user_id = data.get('user_id', 'default')
        
        # เรียกใช้ฟังก์ชันจาก module
        result = get_chat_response(user_message, user_id)
        
        return jsonify({
            'success': True,
            'response': result['response'],
            'structured_data': result.get('structured_data', []),
            'language': result.get('language', 'th'),
            'intent': result.get('intent'),
            'source': result.get('source'),
            'tokens_used': result.get('tokens_used'),
            'timestamp': datetime.datetime.now().isoformat()
        })
    
    except Exception as e:
        print(f"[ERROR] /api/query failed: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/chat', methods=['POST'])
def api_chat():
    try:
        data = request.get_json()
        if not data or 'message' not in data:
            return jsonify({'error': 'Message is required'}), 400
        
        user_message = data['message']
        user_id = data.get('user_id', 'default')
        
        bot_response = chat_with_bot(user_message, user_id)
        
        return jsonify({
            'success': True,
            'response': bot_response,
            'timestamp': datetime.datetime.now().isoformat()
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/visits', methods=['GET', 'POST'])
def visits():
    try:
        if request.method == 'POST':
            data = request.get_json(silent=True) or {}
            path = normalize_path(data.get('path') or '/')
            total, page_total, pages = increment_visit(path)
            return jsonify({
                'success': True,
                'path': path,
                'total': total,
                'page_total': page_total,
                'pages': pages
            })

        counts = get_counts()
        return jsonify({
            'success': True,
            'total': counts.get('total', 0),
            'pages': counts.get('pages', {})
        })
    except Exception as e:
        print(f"[ERROR] /api/visits failed: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/messages', methods=['GET'])
def get_messages():
    try:
        return jsonify({
            'success': True,
            'messages': []
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/messages', methods=['POST'])
def post_message():
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({'error': 'Text is required'}), 400
        
        user_message = data['text']
        user_id = data.get('user_id', 'default')
        
        result = get_chat_response(user_message, user_id)
        
        current_time = datetime.datetime.now().isoformat()
        error_message = result.get('gpt_error') or result.get('error')
        error_flag = bool(error_message)
        
        assistant_payload = {
            'role': 'assistant',
            'text': result['response'],
            'structured_data': result.get('structured_data', []),
            'language': result.get('language', 'th'),
            'intent': result.get('intent'),
            'source': result.get('source'),
            'createdAt': current_time,
            'fallback': error_flag or result.get('source') in {'simple_fallback', 'simple'},
            'duplicate': result.get('duplicate', False)
        }

        response_payload = {
            'success': not error_flag,
            'error': error_flag,
            'message': error_message,
            'assistant': assistant_payload,
            'data_status': result.get('data_status'),
            'duplicate': result.get('duplicate', False)
        }

        return jsonify(response_payload)
    
    except Exception as e:
        print(f"[ERROR] /api/messages POST failed: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/feedback', methods=['POST'])
def submit_feedback():
    """Submit like/dislike feedback for an AI response."""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data or 'message_id' not in data or 'feedback_type' not in data:
            return jsonify({'error': 'message_id and feedback_type are required'}), 400
        
        if data['feedback_type'] not in ['like', 'dislike']:
            return jsonify({'error': 'feedback_type must be "like" or "dislike"'}), 400
        
        from backend.db import get_session_factory, MessageFeedback
        session_factory = get_session_factory()
        session = session_factory()
        
        try:
            # Check if feedback already exists for this message
            existing = session.query(MessageFeedback).filter_by(
                message_id=data['message_id']
            ).first()
            
            if existing:
                # Update existing feedback
                existing.feedback_type = data['feedback_type']
                existing.feedback_comment = data.get('comment', '')
            else:
                # Create new feedback
                feedback = MessageFeedback(
                    message_id=data['message_id'],
                    user_id=data.get('user_id', 'anonymous'),
                    user_message=data.get('user_message', ''),
                    ai_response=data.get('ai_response', ''),
                    feedback_type=data['feedback_type'],
                    feedback_comment=data.get('comment', ''),
                    intent=data.get('intent', ''),
                    source=data.get('source', '')
                )
                session.add(feedback)
            
            session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Feedback recorded successfully'
            })
            
        finally:
            session.close()
            
    except Exception as e:
        print(f"[ERROR] /api/feedback failed: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/feedback/stats', methods=['GET'])
def get_feedback_stats():
    """Get statistics about AI response feedback."""
    try:
        from backend.db import get_session_factory, MessageFeedback
        from sqlalchemy import func
        
        session_factory = get_session_factory()
        session = session_factory()
        
        try:
            # Overall stats
            total_feedback = session.query(MessageFeedback).count()
            likes = session.query(MessageFeedback).filter_by(feedback_type='like').count()
            dislikes = session.query(MessageFeedback).filter_by(feedback_type='dislike').count()
            
            # Stats by source
            source_stats = session.query(
                MessageFeedback.source,
                MessageFeedback.feedback_type,
                func.count(MessageFeedback.id)
            ).group_by(MessageFeedback.source, MessageFeedback.feedback_type).all()
            
            # Stats by intent
            intent_stats = session.query(
                MessageFeedback.intent,
                MessageFeedback.feedback_type,
                func.count(MessageFeedback.id)
            ).group_by(MessageFeedback.intent, MessageFeedback.feedback_type).all()
            
            # Recent dislikes with comments
            recent_dislikes = session.query(MessageFeedback).filter(
                MessageFeedback.feedback_type == 'dislike',
                MessageFeedback.feedback_comment != ''
            ).order_by(MessageFeedback.created_at.desc()).limit(10).all()
            
            satisfaction_rate = (likes / total_feedback * 100) if total_feedback > 0 else 0
            
            return jsonify({
                'success': True,
                'stats': {
                    'total_feedback': total_feedback,
                    'likes': likes,
                    'dislikes': dislikes,
                    'satisfaction_rate': round(satisfaction_rate, 2),
                    'by_source': [
                        {'source': s, 'feedback_type': f, 'count': c}
                        for s, f, c in source_stats
                    ],
                    'by_intent': [
                        {'intent': i, 'feedback_type': f, 'count': c}
                        for i, f, c in intent_stats
                    ],
                    'recent_issues': [fb.to_dict() for fb in recent_dislikes]
                }
            })
            
        finally:
            session.close()
            
    except Exception as e:
        print(f"[ERROR] /api/feedback/stats failed: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/firebase_config.js')
def firebase_config():
    config = {}
    for key, env_name in FIREBASE_ENV_MAP.items():
        value = os.getenv(env_name)
        if value:
            config[key] = value

    if not config.get('apiKey'): 
        body = "console.warn('Firebase configuration missing; auth disabled.');\nwindow.FIREBASE_CONFIG = null;"
    else:
        body = f"window.FIREBASE_CONFIG = {json.dumps(config, ensure_ascii=False)};"

    response = Response(body, mimetype='application/javascript')
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    return response

@app.route('/health')
def health_check():
    return jsonify({'status': 'healthy', 'timestamp': datetime.datetime.now().isoformat()})

@app.route('/<path:path>')
def spa_fallback(path: str):
    if path == 'favicon.ico':
        found = _find_static_file('favicon.ico')
        if found:
            folder, fname = found
            return send_from_directory(folder, fname)
        abort(404)
    if path.startswith(('api/', 'assets/', 'static/', 'firebase_config.js')):
        abort(404)
    found = _find_static_file('index.html')
    if found:
        folder, fname = found
        return send_from_directory(folder, fname)
    abort(404)

if __name__ == '__main__':
    print("Samut Songkhram Travel Assistant")
    try:
        init_db()
    except Exception as e:
         print(f"[WARN] Database initialization failed: {e}")
    
    print("[INFO] Running app...")
    app.run(host="0.0.0.0", port=8000)

