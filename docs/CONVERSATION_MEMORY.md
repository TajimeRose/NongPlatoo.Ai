# Conversation Memory System

## Overview
The AI chatbot now has **short-term conversation memory** that allows it to remember past questions and provide contextual responses.

## How It Works

### Memory Storage
- **In-Memory Storage**: Conversations are stored in RAM (fast, no database required)
- **Per-User Tracking**: Each user has their own conversation history
- **Auto-Cleanup**: Conversations automatically expire after 30 minutes of inactivity

### Memory Limits
- **Messages per User**: Keeps last 10 exchanges (20 messages total)
- **TTL**: 30 minutes (1800 seconds)
- **Sent to OpenAI**: Last 10 messages maximum to stay within token limits

### What the AI Can Remember
✅ Previous questions in the same conversation
✅ Places you've asked about
✅ Context from earlier in the chat
✅ Follow-up questions references

### What the AI Cannot Remember
❌ Conversations from different sessions (after 30 min timeout)
❌ Other users' conversations
❌ Conversations after server restart (stored in memory only)

## API Endpoints

### 1. Get Conversation History
```bash
GET /api/messages?user_id=USER_ID&limit=20
```
Returns the conversation history for a user.

**Response:**
```json
{
  "success": true,
  "messages": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ],
  "count": 10
}
```

### 2. Clear Conversation History
```bash
POST /api/messages/clear
Content-Type: application/json

{
  "user_id": "USER_ID"
}
```
Clears all conversation history for a user (starts fresh).

**Response:**
```json
{
  "success": true,
  "message": "Conversation history cleared"
}
```

### 3. Memory Statistics
```bash
GET /api/memory/stats
```
Get system-wide memory statistics.

**Response:**
```json
{
  "success": true,
  "stats": {
    "active_conversations": 5,
    "total_messages": 47,
    "max_messages_per_user": 10,
    "ttl_seconds": 1800
  }
}
```

## Example Conversation

**User:** "แนะนำที่เที่ยวสมุทรสงครามหน่อย"
**AI:** "แนะนำตลาดน้ำอัมพวา วัดบางกุ้ง และคลองโคน 3 ที่นี้เด็ดมากค่ะ 😊"

**User:** "ที่แรกเปิดกี่โมง" ← AI จำได้ว่า "ที่แรก" คือตลาดน้ำอัมพวา
**AI:** "ตลาดน้ำอัมพวาเปิดศุกร์-อาทิตย์ ช่วงบ่าย 4-5 โมงค่ะ 🛶"

## Configuration

Edit `backend/configs/memory.json` to adjust settings:

```json
{
  "conversation_memory": {
    "enabled": true,
    "max_messages_per_user": 10,
    "ttl_seconds": 1800
  }
}
```

### Parameters:
- `max_messages_per_user`: Number of message pairs to keep (default: 10)
- `ttl_seconds`: Conversation expiry time in seconds (default: 1800 = 30 min)

## Technical Details

### Files Modified/Created:
1. **`backend/conversation_memory.py`** - Core memory management
2. **`backend/gpt_service.py`** - Updated to accept conversation history
3. **`app.py`** - Streaming endpoint now uses memory
4. **`backend/configs/memory.json`** - Configuration file
5. **`backend/configs/prompts/chatbot/system.json`** - Updated to acknowledge memory

### Integration Points:
- **Streaming API** (`/api/messages/stream`): Automatically includes history
- **GPT Service**: Accepts `conversation_history` parameter
- **Memory Manager**: Singleton instance manages all conversations

## Usage in Code

```python
from backend.conversation_memory import get_conversation_memory

# Get memory instance
memory = get_conversation_memory()

# Get user's history
history = memory.get_history(user_id="user123")

# Add message
memory.add_message(user_id="user123", role="user", content="Hello")
memory.add_message(user_id="user123", role="assistant", content="Hi there!")

# Clear history
memory.clear_history(user_id="user123")

# Get stats
stats = memory.get_stats()
```

## Benefits

✨ **Better Context**: AI understands follow-up questions
✨ **Natural Conversation**: No need to repeat information
✨ **Efficient**: Only sends relevant history to OpenAI
✨ **Auto-Cleanup**: No manual memory management needed
✨ **Scalable**: Per-user isolation and automatic expiry

## Limitations

⚠️ **In-Memory Only**: Lost on server restart
⚠️ **No Persistence**: Not saved to database
⚠️ **TTL Based**: Expires after 30 minutes
⚠️ **Token Limits**: Only last 10 messages sent to OpenAI

## Future Enhancements

🔮 Optional database persistence
🔮 Configurable TTL per user
🔮 Summary generation for long conversations
🔮 Cross-session memory (if user logs in)
