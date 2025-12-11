# AI Feedback System - Like/Dislike Feature

## Overview

This system allows users to rate AI responses with "like" or "dislike" feedback. The feedback is stored in the database and can be analyzed to improve AI performance.

## Features

✅ **Like/Dislike Buttons** on every AI response  
✅ **Feedback Storage** with full context (user question, AI answer, intent, source)  
✅ **Analytics Dashboard** to monitor AI performance  
✅ **Automatic Table Creation** on app startup  
✅ **Visual Feedback** - buttons change color when clicked  

## What Was Implemented

### 1. Database Model (`backend/db.py`)

Added `MessageFeedback` table with:
- `message_id` - Unique identifier for each response
- `user_id` - Who gave the feedback
- `user_message` - Original question
- `ai_response` - AI's answer
- `feedback_type` - 'like' or 'dislike'
- `feedback_comment` - Optional comment (for future use)
- `intent` - Detected user intent
- `source` - Response source (GPT, database, etc.)
- `created_at` - Timestamp

### 2. Backend API Endpoints (`app.py`)

**POST /api/feedback**
- Submit like/dislike feedback
- Updates existing feedback if user changes their mind
- Returns success/error status

**GET /api/feedback/stats**
- Get overall satisfaction rate
- Breakdown by source (GPT vs database)
- Breakdown by intent (search, recommend, etc.)
- Recent issues (dislikes with comments)

### 3. Frontend Components

**ChatMessage.tsx**
- Added Like/Dislike buttons
- Visual feedback (green for like, red for dislike)
- Disabled after submission
- Only shows on AI messages (not user messages)

**Chat.tsx**
- Generates unique message IDs
- Passes user message context to AI responses
- Enables feedback tracking

## How It Works

1. **User asks a question**
   - Message gets a unique ID
   - Question is stored

2. **AI responds**
   - Response is linked to the question
   - Like/Dislike buttons appear

3. **User clicks Like or Dislike**
   - Feedback sent to `/api/feedback`
   - Stored with full context
   - Button changes color
   - Cannot change after submission

4. **Admin views analytics**
   - Call `/api/feedback/stats`
   - See satisfaction rates
   - Identify problem areas

## Database Setup

The `message_feedback` table will be **created automatically** when you start the app because `init_db()` is called in `app.py`.

Alternatively, you can create it manually:

```bash
cd backend
python create_feedback_table.py
```

## Testing the Feature

### 1. Start the Backend
```bash
python app.py
```

The table will be created automatically on startup.

### 2. Start the Frontend
```bash
cd frontend
npm run dev
```

### 3. Test in Browser

1. Go to the chat page
2. Ask a question
3. Look for Like/Dislike buttons below AI response
4. Click one - it should change color
5. Try clicking again - buttons should be disabled

### 4. Check Analytics

In your browser or Postman:
```
GET http://localhost:8000/api/feedback/stats
```

Response example:
```json
{
  "success": true,
  "stats": {
    "total_feedback": 10,
    "likes": 8,
    "dislikes": 2,
    "satisfaction_rate": 80.0,
    "by_source": [
      {"source": "gpt", "feedback_type": "like", "count": 5},
      {"source": "database", "feedback_type": "like", "count": 3}
    ],
    "by_intent": [
      {"intent": "search", "feedback_type": "like", "count": 4}
    ],
    "recent_issues": []
  }
}
```

## Future Enhancements

You can add:

1. **Comment Box** - Ask why they disliked it
2. **Dashboard Page** - Visual charts of feedback
3. **Email Alerts** - Notify when satisfaction drops
4. **A/B Testing** - Test different AI responses
5. **Auto-Improvement** - Use feedback to fine-tune prompts

## Example: Adding a Comment Field

To add a comment when users dislike:

1. Update `ChatMessage.tsx` to show a text input when dislike is clicked
2. Send the comment in the feedback payload
3. It's already stored in `feedback_comment` field!

## Troubleshooting

**Buttons not showing?**
- Check that `messageId` is being passed to `ChatMessage`
- Check browser console for errors

**Feedback not saving?**
- Check `/api/feedback` endpoint is working
- Check database connection
- Look at backend console logs

**Database connection timeout?**
- The table will be created when the app starts
- No manual migration needed if the app can connect

## API Reference

### Submit Feedback
```
POST /api/feedback
Content-Type: application/json

{
  "message_id": "1234567890",
  "user_id": "web",
  "user_message": "Where can I eat?",
  "ai_response": "Here are some restaurants...",
  "feedback_type": "like",
  "intent": "search_food",
  "source": "gpt"
}
```

### Get Stats
```
GET /api/feedback/stats
```

## Files Modified

- ✅ `backend/db.py` - Added MessageFeedback model
- ✅ `app.py` - Added /api/feedback and /api/feedback/stats endpoints
- ✅ `frontend/src/components/ChatMessage.tsx` - Added like/dislike UI
- ✅ `frontend/src/pages/Chat.tsx` - Pass message IDs and context
- ✅ `backend/create_feedback_table.py` - Migration script (optional)

## Next Steps

1. **Test the feature** - Ask questions and give feedback
2. **Monitor analytics** - Check `/api/feedback/stats`
3. **Use insights** - Improve prompts based on dislikes
4. **Add more features** - Comments, charts, alerts

Your AI chatbot now learns from user feedback! 🎉
