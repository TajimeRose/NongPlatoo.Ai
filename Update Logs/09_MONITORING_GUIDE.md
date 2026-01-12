# 📖 MONITORING GUIDE

How to monitor the system after deployment.

---

## Daily Monitoring

### Morning Check (5 minutes)

```bash
# 1. Health check
curl http://localhost:5000/health

# 2. Check for errors
docker logs web | grep ERROR | tail -5

# 3. Check memory
docker stats web --no-stream

# 4. Check response time
time curl -X POST http://localhost:5000/api/messages/stream \
  -H "Content-Type: application/json" \
  -d '{"text":"test","user_id":"test","request_id":"'$(uuidgen)'"}'
```

**Expected Results**:
- Health: `{"status": "ok"}`
- Errors: None or minimal
- Memory: ~100MB
- Response: 2-5 seconds

### Continuous Monitoring

```bash
# Watch logs live
docker logs -f web | grep -E "Cache|connection|error|request"

# Key things to look for:
# ✓ Cache HIT messages (70% of requests)
# ✓ No continuous ERROR messages
# ✓ Normal request patterns
```

### Weekly Review

```bash
# 1. Count total requests
docker logs web | grep "request" | wc -l

# 2. Count cache hits
docker logs web | grep "Cache HIT" | wc -l

# 3. Calculate hit rate
TOTAL=$(docker logs web | grep "request" | wc -l)
HITS=$(docker logs web | grep "Cache HIT" | wc -l)
RATE=$((HITS * 100 / TOTAL))
echo "Cache hit rate: $RATE%"

# Expected: ~70%

# 4. Check error rate
ERRORS=$(docker logs web | grep -c ERROR)
echo "Total errors: $ERRORS"

# Expected: <5% of total requests
```

---

## Metrics to Monitor

### Performance Metrics

**1. Response Time**

```bash
# Track how long requests take
docker logs web | grep "completed in" | tail -20
```

**Expected**:
- Most requests: 2-5 seconds
- Cache hits: <1 second
- First request: 5-10 seconds

**Alert if**:
- Average >8 seconds
- Many requests >10 seconds

---

**2. Cache Hit Rate**

```bash
# Percentage of cache hits
docker logs web | grep "Cache HIT" | wc -l
docker logs web | grep "Cache MISS" | wc -l
```

**Expected**:
- Hit rate: ~70%
- Miss rate: ~30%

**Alert if**:
- Hit rate drops below 50%
- Miss rate consistently >40%

---

**3. Database Connections**

```bash
# Number of active connections
docker logs web | grep "connection" | tail -5
```

**Expected**: < 20 connections

**Alert if**:
- More than 30 connections
- Growing over time

---

**4. Error Rate**

```bash
# Count errors
docker logs web | grep ERROR | wc -l
```

**Expected**: < 5 errors per 100 requests

**Alert if**:
- More than 10% error rate
- Specific errors repeating

---

### Resource Metrics

**Memory Usage**

```bash
docker stats web --no-stream

# Expected output:
# CONTAINER    MEM USAGE  MEM %
# web          98MB       2%
```

**Expected**: ~100MB (range: 80-150MB)

**Alert if**:
- Over 200MB
- Growing steadily over hours

---

**CPU Usage**

```bash
docker stats web --no-stream

# Expected output:
# CONTAINER    CPU %
# web          22%
```

**Expected**: 20-40% (light load: <10%)

**Alert if**:
- Over 60%
- Increasing rapidly

---

### Database Metrics

**Query Count**

```bash
# Estimate from logs
docker logs web | grep "SELECT\|query" | wc -l
```

**Expected**: ~30% of total requests (70% use cache)

**Alert if**:
- Over 50% queries
- Cache not working

---

**Query Performance**

```bash
# Check slow queries
docker logs web | grep "took.*ms" | tail -10
```

**Expected**: Most queries < 500ms

**Alert if**:
- Queries taking >2 seconds
- Database performance degrading

---

## Dashboards to Create

### Dashboard 1: Health Status

