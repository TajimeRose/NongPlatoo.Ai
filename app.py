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

"""Import constants and optional route handlers."""
# Pre-bind names to avoid static analysis warnings when optional imports fail
handle_api_query = None
handle_api_chat = None
handle_visits = None
handle_get_messages = None
handle_clear_messages = None
log_environment_info = None

try:
    from backend.constants import DEFAULT_CHAT_TIMEOUT_SECONDS
    from backend.route_handlers import (
        handle_api_query as _handle_api_query,
        handle_api_chat as _handle_api_chat,
        handle_visits as _handle_visits,
        handle_get_messages as _handle_get_messages,
        handle_clear_messages as _handle_clear_messages,
        log_environment_info as _log_environment_info,
    )
    handle_api_query = _handle_api_query
    handle_api_chat = _handle_api_chat
    handle_visits = _handle_visits
    handle_get_messages = _handle_get_messages
    handle_clear_messages = _handle_clear_messages
    log_environment_info = _log_environment_info
    ROUTE_HANDLERS_AVAILABLE = True
except ImportError as import_error:
    logger.warning(f"Route handlers not available: {import_error}")
    ROUTE_HANDLERS_AVAILABLE = False
    DEFAULT_CHAT_TIMEOUT_SECONDS = 60

# Default timeout for GPT calls to avoid worker hangs
CHAT_TIMEOUT_SECONDS = int(os.getenv("CHAT_TIMEOUT_SECONDS", str(DEFAULT_CHAT_TIMEOUT_SECONDS)))

# Log environment info (fallback if route handler utility unavailable)
if log_environment_info:
    log_environment_info(logger, backend_dir)
else:
    logger.info("=" * 70)
    logger.info("FLASK APP STARTUP - DATABASE CONNECTION CHECK")
    logger.info("=" * 70)
    logger.info(f"Python version: {sys.version}")
    logger.info(f"Working directory: {os.getcwd()}")
    logger.info(f"Backend directory: {backend_dir}")

    db_url = os.getenv("DATABASE_URL")
    if db_url:
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
    
@app.route('/health', methods=['GET'])
def health():
    """Simple health check endpoint for deployments and monitors."""
    try:
        status = {
            'status': 'ok',
            'service': 'NongPlatoo.Ai',
            'version': '1.0',
            'python': sys.version.split()[0],
            'backend_dir': backend_dir,
            'db_env': bool(os.getenv('DATABASE_URL')),
            'model_env': bool(os.getenv('OPENAI_API_KEY')),
            'timestamp': datetime.datetime.now().isoformat(),
        }
        return jsonify(status), 200
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({'status': 'error', 'error': str(e)}), 500

@app.route('/assets/<path:path>')
def send_assets(path):
    found = _find_asset_file(path)
    if found:
        folder, fname = found
        return send_from_directory(folder, fname)
    abort(404)

