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
STATIC_FOLDER = 'backend/static'

@app.route('/')
def index():
    return send_from_directory(STATIC_FOLDER, 'index.html')
    
@app.route('/assets/<path:path>')
def send_assets(path):
    return send_from_directory(f'{STATIC_FOLDER}/assets', path)

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
        return send_from_directory(STATIC_FOLDER, 'favicon.ico')
    if path.startswith(('api/', 'assets/', 'static/', 'firebase_config.js')):
        abort(404)
    return send_from_directory(STATIC_FOLDER, 'index.html')

if __name__ == '__main__':
    print("Samut Songkhram Travel Assistant")
    try:
        init_db()
    except Exception as e:
         print(f"[WARN] Database initialization failed: {e}")
    
    print("[INFO] Running app...")
    app.run(debug=True, host='0.0.0.0', port=5000)
