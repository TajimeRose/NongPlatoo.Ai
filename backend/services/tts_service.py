"""
Alternative TTS service using gTTS (Google Text-to-Speech - Free)
No API key required, perfect for Thai language
"""

from gtts import gTTS
import io
import base64


def generate_thai_speech(text: str, lang: str = 'th') -> dict:
    """
    Generate speech using Google Text-to-Speech (free service)
    
    Args:
        text: Text to convert to speech
        lang: Language code (default: 'th' for Thai)
    
    Returns:
        dict with success status and audio data
    """
    try:
        # Create gTTS object
        tts = gTTS(text=text, lang=lang, slow=False)
        
        # Save to BytesIO object instead of file
        audio_io = io.BytesIO()
        tts.write_to_fp(audio_io)
        audio_io.seek(0)
        
        # Convert to base64
        audio_base64 = base64.b64encode(audio_io.read()).decode('utf-8')
        
        return {
            'success': True,
            'audio': audio_base64,
            'format': 'mp3',
            'provider': 'gtts'
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def is_thai_text(text: str) -> bool:
    """Check if text contains Thai characters"""
    return any('\u0e00' <= char <= '\u0e7f' for char in text)
