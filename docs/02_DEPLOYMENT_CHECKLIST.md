# 📋 DEPLOYMENT CHECKLIST

Complete this checklist to deploy safely.

---

## Pre-Deployment (Review)

- [ ] Read [01_DEPLOYMENT_QUICK_START.md](01_DEPLOYMENT_QUICK_START.md)
- [ ] Verify code changes in `app.py` (lines 108-560)
- [ ] Confirm all tests pass (11/11 ✅)
- [ ] Backup database (optional, code changes are read-only)
- [ ] Notify team of planned deployment

---

## Deployment Steps

### Step 1: Code Preparation (2 minutes)

```bash
# Navigate to project
cd c:\Users\Tuchtuntan\Desktop\World.Journey.Ai

# Verify current branch
git branch
# Should show: * main (or your active branch)

# Pull latest code
git pull origin main

# Verify the changes
git diff app.py | head -30
# Should show iOS fix additions
```

**Checklist**:
- [ ] Code pulled successfully
- [ ] No conflicts
- [ ] app.py shows new lines (108-145 and 397-560)

---

### Step 2: Docker Restart (2 minutes)

```bash
# Verify Docker is running
docker ps
# Should show running containers

# Restart web service
docker compose restart web

# Wait for startup
timeout /t 3

# Verify running
docker ps | grep web
# Should show: web service running
```

**Checklist**:
- [ ] Docker restarted
- [ ] Service came up
- [ ] No errors in startup

---

### Step 3: Verification (3 minutes)

```bash
# Test health endpoint
curl http://localhost:5000/health
# Should return: {"status": "ok"}

# Check logs for initialization
docker logs web | grep "singleton"
# Should contain: "✓ Chatbot singleton initialized"

# Look for errors
docker logs web | grep ERROR
# Should be empty or normal errors
```

**Checklist**:
- [ ] Health endpoint responds
- [ ] Singleton initialization logged
- [ ] No new errors in logs

---

### Step 4: Functionality Test (3 minutes)

```bash
# Send test request
curl -X POST http://localhost:5000/api/messages/stream \
  -H "Content-Type: application/json" \
  -d '{
    "text": "What temples are in Bangkok?",
    "user_id": "test_user_123",
    "request_id": "test_req_001"
  }'

# Expected:
# - Response in 2-5 seconds
# - JSON data streamed
# - No errors
```

**Checklist**:
- [ ] Request completed successfully
- [ ] Response time 2-5 seconds
- [ ] Valid JSON returned
- [ ] No errors

---

### Step 5: Performance Check (2 minutes)

```bash
# Check database connections
docker exec -it web ps aux | grep -i postgres
# Should show: <20 connections (was 50-200)

# Monitor memory
docker stats web
# Should show: ~100MB (was 500MB+)

# Check for cache activity
docker logs web | tail -30 | grep -i cache
# Should see: Cache HIT/MISS messages
```

**Checklist**:
- [ ] Connections low (<20)
- [ ] Memory stable (~100MB)
- [ ] Cache messages appearing in logs

---

## Post-Deployment (Monitoring)

### Hour 1: Active Monitoring
```bash
# Watch logs continuously
docker logs -f web

# Send multiple test requests
for i in {1..5}; do
  curl -X POST http://localhost:5000/api/messages/stream \
    -H "Content-Type: application/json" \
    -d '{"text":"test","user_id":"user'$i'","request_id":"req'$i'"}'
done
```

**Checklist**:
- [ ] All requests completing
- [ ] No new errors
- [ ] Response times consistent

---

### Day 1: Verification
```bash
# Check daily metrics
docker logs web | wc -l
# Logs should be normal volume

# Look for patterns
docker logs web | grep "Cache HIT" | wc -l
# Should be ~70% of requests

# Check for issues
docker logs web | grep -i error | wc -l
# Should be minimal
```

**Checklist**:
- [ ] No error spike
- [ ] Cache hit rate ~70%
- [ ] Users report app working
- [ ] Response times 2-5s

---

## If Issues Occur

### Issue: Slow Response (>5 seconds)

**Diagnosis**:
```bash
docker logs web | grep "Cache MISS" | wc -l
docker logs web | grep "Cache HIT" | wc -l
# If high MISS rate, something wrong
```

**Fix**: Restart
```bash
docker compose restart web
```

---

### Issue: High Memory Usage

**Diagnosis**:
```bash
docker stats web
# If >200MB, something accumulating
```

**Fix**: Restart
```bash
docker compose restart web
```

---

### Issue: Database Connections High

**Diagnosis**:
```bash
# Check connections
docker logs web | grep "connection" | tail -10
```

**Fix**: Check singleton initialization
```bash
docker logs web | grep "singleton"
# Should see initialization message
```

---

### Issue: Need to Rollback

**Do this**:
```bash
# Undo changes
git revert HEAD

# Restart
docker compose restart web

# Verify old version
curl http://localhost:5000/health
```

**Time to rollback**: < 5 minutes  
**Data loss**: None (code changes only)

---

## Sign-Off

Deployment completed by: _________________________ Date: _________

Verified by: _________________________ Date: _________

Approved for users: _________________________ Date: _________

---

## Next Steps

1. **Notify iOS Team**: They need to update their app (30 min work)
2. **Monitor**: Check logs daily for first week
3. **Measure**: Compare metrics weekly
4. **Optimize**: Adjust cache TTL if needed

See [MONITORING_GUIDE.md](MONITORING_GUIDE.md) for details.
