# 🎤 Thai TTS Quick Start

## ⚡ Super Quick Setup (30 seconds)

```powershell
# 1. Install gTTS (FREE - no API key needed)
pip install gTTS

# 2. Test it works
python test_tts.py

# 3. Restart your server
python app.py
```

Done! Your chatbot now speaks Thai naturally! 🎉

---

## 🎯 What You Get

- ✅ **FREE** Thai text-to-speech
- ✅ **Natural** female voice
- ✅ **No API keys** required
- ✅ **Easy** one-command setup
- ✅ **Works immediately**

---

## 🔊 How to Use

### In the Chat Interface

1. Type a message in Thai
2. Get AI response
3. Click the 🔊 speaker icon
4. Listen to natural Thai voice!

The TTS icon appears next to every AI message.

---

## 🧪 Test TTS

```powershell
# Test all TTS services
python test_tts.py
```

This will show you which TTS services are available and working.

---

## 📊 TTS Priority System

Your app automatically uses the best available TTS:

1. **gTTS** (FREE) - Tries first ⭐
2. **Google Cloud TTS** - If configured 💎
3. **OpenAI TTS** - If API key set 🔑
4. **Browser TTS** - Last resort 🌐

Install gTTS and you're good to go!

---

## 🎛️ Voice Quality Comparison

| Service | Sound Quality | Setup Time | Cost |
|---------|--------------|------------|------|
| gTTS | ⭐⭐⭐⭐ Good | 1 min | FREE |
| Google Cloud | ⭐⭐⭐⭐⭐ Excellent | 10 min | $4/1M |
| OpenAI | ⭐⭐⭐ OK | 2 min | $15/1M |
| Browser | ⭐⭐ Varies | 0 min | FREE |

**Recommendation**: Start with **gTTS** - it's perfect for Thai!

---

## 🚀 Advanced Setup (Optional)

### For Better Quality: Google Cloud TTS

Only if you want the absolute best quality:

```powershell
# 1. Run setup script
./setup-tts.ps1

# 2. Follow instructions to get API key
# 3. Set GOOGLE_APPLICATION_CREDENTIALS
```

See `TTS_SETUP.md` for detailed instructions.

---

## 🎨 Customization

Want to adjust the voice? Edit `backend/configs/tts.json`:

```json
{
  "google_cloud": {
    "speaking_rate": 1.1,  // Faster
    "pitch": 2.0          // Higher pitch
  }
}
```

---

## ❓ Troubleshooting

### No sound playing?

```powershell
# Check if gTTS is installed
pip list | Select-String "gTTS"

# If not found, install it
pip install gTTS

# Restart server
```

### Want to test manually?

```python
from gtts import gTTS
tts = gTTS('สวัสดีค่ะ', lang='th')
tts.save('test.mp3')
# Play test.mp3
```

---

## 📚 More Info

- Full setup guide: `TTS_SETUP.md`
- Configuration: `backend/configs/tts.json`
- Test script: `python test_tts.py`

---

## 🎉 That's It!

Your Thai chatbot can now speak naturally. Enjoy! 🐟✨