@app.route('/api/query', methods=['POST'])
def api_query():
    if handle_api_query:
        response_data, status_code = handle_api_query(get_chat_response)
        return jsonify(response_data), status_code
    
    # Fallback implementation
    try:
        data = request.get_json()
        if not data or 'message' not in data:
            return jsonify({'error': 'Message is required'}), 400
        
        user_message = data['message']
        user_id = data.get('user_id', 'default')
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
        logger.error(f"[ERROR] /api/query failed: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/chat', methods=['POST'])
def api_chat():
    if handle_api_chat:
        response_data, status_code = handle_api_chat(chat_with_bot)
        return jsonify(response_data), status_code
    
    # Fallback implementation
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
    if handle_visits:
        response_data, status_code = handle_visits(normalize_path, increment_visit, get_counts)
        return jsonify(response_data), status_code
    
    # Fallback implementation
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
        logger.error(f"[ERROR] /api/visits failed: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/messages', methods=['GET'])
def get_messages():
    """Get conversation history for a user"""
    try:
        from backend.conversation_memory import get_conversation_memory
        
        user_id = request.args.get('user_id', 'default')
        limit = int(request.args.get('limit', 20))
        
        memory = get_conversation_memory()
        history = memory.get_history(user_id, limit=limit)
        
        return jsonify({
            'success': True,
            'messages': history,
            'count': len(history)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/messages/clear', methods=['POST'])
def clear_messages():
    """Clear conversation history for a user"""
    try:
        from backend.conversation_memory import get_conversation_memory
        
        data = request.get_json(silent=True) or {}
        user_id = data.get('user_id', 'default')
        
        memory = get_conversation_memory()
        memory.clear_history(user_id)
        
        return jsonify({
            'success': True,
            'message': 'Conversation history cleared'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/memory/stats', methods=['GET'])
def get_memory_stats():
    """Get conversation memory statistics"""
    try:
        from backend.conversation_memory import get_conversation_memory
        
        memory = get_conversation_memory()
        stats = memory.get_stats()
        
        return jsonify({
            'success': True,
            'stats': stats
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/messages/stream', methods=['POST'])
def post_message_stream():
    """Streaming endpoint for chat responses using Server-Sent Events."""
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

        def generate():
            """Generator function for SSE streaming."""
            try:
                # Import here to avoid circular dependencies
                from backend.chat import TravelChatbot
                from backend.conversation_memory import get_conversation_memory
                
                # Get conversation memory
                memory = get_conversation_memory()
                
                # Get or create chatbot instance
                chatbot = TravelChatbot()
                language = chatbot._detect_language(user_message)
                
                # Get conversation history for this user
                conversation_history = memory.get_history(user_id)
                
                # Classify intent
                intent_classification = chatbot._classify_intent(user_message)
                
                # Send intent classification first
                yield "data: " + json.dumps({'type': 'intent', 'intent_type': intent_classification['intent_type'], 'keywords': intent_classification['keywords'][:3]}, ensure_ascii=False) + "\n\n"
                
                # Get matched data from database
                matched_data = chatbot._match_travel_data(
                    user_message,
                    keywords=intent_classification.get('keywords'),
                )
                
                # Send structured data
                if matched_data:
                    yield "data: " + json.dumps({'type': 'structured_data', 'data': matched_data[:3]}, ensure_ascii=False) + "\n\n"
                
                # Store full assistant response
                assistant_response = ""
                
                # Stream GPT response
                if chatbot.gpt_service:
                    for chunk in chatbot.gpt_service.generate_response_stream(
                        user_query=intent_classification['clean_question'],
                        context_data=matched_data,
                        data_type='travel',
                        intent=intent_classification['intent_type'],
                        intent_type=intent_classification['intent_type'],
                        data_status={
                            'success': bool(matched_data),
                            'data_available': bool(matched_data),
                            'source': 'database',
                        },
                        conversation_history=conversation_history
                    ):
                        if 'chunk' in chunk:
                            assistant_response += chunk['chunk']
                            yield "data: " + json.dumps({'type': 'text', 'text': chunk['chunk']}, ensure_ascii=False) + "\n\n"
                        elif 'done' in chunk:
                            # Save conversation to memory
                            memory.add_message(user_id, "user", user_message)
                            memory.add_message(user_id, "assistant", assistant_response)
                            
                            yield "data: " + json.dumps({'type': 'done', 'language': language}, ensure_ascii=False) + "\n\n"
                        elif 'error' in chunk:
                            yield "data: " + json.dumps({'type': 'error', 'message': chunk['error']}, ensure_ascii=False) + "\n\n"
                else:
                    # Fallback to simple response
                    simple_response = chatbot._create_simple_response(
                        matched_data,
                        language,
                        is_specific_place=intent_classification['intent_type'] == 'specific'
                    )
                    
                    # Save conversation to memory
                    memory.add_message(user_id, "user", user_message)
                    memory.add_message(user_id, "assistant", simple_response)
                    
                    yield "data: " + json.dumps({'type': 'text', 'text': simple_response}, ensure_ascii=False) + "\n\n"
                    yield "data: " + json.dumps({'type': 'done', 'language': language}, ensure_ascii=False) + "\n\n"
                    
            except Exception as e:
                logger.exception("Error in streaming generation")
                yield "data: " + json.dumps({'type': 'error', 'message': str(e)}, ensure_ascii=False) + "\n\n"

        return Response(generate(), mimetype='text/event-stream')

    except Exception as e:
        app.logger.exception("Error in /api/messages/stream")
        return jsonify({
            'success': False,
            'error': True,
            'message': str(e)
        }), 500


@app.route('/api/speech-to-text', methods=['POST'])
def speech_to_text():
    """Convert speech audio to text using OpenAI Whisper API."""
    try:
        # Check if audio file is in request
        if 'audio' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No audio file provided'
            }), 400
        
        audio_file = request.files['audio']
        
        # Check file size (limit to 25MB for Whisper API)
        audio_file.seek(0, 2)  # Seek to end
        file_size = audio_file.tell()
        audio_file.seek(0)  # Reset to beginning
        
        if file_size > 25 * 1024 * 1024:
            return jsonify({
                'success': False,
                'error': 'Audio file too large (max 25MB)'
            }), 400
        
        # Use OpenAI Whisper API
        from openai import OpenAI
        api_key = os.getenv("OPENAI_API_KEY")
        
        if not api_key:
            return jsonify({
                'success': False,
                'error': 'OpenAI API key not configured'
            }), 500
        
        client = OpenAI(api_key=api_key)
        
        # Transcribe audio - convert FileStorage to file-like object
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=(audio_file.filename, audio_file.stream, audio_file.content_type),
            language="th"  # Default to Thai, can be auto-detected
        )
        
        return jsonify({
            'success': True,
            'text': transcript.text,
            'language': 'th'
        })
        
    except Exception as e:
        logger.exception("Error in speech-to-text")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


def clean_text_for_speech(text: str) -> str:
    """Clean text by removing markdown and special formatting while preserving natural speech flow."""
    import re
    
    # Remove markdown bold/italic markers while preserving the text
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)  # **bold**
    text = re.sub(r'\*(.+?)\*', r'\1', text)      # *italic*
    text = re.sub(r'__(.+?)__', r'\1', text)      # __bold__
    text = re.sub(r'_(.+?)_', r'\1', text)        # _italic_
    
    # Remove markdown headers but keep the text with proper spacing
    text = re.sub(r'^#+\s+(.+)$', r'\1. ', text, flags=re.MULTILINE)  # # Header -> Header.
    
    # Convert list markers to natural pauses
    text = re.sub(r'^\s*[-*+]\s+(.+)$', r'\1, ', text, flags=re.MULTILINE)  # - item -> item,
    text = re.sub(r'^\s*\d+\.\s+(.+)$', r'\1, ', text, flags=re.MULTILINE)  # 1. item -> item,
    
    # Remove emojis but add slight pause where they were
    text = re.sub(r'[🏛️🛶🌲🚣🏖️🏔️🌆📍✨🎉🔥⭐✅❌⚠️💎🔑🌐🎯🚀📊🎨🎤🔊]+', ' ', text)
    
    # Remove URLs
    text = re.sub(r'https?://\S+', '', text)
    
    # Remove parentheses but keep the content with commas for natural pauses
    text = re.sub(r'\(([^)]+)\)', r', \1, ', text)
    
    # Convert newlines to natural sentence breaks
    text = re.sub(r'\n\n+', '. ', text)  # Double newlines -> period + space
    text = re.sub(r'\n', ' ', text)      # Single newlines -> space
    
    # Clean up multiple punctuation
    text = re.sub(r'([.!?])\1+', r'\1', text)  # Remove duplicate punctuation
    text = re.sub(r'\s*([.!?,])\s*', r'\1 ', text)  # Normalize spacing around punctuation
    
    # Remove extra commas at end of sentences
    text = re.sub(r',\s*([.!?])', r'\1', text)
    
    # Normalize spaces - ensure single space between words
    text = re.sub(r'\s+', ' ', text)
    
    # Clean up spaces before punctuation
    text = re.sub(r'\s+([.!?,])', r'\1', text)
    
    # Ensure sentences end properly for natural pauses
    if text and not text[-1] in '.!?':
        text += '.'
    
    text = text.strip()
    
    return text


@app.route('/api/text-to-speech', methods=['POST'])
def text_to_speech():
    """Convert text to speech audio using gTTS (free) or Google Cloud TTS for natural Thai voice."""
    try:
        data = request.get_json(silent=True) or {}
        text = data.get('text', '')
        language = data.get('language', 'th')  # Default to Thai
        
        if not text:
            return jsonify({
                'success': False,
                'error': 'Text is required'
            }), 400
        
        # Clean text from markdown and special characters
        cleaned_text = clean_text_for_speech(text)
        
        if not cleaned_text:
            return jsonify({
                'success': False,
                'error': 'No speakable text after cleaning'
            }), 400
        
        import base64
        
        # Option 1: Try gTTS first (FREE, no API key needed, great for Thai)
        try:
            from gtts import gTTS
            import io
            
            # Auto-detect language if not specified
            if language == 'th' or any('\u0e00' <= c <= '\u0e7f' for c in cleaned_text):
                tts_lang = 'th'
            else:
                tts_lang = 'en'
            
            # Generate speech with gTTS using cleaned text
            tts = gTTS(text=cleaned_text, lang=tts_lang, slow=False)
            
            # Save to BytesIO
            audio_io = io.BytesIO()
            tts.write_to_fp(audio_io)
            audio_io.seek(0)
            
            # Convert to base64
            audio_base64 = base64.b64encode(audio_io.read()).decode('utf-8')
            
            return jsonify({
                'success': True,
                'audio': audio_base64,
                'format': 'mp3',
                'provider': 'gtts-free'
            })
            
        except ImportError:
            logger.info("gTTS not available, trying Google Cloud TTS")
        except Exception as gtts_error:
            logger.warning(f"gTTS failed: {gtts_error}, trying Google Cloud TTS")
        
        # Option 2: Try Google Cloud TTS (best quality, requires API key)
        try:
            from google.cloud import texttospeech
            
            client = texttospeech.TextToSpeechClient()
            
            synthesis_input = texttospeech.SynthesisInput(text=cleaned_text)
            
            # Configure voice - use Thai female voice for natural pronunciation
            if language == 'th' or any(ord(c) >= 0x0e00 and ord(c) <= 0x0e7f for c in cleaned_text):
                voice = texttospeech.VoiceSelectionParams(
                    language_code="th-TH",
                    name="th-TH-Standard-A",  # Female voice
                    ssml_gender=texttospeech.SsmlVoiceGender.FEMALE
                )
            else:
                voice = texttospeech.VoiceSelectionParams(
                    language_code="en-US",
                    name="en-US-Neural2-F",
                    ssml_gender=texttospeech.SsmlVoiceGender.FEMALE
                )
            
            # Configure audio output
            audio_config = texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.MP3,
                speaking_rate=1.5,  # Faster speech - average human speed
                pitch=0.0
            )
            
            # Generate speech
            response = client.synthesize_speech(
                input=synthesis_input,
                voice=voice,
                audio_config=audio_config
            )
            
            # Convert to base64 for JSON response
            audio_base64 = base64.b64encode(response.audio_content).decode('utf-8')
            
            return jsonify({
                'success': True,
                'audio': audio_base64,
                'format': 'mp3',
                'provider': 'google-cloud-tts'
            })
            
        except Exception as google_error:
            logger.warning(f"Google Cloud TTS failed: {google_error}, falling back to OpenAI")
            
            # Option 3: Fallback to OpenAI TTS
            from openai import OpenAI
            
            api_key = os.getenv("OPENAI_API_KEY")
            
            if not api_key:
                return jsonify({
                    'success': False,
                    'error': 'No TTS service available. Please install gTTS: pip install gTTS'
                }), 500
            
            client = OpenAI(api_key=api_key)
            
            # Generate speech with OpenAI using cleaned text
            response = client.audio.speech.create(
                model="tts-1",
                voice="nova",
                input=cleaned_text,
                speed=1.4  # Faster speech - average human speed
            )
            
            audio_base64 = base64.b64encode(response.content).decode('utf-8')
            
            return jsonify({
                'success': True,
                'audio': audio_base64,
                'format': 'mp3',
                'provider': 'openai-tts'
            })
        
    except Exception as e:
        logger.exception("Error in text-to-speech")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

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

