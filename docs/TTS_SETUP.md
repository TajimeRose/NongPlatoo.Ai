# Thai Text-to-Speech (TTS) Setup Guide

## 🎯 Quick Start (Recommended - FREE!)

The easiest way to get natural Thai voice for your chatbot:

```powershell
# Install gTTS (Google Text-to-Speech - FREE)
pip install gTTS
```

That's it! No API keys needed. Restart your server and Thai TTS will work automatically.

---

## 🔊 TTS Options Comparison

| Service | Cost | Quality | Setup | Thai Support |
|---------|------|---------|-------|--------------|
| **gTTS** ⭐ | FREE | Good | Easy (1 command) | ✅ Excellent |
| Google Cloud TTS | $4/1M chars | Excellent | Medium (API key) | ✅ Native |
| OpenAI TTS | $15/1M chars | Good | Easy (API key) | ⚠️ Accented |
| Browser TTS | FREE | Varies | Auto | ⚠️ Browser-dependent |

**Recommendation**: Use **gTTS** - it's free and sounds great for Thai!

---

## 🚀 Installation Options

### Option 1: gTTS (Recommended - FREE)

#### What is gTTS?
- FREE Google Text-to-Speech library
- No API key required
- Excellent Thai pronunciation  
- Works by accessing Google Translate's TTS service
- Perfect for production use

#### Installation

```powershell
# Install via PowerShell
./install-tts.ps1

# Or manually
pip install gTTS
```

#### Test it

```python
from gtts import gTTS
tts = gTTS('สวัสดีค่ะ น้องปลาทู', lang='th')
tts.save('test.mp3')
```

#### ✅ Pros
- Completely FREE
- No API keys needed
- Natural Thai female voice
- Easy to install (one command)
- Reliable and stable

#### ⚠️ Cons
- Requires internet connection
- Slightly slower than premium services (1-2 seconds)
- Limited voice customization

---

### Option 2: Google Cloud TTS (Premium Quality)

For the best possible Thai voice quality:

#### Setup Steps

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create new project
   - Enable "Cloud Text-to-Speech API"

2. **Create Service Account**
   ```bash
   # Navigate to IAM & Admin > Service Accounts
   # Create Service Account
   # Grant role: "Cloud Text-to-Speech User"
   # Create and download JSON key
   ```

3. **Set Environment Variable**
   ```powershell
   # PowerShell
   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\service-account.json"
   
   # Or add to .env file
   GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\service-account.json
   ```

4. **Install Package**
   ```powershell
   pip install google-cloud-texttospeech
   ```

#### Available Voices
- `th-TH-Standard-A` - Female, clear
- `th-TH-Neural2-C` - Female, more expressive

#### Pricing
- FREE: 1 million characters/month
- PAID: $4 per 1 million characters

---

### Option 3: OpenAI TTS (Fallback)

Uses your existing OpenAI API key:

```env
OPENAI_API_KEY=sk-your-key-here
```

Pricing: $15 per 1 million characters

---

## 🎛️ How It Works

The app uses a **cascading fallback** system:

```
1. Try gTTS (FREE) ✅
   ↓ (if fails)
2. Try Google Cloud TTS 
   ↓ (if fails)
3. Try OpenAI TTS
   ↓ (if fails)
4. Use Browser TTS (client-side)
```

This ensures TTS always works, even without any API keys!

---

## 📝 Configuration

Edit `backend/configs/tts.json`:

```json
{
  "provider": "gtts",  // Options: "gtts", "google-cloud", "openai"
  "google_cloud": {
    "voice_name": "th-TH-Standard-A",
    "speaking_rate": 1.0,
    "pitch": 0.0
  },
  "settings": {
    "auto_detect_language": true
  }
}
```

---

## 🧪 Testing

### Test via API

```powershell
$body = @{
    text = "สวัสดีค่ะ น้องปลาทูยินดีต้อนรับค่ะ"
    language = "th"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/api/text-to-speech" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

### Test in Browser

1. Start server: `python app.py`
2. Go to chat page
3. Click the speaker icon 🔊 next to any message

---

## 🎨 Voice Customization

### For gTTS (Simple)

```python
from gtts import gTTS

# Slow speech (better for learning)
tts = gTTS('สวัสดีค่ะ', lang='th', slow=True)

# Normal speed (default)
tts = gTTS('สวัสดีค่ะ', lang='th', slow=False)
```

### For Google Cloud TTS (Advanced)

Adjust in `app.py`:

```python
audio_config = texttospeech.AudioConfig(
    speaking_rate=1.1,  # Faster: 0.25 to 4.0
    pitch=2.0,          # Higher pitch: -20.0 to 20.0
    volume_gain_db=0.0  # Louder: -96.0 to 16.0
)
```

---

## 🐛 Troubleshooting

### "gTTS not installed"
```powershell
pip install gTTS
```

### "Network error" with gTTS
- Check internet connection
- gTTS requires internet to generate audio
- Audio is cached in browser after first generation

### Audio not playing in browser
- Check browser console for errors
- Try different browser (Chrome recommended)
- Ensure pop-ups/autoplay not blocked

### "No TTS service available"
- Install gTTS: `pip install gTTS`
- Or set `OPENAI_API_KEY` in `.env`

---

## 📊 Performance Tips

1. **Enable caching** - Responses are cached in frontend
2. **Shorten text** - Split long responses for faster audio
3. **Preload common phrases** - Generate frequently used greetings