```
┌─────────────────────────────────────┐
│      System Health Dashboard         │
├─────────────────────────────────────┤
│ Service Status:        ✅ Running   │
│ Response Time:         3.2s         │
│ Cache Hit Rate:        72%          │
│ Error Rate:            0.5%         │
│ Memory Usage:          98MB         │
│ Database Connections:  18           │
└─────────────────────────────────────┘
```

---

### Dashboard 2: Performance Trends

```
Response Time (Last 24h)
┌────────────────────────────────────┐
│  █                                 │
│  █  █                              │
│  █  █  █  █                        │
│  █  █  █  █  █  █  █              │
├────────────────────────────────────┤
│ 00:00  06:00  12:00  18:00  24:00 │
│ Min: 1.2s  Max: 5.8s  Avg: 3.2s   │
└────────────────────────────────────┘
```

---

### Dashboard 3: Cache Performance

```
Cache Hit Distribution (Last 24h)
┌────────────────────────────────────┐
│        ███████                     │
│        ███████ ▄▄▄▄▄               │
│        ███████ ▄▄▄▄▄               │
├────────────────────────────────────┤
│ ███ = Hits (72%)                   │
│ ▄▄▄ = Misses (28%)                 │
│ Total: 5,432 requests              │
└────────────────────────────────────┘
```

---

## Alerting Setup

### Alert: Slow Response

**Trigger**: Average response > 8 seconds for 5 minutes

**Action**:
1. Check logs: `docker logs web | tail -50`
2. Check cache hit rate
3. Check database connections
4. Restart if needed: `docker compose restart web`

---

### Alert: High Error Rate

**Trigger**: Error rate > 10%

**Action**:
1. Check error type: `docker logs web | grep ERROR`
2. Check database: `docker logs web | grep -i database`
3. Check memory: `docker stats web`
4. Resolve issue or rollback

---

### Alert: Cache Not Working

**Trigger**: Cache hit rate < 40%

**Action**:
1. Check cache logic: `docker logs web | grep "Cache"`
2. Verify request_id being sent
3. Check cache cleanup: `docker logs web | grep cleanup`
4. Restart if persistent: `docker compose restart web`

---

### Alert: High Memory Usage

**Trigger**: Memory > 200MB

**Action**:
1. Check for memory leak: Monitor over 1 hour
2. If growing: Memory leak probable
3. Restart: `docker compose restart web`
4. Consider daily restart cron job

---

### Alert: Database Connections High

**Trigger**: Connections > 30

**Action**:
1. Check singleton initialized: `docker logs web | grep singleton`
2. Check active requests: `docker logs web | grep "active"`
3. Verify cache working
4. Restart if not helpful

---

## Logging Strategy

### Log Levels

**ERROR** - Critical issues, requires immediate attention
**WARNING** - Potential problems, monitor closely
**INFO** - Normal operations, important events
**DEBUG** - Detailed information, for troubleshooting

### Useful Log Filters

```bash
# All errors
docker logs web | grep ERROR

# Cache activity
docker logs web | grep "Cache"

# Requests
docker logs web | grep "request"

# Database
docker logs web | grep "database\|connection\|query"

# Performance
docker logs web | grep "time\|ms\|seconds"

# Startups/restarts
docker logs web | grep "initialized\|started\|restarted"
```

---

## Automated Monitoring Script

Save as `monitor.sh`:

