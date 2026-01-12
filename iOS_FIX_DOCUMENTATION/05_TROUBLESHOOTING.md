# 🆘 TROUBLESHOOTING GUIDE

Quick solutions for common problems.

---

## Problem: App Still Slow (>5 seconds response)

### Symptoms
- Response time still 8+ seconds
- Doesn't match expected 2-5 seconds
- Users complaining

### Root Causes to Check

**1. Cache not activated**
```bash
# Check for cache hits
docker logs web | grep "Cache HIT" | wc -l
docker logs web | grep "Cache MISS" | wc -l

# Result:
# If MISS count is high and HIT count is low → Cache not working
```

**2. Singleton not initialized**
```bash
# Check singleton
docker logs web | grep "singleton"

# Expected:
# [INFO] ✓ Chatbot singleton initialized

# If missing:
# [ERROR] ✗ Failed to initialize chatbot singleton
```

**3. Database too slow**
```bash
# Check database query time
docker logs web | grep "query" | grep "time" | tail -5

# If times are >3 seconds → Database problem
```

**4. iOS not sending request_id**
```bash
# Check if request_id present
docker logs web | grep "request_id" | head -5

# If none found → iOS not sending request_id
```

### Solutions

**If cache not working**:
1. Restart server: `docker compose restart web`
2. Verify iOS sending request_id
3. Check for errors: `docker logs web | grep ERROR`

**If singleton failing**:
```bash
docker logs web
# Look for database connection errors
# Verify database is running: docker ps | grep postgres
```

**If database slow**:
```bash
# Check database performance
# Restart database: docker compose restart db
```

---

## Problem: Database Connections Still High (>30)

### Symptoms
- Still seeing 50+ connections
- Should be <20 after fix
- Not seeing improvement

### Root Causes

**1. Old code still running**
```bash
# Check if code actually deployed
git log --oneline | head -1
# Should show recent commit with iOS fix

# Check file modified time
stat app.py
# Should be recent (today)
```

**2. Container not restarted**
```bash
# Verify which container running
docker ps | grep web

# Check image built time
docker inspect <container_id> | grep Created
# Should be recent
```

**3. Multiple instances still created**
```bash
# Check logs
docker logs web | grep "instance\|created"

# Should see: Only ONE instance created
# Not: Multiple instances
```

### Solutions

**Redeploy code**:
```bash
git pull origin main
docker compose restart web
```

**Rebuild container**:
```bash
docker compose down
docker compose up -d web
```

**Force clean restart**:
```bash
docker compose stop web
docker container prune -f
docker image prune -f
docker compose up -d web
```

---

## Problem: Memory Growing Over Time

### Symptoms
- Memory starts at 100MB
- Grows to 200MB+ over hours
- Should stay stable

### Root Causes

**1. Cache not cleaning up**
```bash
# Check cache sizes
docker logs web | grep "cache" | grep "size\|entries" | tail -10

# If showing growing numbers → Cache growing
```

**2. Memory leak in connection**
```bash
# Monitor over time
watch -n 5 'docker stats web'
# Watch for steady increase
```

**3. Conversation history growing**
```bash
# Check conversation memory
docker logs web | grep "conversation\|memory\|size" | tail -10
```

### Solutions

**Increase cache cleanup frequency**:
Edit `app.py`, increase cleanup calls

**Restart periodically**:
```bash
# Add cron job to restart daily
0 2 * * * docker compose restart web
```

**Monitor memory**:
```bash
docker stats web --no-stream
# If >300MB, restart
```

---

## Problem: iOS App Still Crashing

### Symptoms
- App still crashes after deployment
- Still seeing timeouts
- Still hanging

### Root Causes

**1. iOS not sending request_id**
```bash
# Check server logs
docker logs web | grep "request_id" | head -5

# If none found → iOS not updating
```

**2. iOS timeout still too short**
```swift
// In iOS app, check:
request.timeoutInterval  // Should be 120 (2 minutes), not 30
```

**3. iOS not handling heartbeat**
```bash
# Check heartbeat events
docker logs web | grep "heartbeat" | wc -l

# If many → heartbeats sent
# If iOS crashes anyway → Not handling them
```

**4. Server side issue**
```bash
# Check for errors
docker logs web | grep ERROR | tail -10

# Check streaming working
curl -X POST http://localhost:5000/api/messages/stream \
  -H "Content-Type: application/json" \
  -d '{"text":"test","user_id":"test1","request_id":"test1"}'
```

### Solutions

**Update iOS app**:
1. Add request_id generation
2. Handle heartbeat events
3. Increase timeout to 120s

See [03_iOS_IMPLEMENTATION_GUIDE.md](03_iOS_IMPLEMENTATION_GUIDE.md)

**Verify server working**:
```bash
# Manual test
curl -v -X POST http://localhost:5000/api/messages/stream \
  -H "Content-Type: application/json" \
  -d '{"text":"What is Python?","user_id":"test","request_id":"'$(uuidgen)'"}'

# Should get response in 2-5 seconds
```

---

## Problem: Duplicate Request Errors (409)

### Symptoms
- Getting HTTP 409 errors
- "Request already processing" message
- Normal behavior getting interrupted

### Root Cause
This is actually **expected behavior**. The fix includes request deduplication.

