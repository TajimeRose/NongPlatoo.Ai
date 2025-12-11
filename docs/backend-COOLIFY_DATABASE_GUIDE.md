# Coolify Deployment - Database Troubleshooting Guide

## Overview

This guide helps you diagnose database issues when deploying to Coolify. All database checks are logged so you can see exactly what's happening.

## Automatic Database Checks on Startup

When the Flask app starts, it now performs automatic database checks and logs them. You can see this in the Coolify Logs tab:

```
[2025-12-07 12:00:00] ==================== FLASK APP STARTUP ====================
[2025-12-07 12:00:00] FLASK APP STARTUP - DATABASE CONNECTION CHECK
[2025-12-07 12:00:00] Python version: 3.13.7
[2025-12-07 12:00:00] Working directory: /app
[2025-12-07 12:00:00] Backend directory: /app/backend
[2025-12-07 12:00:00] ✓ DATABASE_URL is set: postgresql://postgres:****:****@host:port/db
[2025-12-07 12:00:00] ✓ POSTGRES_HOST: 38.242.132.39
[2025-12-07 12:00:00] ✓ POSTGRES_PORT: 8900
[2025-12-07 12:00:00] ✓ POSTGRES_DB: postgres
[2025-12-07 12:00:00] [INFO] Initializing database...
[2025-12-07 12:00:02] ✓ Database initialized successfully
[2025-12-07 12:00:02] [INFO] Starting Flask server on 0.0.0.0:8000...
```

## Health Check Endpoints

### `/health` - Full Health Status
Shows database connection status:

```bash
curl https://your-domain.com/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-07T12:00:00.000000",
  "database": {
    "status": "connected",
    "message": "Database connection successful"
  }
}
```

### `/debug/db-info` - Database Configuration
Shows what database variables are set (password masked):

```bash
curl https://your-domain.com/debug/db-info
```

Response:
```json
{
  "database_url": "postgresql://postgres:****:****@38.242.132.39:8900/postgres",
  "postgres_host": "38.242.132.39",
  "postgres_port": "8900",
  "postgres_db": "postgres",
  "postgres_user": "postgres",
  "environment": "production",
  "note": "This endpoint should be disabled in production"
}
```

## Coolify Environment Variables - Checklist

Make sure these are set in Coolify Configuration:

- [ ] `DATABASE_URL` = `postgresql://postgres:PASSWORD@38.242.132.39:8900/postgres`
  - **Important**: Must NOT have `DATABASE_URL=` as part of the value, just the URL itself
- [ ] `OPENAI_API_KEY` = Your OpenAI API key
- [ ] `POSTGRES_HOST` = `38.242.132.39`
- [ ] `POSTGRES_PORT` = `8900`
- [ ] `POSTGRES_DB` = `postgres`
- [ ] `POSTGRES_USER` = `postgres`
- [ ] `POSTGRES_PASSWORD` = Your password

## Common Issues and Solutions

### Issue 1: Connection Timeout
**Error in logs:**
```
psycopg2.OperationalError: connection to server at "38.242.132.39", port 8900 failed:
Connection timed out
```

**Solutions:**
1. Check if database server is running
2. Check firewall rules - allow Coolify server IP access to port 8900
3. Check if IP whitelist includes Coolify's IP address
4. Verify credentials in DATABASE_URL are correct

### Issue 2: Connection Refused
**Error in logs:**
```
psycopg2.OperationalError: connection to server at "38.242.132.39", port 8900 failed:
Connection refused
```

**Solutions:**
1. Database server is down - restart it
2. Wrong port number - check POSTGRES_PORT
3. Database not accepting connections - check database logs

### Issue 3: Authentication Failed
**Error in logs:**
```
psycopg2.OperationalError: FATAL: password authentication failed for user "postgres"
```

**Solutions:**
1. Check DATABASE_URL has correct password
2. Check POSTGRES_PASSWORD is correct
3. Reset database password if needed
4. Make sure password doesn't contain special characters that need escaping

### Issue 4: Database Not Found
**Error in logs:**
```
psycopg2.OperationalError: FATAL: database "postgres" does not exist
```

**Solutions:**
1. Check POSTGRES_DB is set correctly
2. Create the database if it doesn't exist
3. Verify database name is correct

## Testing Database Connection

### Option 1: Use Health Check Endpoint
```bash
curl https://your-domain.com/health
```

If you see `"database": {"status": "connected"}`, database is working!

### Option 2: Manual Test Script
In Coolify, open Terminal and run:

```bash
cd /app/backend
python test_db_detailed.py
```

This will run 7 database tests and show which ones pass/fail.

### Option 3: Check Coolify Logs
1. Go to Coolify dashboard
2. Click on your application
3. Go to "Logs" tab
4. Look for database-related messages at startup

## Database Tables

Your app creates/uses these tables automatically:

1. **places** - Tourism data
2. **tourist_places** - Thai tourist attractions
3. **message_feedback** - User likes/dislikes (NEW!)

All tables are created automatically by `init_db()` on startup.

## Like/Dislike Feedback System

The `message_feedback` table stores:
- User feedback (like/dislike)
- Original question and AI response
- Detection intent and response source
- Timestamp

**Columns:**
```
- id (integer, primary key)
- message_id (string, unique)
- user_id (string)
- user_message (text)
- ai_response (text)
- feedback_type (string: 'like' or 'dislike')
- feedback_comment (text)
- intent (string)
- source (string)
- created_at (timestamp)
```

## Monitoring Feedback

View feedback stats:
```bash
curl https://your-domain.com/api/feedback/stats
```

Response shows:
- Total feedback count
- Number of likes/dislikes
- Satisfaction rate percentage
- Breakdown by source (GPT vs database)
- Recent issues/dislikes

## Deployment Checklist

Before deploying to Coolify:

- [ ] All environment variables are set correctly
- [ ] DATABASE_URL format is correct (no `DATABASE_URL=` prefix)
- [ ] Database server is accessible from Coolify
- [ ] Database credentials are correct
- [ ] Firewall allows connection to port 8900
- [ ] Run `python test_db_detailed.py` locally and verify it works
- [ ] Check `/health` endpoint returns "connected"

## After Deployment

1. Check Coolify Logs for database initialization messages
2. Test `/health` endpoint to confirm database connection
3. Test `/api/feedback/stats` to verify database access works
4. Start using the chat and giving feedback - should all work!

## Getting Help

If you see database errors in Coolify logs:

1. Check the specific error message
2. Match it to the "Common Issues" section above
3. Try the suggested solutions
4. Run `test_db_detailed.py` to diagnose locally
5. Check database server logs on your database host

Remember: The app logs everything, so the Coolify Logs tab will show you exactly what went wrong!