```bash
#!/bin/bash

echo "═══════════════════════════════════════"
echo "   System Monitoring Report"
echo "═══════════════════════════════════════"
echo ""

# Health check
echo "1. Service Status"
if curl -s http://localhost:5000/health > /dev/null; then
    echo "   ✅ Service running"
else
    echo "   ❌ Service down"
fi
echo ""

# Response time
echo "2. Response Time"
START=$(date +%s%N)
curl -s -X POST http://localhost:5000/api/messages/stream \
  -H "Content-Type: application/json" \
  -d '{"text":"test","user_id":"test","request_id":"'$(uuidgen)'"}' > /dev/null
END=$(date +%s%N)
TIME=$((($END - $START) / 1000000))
echo "   Response time: ${TIME}ms"
echo ""

# Cache hit rate
echo "3. Cache Performance"
TOTAL=$(docker logs web 2>/dev/null | grep -c "request")
HITS=$(docker logs web 2>/dev/null | grep -c "Cache HIT")
if [ $TOTAL -gt 0 ]; then
    RATE=$((HITS * 100 / TOTAL))
    echo "   Cache hit rate: ${RATE}%"
else
    echo "   Not enough data"
fi
echo ""

# Memory usage
echo "4. Memory Usage"
MEM=$(docker stats web --no-stream 2>/dev/null | tail -1 | awk '{print $4}')
echo "   Memory: $MEM"
echo ""

# Error count
echo "5. Error Rate"
ERRORS=$(docker logs web 2>/dev/null | grep -c ERROR)
echo "   Errors: $ERRORS"
echo ""

echo "═══════════════════════════════════════"
```

Usage:
```bash
chmod +x monitor.sh
./monitor.sh
```

---

## Scheduled Monitoring

### Cron Job: Daily Report

```bash
# Add to crontab (crontab -e)
# Run daily at 9 AM
0 9 * * * /path/to/monitor.sh >> /var/log/monitoring.log

# Run daily at 5 PM
0 17 * * * /path/to/monitor.sh >> /var/log/monitoring.log
```

---

## Alerting Tools

### Option 1: Simple Email Alert

```bash
#!/bin/bash
ERRORS=$(docker logs web | grep -c ERROR)
if [ $ERRORS -gt 10 ]; then
    echo "High error rate: $ERRORS errors" | mail -s "Alert: High Error Rate" admin@example.com
fi
```

---

### Option 2: Slack Alert

```bash
#!/bin/bash
RATE=$(docker logs web | grep -c "Cache MISS")
if [ $RATE -gt 50 ]; then
    curl -X POST -H 'Content-type: application/json' \
    --data '{"text":"⚠️ Cache hit rate low"}' \
    $SLACK_WEBHOOK_URL
fi
```

---

## Retention Policy

### Log Rotation

```bash
# Keep last 7 days of logs
docker logs web --since 7d > web.log

# Clean old logs (Docker native)
# Configure in docker-compose.yml:
logging:
  options:
    max-size: "10m"
    max-file: "3"
```

---

## Compliance & SLA

### Service Level Agreement (SLA)

```
Availability:        99.5% (< 3.6 hours downtime/month)
Response Time:       < 5 seconds (p95)
Error Rate:          < 1% (p95)
Cache Hit Rate:      > 60%
```

### Monitoring for SLA Compliance

```bash
# Calculate uptime
TOTAL_MINUTES=$(date +%s)
DOWNTIME=$(docker logs web | grep -c "Service unavailable")
UPTIME=$((100 * ($TOTAL_MINUTES - $DOWNTIME) / $TOTAL_MINUTES))
echo "Uptime: ${UPTIME}%"
```

---

## Troubleshooting via Monitoring

### Problem: Slow Response

**Monitoring Shows**:
- Response time > 8 seconds
- Cache hit rate high (70%+)

**Diagnosis**: Database issue, not cache

**Solution**: Check database performance

---

### Problem: Cache Not Working

**Monitoring Shows**:
- Cache hit rate < 30%
- Response time high

**Diagnosis**: Cache logic broken or request_id missing

**Solution**: Verify request_id sent, check cache logs

---

### Problem: Memory Growing

**Monitoring Shows**:
- Memory 100MB → 200MB over 2 hours
- Steady increase

**Diagnosis**: Memory leak

**Solution**: Identify leak source or restart daily

---

## Best Practices

1. **Monitor continuously** - Real-time dashboard ideal
2. **Alert on thresholds** - Don't wait for problems
3. **Log everything** - Debug faster later
4. **Archive logs** - Keep 30 days history
5. **Review weekly** - Trend analysis
6. **Track metrics** - Historical comparison
7. **Test alerts** - Verify they work

---

**Key Metric**: 70% cache hit rate = system working well ✅
