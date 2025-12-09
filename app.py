"""Flask app for Samut Songkhram tourism."""

import json
import os
import sys
import datetime
import concurrent.futures
import logging
from concurrent.futures import TimeoutError
from dotenv import load_dotenv
from flask import Flask, request, jsonify, Response, send_from_directory, abort
from flask_cors import CORS

# Setup logging for debugging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

# Ensure the current directory and optional 'backend' subdirectory are in sys.path.
current_dir = os.path.dirname(__file__)
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)
backend_dir = os.path.join(current_dir, 'backend')
if os.path.isdir(backend_dir) and backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Load environment variables from .env files
# First try root directory, then backend directory
load_dotenv()  # Load from root if exists
backend_env_path = os.path.join(backend_dir, '.env')
if os.path.exists(backend_env_path):
    load_dotenv(backend_env_path, override=True)  # Load from backend/.env (takes priority)

# Default timeout for GPT calls to avoid worker hangs
# Increased to 60 seconds to allow time for semantic model loading on first request
CHAT_TIMEOUT_SECONDS = int(os.getenv("CHAT_TIMEOUT_SECONDS", "60"))

logger.info("=" * 70)
logger.info("FLASK APP STARTUP - DATABASE CONNECTION CHECK")
logger.info("=" * 70)
logger.info(f"Python version: {sys.version}")
logger.info(f"Working directory: {os.getcwd()}")
logger.info(f"Backend directory: {backend_dir}")

# Log environment status
db_url = os.getenv("DATABASE_URL")
if db_url:
    # Mask password for security
    masked = db_url.split('@')[0] + '@****:****@' + db_url.split('@')[1] if '@' in db_url else db_url
    logger.info(f"✓ DATABASE_URL is set: {masked}")
else:
    logger.warning("✗ DATABASE_URL environment variable not found")

logger.info(f"✓ POSTGRES_HOST: {os.getenv('POSTGRES_HOST', 'not set')}")
logger.info(f"✓ POSTGRES_PORT: {os.getenv('POSTGRES_PORT', 'not set')}")
logger.info(f"✓ POSTGRES_DB: {os.getenv('POSTGRES_DB', 'not set')}")
logger.info("=" * 70)
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
    from backend.chat import chat_with_bot, get_chat_response
    logger.info("✓ Chat module imported successfully")
except Exception as e:
    # Fallback definitions to prevent NameError if imports fail. These will
    # raise a runtime error when used, making the failure explicit.
    logger.error(f"✗ Failed to import chat module: {e}")
    def chat_with_bot(message: str, user_id: str = "default") -> str:
        raise RuntimeError(f"Chat module unavailable: {e}")

    def get_chat_response(message: str, user_id: str = "default") -> dict:
        return {
            'response': '',
            'structured_data': [],
            'language': 'th',
            'intent': None,
            'source': 'error',
            'error': f'Chat module unavailable: {e}',
        }

try:
    # Import database initialization helper
    from backend.db import init_db
    logger.info("✓ Database module imported successfully")
except Exception as e:
    # Provide a noop init_db to avoid UnboundLocalError; it will log the issue.
    logger.error(f"✗ Failed to import db module: {e}")
    def init_db() -> None:
        logger.error(f"[CRITICAL] init_db unavailable due to import error: {e}")
        print(f"[CRITICAL] init_db unavailable: {e}")

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
        data = request.get_json(silent=True) or {}
        user_message = data.get('text') or data.get('message') or ''
        user_id = data.get('user_id', 'default')

        if not user_message:
            return jsonify({
                'success': False,
                'error': True,
                'message': 'Text is required'
            }), 400

        # ----- เรียก get_chat_response แบบมี timeout -----
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(get_chat_response, user_message, user_id)
            try:
                result = future.result(timeout=CHAT_TIMEOUT_SECONDS)
            except TimeoutError:
                # AI ตอบช้าเกินกำหนด
                current_time = datetime.datetime.now().isoformat()
                assistant_payload = {
                    'role': 'assistant',
                    'text': 'ขออภัยค่ะ ระบบใช้เวลาประมวลผลนานเกินไป กรุณาลองใหม่อีกครั้งภายหลัง',
                    'structured_data': [],
                    'language': 'th',
                    'intent': None,
                    'source': 'timeout_fallback',
                    'createdAt': current_time,
                    'fallback': True,
                    'duplicate': False,
                }
                response_payload = {
                    'success': False,
                    'error': True,
                    'message': 'AI timeout',
                    'assistant': assistant_payload,
                    'data_status': None,
                    'duplicate': False,
                }
                return jsonify(response_payload), 504
        # --------------------------------------------------

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
            'duplicate': result.get('duplicate', False),
        }

        response_payload = {
            'success': not error_flag,
            'error': error_flag,
            'message': error_message,
            'assistant': assistant_payload,
            'data_status': result.get('data_status'),
            'duplicate': result.get('duplicate', False),
        }

        return jsonify(response_payload), 200

    except Exception as e:
        app.logger.exception("Error in /api/messages")
        current_time = datetime.datetime.now().isoformat()
        assistant_payload = {
            'role': 'assistant',
            'text': '',
            'structured_data': [],
            'language': 'th',
            'intent': None,
            'source': 'error',
            'createdAt': current_time,
            'fallback': True,
            'duplicate': False,
        }
        return jsonify({
            'success': False,
            'error': True,
            'message': str(e),
            'assistant': assistant_payload,
            'data_status': None,
            'duplicate': False,
        }), 500




