"""Flask app for Samut Songkhram tourism."""

import json
import os
import sys
import datetime
from dotenv import load_dotenv
from flask import Flask, request, jsonify, Response, send_from_directory, abort
from flask_cors import CORS

# ---------------------------------------------------------
# 🔧 FIX 1: เพิ่มโฟลเดอร์ 'backend' เข้าไปใน Path
# เพื่อให้ไฟล์ chat.py สามารถเรียกเพื่อนๆ (configs, db) ได้
# ---------------------------------------------------------
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# 1. โหลด Environment
load_dotenv()

# 2. สร้าง app
app = Flask(__name__)
CORS(app)

# ---------------------------------------------------------
# 🔧 FIX 2: Import Modules (ตอนนี้ import 'chat' ตรงๆ ได้แล้ว)
# ---------------------------------------------------------
try:
    from chat import chat_with_bot, get_chat_response
    from db import init_db
except ImportError as e:
    print(f"⚠️ Warning: Could not import chat/db modules: {e}")

FIREBASE_ENV_MAP = {
    'apiKey': 'FIREBASE_API_KEY',
    'authDomain': 'FIREBASE_AUTH_DOMAIN',
    'projectId': 'FIREBASE_PROJECT_ID',
    'storageBucket': 'FIREBASE_STORAGE_BUCKET',
    'messagingSenderId': 'FIREBASE_MESSAGING_SENDER_ID',
    'appId': 'FIREBASE_APP_ID',
    'databaseURL': 'FIREBASE_DATABASE_URL',
}

# ---------------------------------------------------------
# 🔧 FIX 3: ชี้เป้า Static Files ไปที่ 'backend/static'
# เพราะ Dockerfile copy ไฟล์ Build ไปไว้ที่นั่น
# ---------------------------------------------------------
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
    # try:
    #     init_db()
    # except Exception as e:
    #     print(f"[WARN] Database initialization failed: {e}")
    
    print("[INFO] Running app...")
    app.run(host="0.0.0.0", port=8000)