**409 means**: Server is already processing this request, don't send again

### Solution

**If too frequent**:
```bash
# Check if request_id being reused
docker logs web | grep "409" | head -5

# Each request should have UNIQUE request_id
```

**Proper handling in iOS**:
```swift
if response.statusCode == 409 {
    // Expected: Request already processing
    // Wait for response from original request
    // Don't send duplicate
}
```

---

## Problem: Database Connection Refused

### Symptoms
- Error: "Connection refused"
- Can't connect to database
- Error in logs

### Root Causes

**1. Database not running**
```bash
docker ps | grep postgres
# Should show postgres container running
```

**2. Connection string wrong**
```bash
# Check app.py
grep "DATABASE" app.py
grep "postgresql" app.py

# Should point to correct database
```

**3. Database credentials wrong**
```bash
# Check environment
docker compose config | grep DB_
# Verify credentials correct
```

### Solutions

**Check database running**:
```bash
docker compose ps
# Should show db service running
```

**Restart database**:
```bash
docker compose restart db
```

**Check connection string**:
```bash
grep "create_engine\|SQLALCHEMY_DATABASE" app.py
# Verify format: postgresql://user:pass@host:port/dbname
```

---

## Problem: High CPU Usage (>50%)

### Symptoms
- CPU at 50-80% for low load
- Should be 20-35%
- Server sluggish

### Root Causes

**1. Database queries slow**
```bash
# Check query times
docker logs web | grep "query" | grep "ms"
# If >500ms queries → Database slow
```

**2. AI processing slow**
```bash
# Check AI times
docker logs web | grep "gpt\|openai" | grep "time"
# If >5s → GPT slow (network or service)
```

**3. Memory pressure**
```bash
# Check memory usage
docker stats web
# If >200MB → Memory swapping, slowing down
```

### Solutions

**Optimize database**:
```bash
# Add indexes to frequent queries
# See database documentation
```

**Check AI service**:
```bash
# Verify OpenAI API working
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

**Restart to clear memory**:
```bash
docker compose restart web
```

---

## Problem: Users Not Seeing Cache Benefits

### Symptoms
- Response still slow for repeated queries
- Cache showing 0 hits
- Not seeing expected improvement

### Root Causes

**1. Different user_id each time**
```bash
# Cache key is: user_id + query
# If user_id changes → Cache misses

docker logs web | grep "cache_key"
# Should see same keys appearing multiple times
```

**2. Query different each time**
```bash
# Even small differences break cache
# "temples" vs "Temples" (case)
# "what temples" vs "temples" (word order)

# Should normalize queries
```

**3. Cache TTL too short**
```bash
# Cache lasts 30 seconds
# If requests > 30s apart → Always miss

# Check in app.py:
_CACHE_TTL = 30

# Can increase if needed
```

### Solutions

**Verify cache working**:
```bash
# Send same query twice quickly
for i in {1..2}; do
  curl -X POST http://localhost:5000/api/messages/stream \
    -H "Content-Type: application/json" \
    -d '{"text":"temples","user_id":"testuser","request_id":"'$(uuidgen)'"}'
  echo "Wait 2 seconds..."
  sleep 2
done

# Should see: First MISS, Second HIT
```

**Check logs**:
```bash
docker logs web | tail -30 | grep -i cache
```

---

## Debug Mode

### Enable Detailed Logging

Add to `app.py` near top:
```python
import logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

Restart:
```bash
docker compose restart web
```

Now logs will show more details.

### Monitor Live

```bash
# Terminal 1: Watch logs
docker logs -f web

# Terminal 2: Send test requests
curl -X POST http://localhost:5000/api/messages/stream \
  -H "Content-Type: application/json" \
  -d '{"text":"test","user_id":"test","request_id":"'$(uuidgen)'"}'
```

### Check Everything

```bash
# Health
curl http://localhost:5000/health

# Singleton
docker logs web | grep singleton

# Cache
docker logs web | grep "Cache"

# Connections
docker logs web | grep "connection"

# Errors
docker logs web | grep ERROR

# Memory
docker stats web --no-stream

# All at once
echo "=== HEALTH ===" && curl -s http://localhost:5000/health && \
echo "=== SINGLETON ===" && docker logs web 2>/dev/null | grep singleton | tail -1 && \
echo "=== CACHE HITS ===" && docker logs web 2>/dev/null | grep -c "Cache HIT" && \
echo "=== CACHE MISSES ===" && docker logs web 2>/dev/null | grep -c "Cache MISS"
```

---

## When All Else Fails

### Complete Rollback

```bash
# Undo changes
git revert HEAD

# Rebuild
docker compose down
docker container prune -f
docker image prune -f

# Restart
docker compose up -d web

# Verify
curl http://localhost:5000/health
```

### Fresh Start

```bash
# Delete all
docker compose down -v

# Rebuild from scratch
docker compose build --no-cache
docker compose up -d

# Verify
curl http://localhost:5000/health
```

---

## Contact Support

If still stuck:
1. Save logs: `docker logs web > logs.txt`
2. Save stats: `docker stats web > stats.txt`
3. Note exact error message
4. Include this troubleshooting log

See [FAQ.md](FAQ.md) for more help.