@app.route('/api/places', methods=['GET'])
def get_all_places():
    """Get all places from database for the Places page."""
    try:
        from backend.db import get_session_factory, Place
        
        session_factory = get_session_factory()
        session = session_factory()
        
        try:
            places = session.query(Place).all()
            
            all_places = [p.to_dict() for p in places]
            
            logger.info(f"Retrieved {len(all_places)} places from database")
            
            return jsonify({
                'success': True,
                'places': all_places,
                'count': len(all_places)
            })
        finally:
            session.close()
    except Exception as e:
        logger.error(f"[ERROR] /api/places failed: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e),
            'places': []
        }), 500


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
    """Health check endpoint with database status"""
    try:
        db_status = "unknown"
        db_message = ""
        
        try:
            # Try to connect to database
            from backend.db import get_engine
            from sqlalchemy import text
            engine = get_engine()
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
                db_status = "connected"
                db_message = "Database connection successful"
                logger.info("✓ Health check: Database connected")
        except Exception as e:
            db_status = "disconnected"
            db_message = str(e)
            logger.error(f"✗ Health check: Database connection failed: {e}")
        
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.datetime.now().isoformat(),
            'database': {
                'status': db_status,
                'message': db_message
            }
        })
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return jsonify({
            'status': 'unhealthy',
            'timestamp': datetime.datetime.now().isoformat(),
            'error': str(e)
        }), 500

@app.route('/debug/db-info')
def db_info():
    """Debug endpoint showing database configuration (remove in production!)"""
    try:
        db_url = os.getenv("DATABASE_URL")
        if db_url:
            # Mask password for security
            masked_url = db_url.split('@')[0] + '@****:****@' + db_url.split('@')[1] if '@' in db_url else db_url
        else:
            masked_url = "Not set"
        
        return jsonify({
            'database_url': masked_url,
            'postgres_host': os.getenv('POSTGRES_HOST', 'not set'),
            'postgres_port': os.getenv('POSTGRES_PORT', 'not set'),
            'postgres_db': os.getenv('POSTGRES_DB', 'not set'),
            'postgres_user': os.getenv('POSTGRES_USER', 'not set'),
            'environment': os.getenv('ENVIRONMENT', 'development'),
            'note': 'This endpoint should be disabled in production'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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

@app.route('/api/image-proxy', methods=['GET'])
def image_proxy():
    """Proxy endpoint to serve Google Maps images and bypass CORS restrictions."""
    try:
        import requests
        from io import BytesIO
        
        image_url = request.args.get('url')
        if not image_url:
            return jsonify({'error': 'URL parameter required'}), 400
        
        # Security: Only allow Google image URLs
        if not image_url.startswith('https://lh3.googleusercontent.com'):
            return jsonify({'error': 'Only Google image URLs are allowed'}), 403
        
        # Fetch the image from Google
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://www.google.com/'
        }
        response = requests.get(image_url, headers=headers, timeout=10, stream=True)
        
        if response.status_code != 200:
            return jsonify({'error': 'Failed to fetch image'}), response.status_code
        
        # Determine content type
        content_type = response.headers.get('Content-Type', 'image/jpeg')
        
        # Stream the image back to the client
        return Response(
            response.content,
            mimetype=content_type,
            headers={
                'Cache-Control': 'public, max-age=86400',  # Cache for 24 hours
                'Access-Control-Allow-Origin': '*'
            }
        )
    except Exception as e:
        logger.error(f"Image proxy error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Samut Songkhram Travel Assistant")
    try:
        logger.info("Initializing database...")
        init_db()
        logger.info("✓ Database initialized successfully")
    except Exception as e:
        logger.error(f"[ERROR] Database initialization failed: {e}", exc_info=True)
        print(f"[WARN] Database initialization failed: {e}")
    
    # Preload semantic model to avoid first-request timeout
    # This prevents the 504 error that occurs when the model loads during the first chat request
    # Wrapped in a thread with timeout to prevent blocking server startup
    def preload_semantic_model():
        try:
            logger.info("Preloading semantic model...")
            from backend.semantic_search import get_model, get_embeddings
            get_model()  # Load the SentenceTransformer model (~2-3 seconds)
            get_embeddings()  # Precompute embeddings (~2-3 seconds)
            logger.info("✓ Semantic model preloaded successfully")
        except Exception as e:
            logger.warning(f"Semantic model preloading failed: {e}")
            logger.warning("Chat will work but first request may take longer")
    
    try:
        import threading
        preload_thread = threading.Thread(target=preload_semantic_model, daemon=True)
        preload_thread.start()
        # Give it max 60 seconds to load, but don't block server startup
        preload_thread.join(timeout=60)
        if preload_thread.is_alive():
            logger.warning("Semantic model preloading is taking too long, continuing without it")
    except Exception as e:
        logger.warning(f"Could not start preload thread: {e}")
    
    logger.info("[INFO] Starting Flask server on 0.0.0.0:8000...")
    print("[INFO] Running app...")
    app.run(host="0.0.0.0", port=8000)

