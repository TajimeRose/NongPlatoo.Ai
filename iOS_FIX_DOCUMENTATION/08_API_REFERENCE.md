# 📋 API REFERENCE

Complete API documentation for the streaming endpoint.

---

## Overview

The `/api/messages/stream` endpoint handles all iOS chat requests.

```
POST /api/messages/stream
Content-Type: application/json
Connection: keep-alive
```

---

## Request Format

### HTTP Method
```
POST /api/messages/stream
```

### Headers
```
Host: your-api.com:5000
Content-Type: application/json
Content-Length: [auto]
```

### Request Body (JSON)

```json
{
  "text": "What temples are in Bangkok?",
  "user_id": "user_12345",
  "request_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | string | YES | User message to send to AI |
| `user_id` | string | YES | User identifier (same for same user) |
| `request_id` | string | YES | Unique request ID (use UUID) |

### Example Request (curl)

```bash
curl -X POST http://localhost:5000/api/messages/stream \
  -H "Content-Type: application/json" \
  -d '{
    "text": "What temples are in Bangkok?",
    "user_id": "user_12345",
    "request_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

### Example Request (Swift)

```swift
var request = URLRequest(url: url)
request.httpMethod = "POST"
request.setValue("application/json", forHTTPHeaderField: "Content-Type")

let body: [String: Any] = [
    "text": "What temples are in Bangkok?",
    "user_id": "user_12345",
    "request_id": UUID().uuidString
]

request.httpBody = try JSONSerialization.data(withJSONObject: body)
```

---

## Response Format

### HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | OK - Stream starts | Process streaming events |
| 409 | Conflict - Already processing | Wait, don't retry |
| 500 | Server Error | Retry with exponential backoff |
| 503 | Service Unavailable | Retry with exponential backoff |

### Response Body (Streaming)

The response is **Server-Sent Events (SSE)** format. Each line is a JSON object.

```
{"type":"message","data":"Here are temples in Bangkok"}
{"type":"heartbeat"}
{"type":"message","data":"Wat Phra Kaew is the most famous"}
{"type":"heartbeat"}
{"type":"message","data":"The temple is located in the..."}
```

### Response Events

#### Message Event
```json
{
  "type": "message",
  "data": "AI response text here"
}
```

**Fields**:
- `type`: Always "message"
- `data`: Chunk of AI response

**Handling**: Display to user

#### Heartbeat Event
```json
{
  "type": "heartbeat"
}
```

**Fields**:
- `type`: Always "heartbeat"

**Handling**: Ignore (don't show to user, connection still alive)

#### Error Event
```json
{
  "type": "error",
  "message": "Error description here"
}
```

**Fields**:
- `type`: Always "error"
- `message`: Error description

**Handling**: Display error to user, stop processing

---

## Streaming Behavior

### Timeline Example

**Request sent at T=0.0s**

```
T=0.0s  → Server receives request, starts processing
T=0.5s  → Sends: {"type":"message","data":"Here are temples"}
T=1.0s  → Sends: {"type":"heartbeat"}  (connection check)
T=1.2s  → Sends: {"type":"message","data":"Wat Phra..."}
T=3.0s  → Sends: {"type":"heartbeat"}  (still processing)
T=3.5s  → Sends: {"type":"message","data":"Located in"}
T=4.0s  → Sends: {"type":"heartbeat"}  (almost done)
T=4.8s  → Sends: {"type":"message","data":"Address: ..."}
T=5.0s  → Stream closes (complete)
```

**Total time**: ~5 seconds

### Event Ordering

1. One or more MESSAGE events (response chunks)
2. Alternating HEARTBEAT and MESSAGE events
3. Final MESSAGE event(s) with full response
4. Stream closes (EOF)

### Important Behavior

- **Messages may come in chunks** - Concatenate multiple "data" fields
- **Heartbeats don't indicate completion** - Stream may continue after heartbeat
- **Stream ends when connection closes** - No final "complete" event
- **Events are newline-delimited JSON** - One JSON object per line

---

## Cache Behavior

### Cache Hit (Fast Response)

```
Request: {"text":"temples"}
Response: ~1 second total
├─ All data from cache
└─ No database queries
```

### Cache Miss (Slower Response)

```
Request: {"text":"temples"} (first time or after 30 seconds)
Response: ~5 seconds total
├─ Database queries
├─ AI processing
└─ Result cached for future requests
```

### Subsequent Requests (Cache Hit)

```
Request: {"text":"temples"} (same user within 30 seconds)
Response: ~1 second total
├─ Data retrieved from cache
└─ Same result as before
```

---

## Error Codes

### 200 - OK
Everything working normally.

**Response**: Stream of events

### 409 - Conflict (Request Already Processing)

The server is already processing a request with this `request_id`.

```json
{
  "type": "error",
  "message": "Request already processing",
  "status": 409
}
```

**When**: iOS sent duplicate request_id within 5 seconds

**Action**: 
- Don't send again
- Wait for first request to complete
- Reuse the first request's response

### 500 - Internal Server Error

Server encountered an error.

```json
{
  "type": "error",
  "message": "Internal server error"
}
```

**Action**: 
- Retry after 5 seconds
- Use exponential backoff
- Log for debugging

### 503 - Service Unavailable

Server is temporarily unavailable (overloaded).

```json
{
  "type": "error",
  "message": "Service unavailable"
}
```

**Action**:
- Retry after 10-30 seconds
- Use exponential backoff
- Notify user

---

## Request Retry Strategy

### Good Retry Pattern

```swift
func sendWithRetry(
    text: String,
    userId: String,
    maxRetries: Int = 3
) async throws -> String {
    var lastError: Error?
    var delay: TimeInterval = 1.0
    
    for attempt in 0..<maxRetries {
        do {
            let response = try await sendMessage(
                text: text,
                userId: userId
            )
            return response  // Success
        } catch let error as NSError where error.code == 409 {
            // 409: Already processing, don't retry
            throw error
        } catch {
            lastError = error
            guard attempt < maxRetries - 1 else { break }
            
            // Exponential backoff
            try await Task.sleep(for: .seconds(delay))
            delay *= 2.0  // 1s → 2s → 4s
        }
    }
    
    throw lastError ?? NSError()
}
```

### Bad Retry Pattern (Don't Do This)

```swift
// DON'T: Retry immediately
for i in 0..<10 {
    try await sendMessage(...)  // Immediate retry
}

// DON'T: Reuse same request_id
for i in 0..<3 {
    try await sendMessage(
        text: text,
        userId: userId,
        request_id: "same_id"  // Wrong! Generate new ID
    )
}
```

---

## Performance Expectations

### Response Time

```
First request:     5-10 seconds
  └─ Database queries, AI processing
  
Subsequent queries: 1-3 seconds
  └─ Cache hits, AI processing
  
Cache hit:         <1 second
  └─ Instant cache retrieval
```

### Timeout Behavior

```
Request timeout: 120 seconds (2 minutes)
Expected max response: ~10 seconds
Buffer: 110 seconds
```

**Important**: Don't reduce timeout below 120 seconds

---

## Benchmarks

### Local Server (LAN)

```
Message event:        50-100ms per chunk
Heartbeat event:      <1ms
Streaming latency:    <100ms
Total response time:  2-5 seconds
```

### Remote Server (Cloud)

```
Message event:        100-200ms per chunk
Heartbeat event:      5-20ms
Network latency:      50-100ms
Total response time:  3-8 seconds
```

---

## Rate Limiting (Future)

Currently no rate limiting. Planned for future:

```
Limits (planned):
- 100 requests per minute per user
- 1000 requests per minute per IP
- Response: 429 Too Many Requests
```

---

## Authentication (Future)

Currently no authentication. Planned:

```
Authorization: Bearer <token>
```

---

## Monitoring

### Check Server Status

```bash
curl http://localhost:5000/health
```

Response:
```json
{"status": "ok"}
```

### Test Streaming

```bash
curl -v -X POST http://localhost:5000/api/messages/stream \
  -H "Content-Type: application/json" \
  -d '{"text":"hello","user_id":"test","request_id":"'$(uuidgen)'"}'
```

---

## Common Integration Issues

### Issue: Stream Closes Unexpectedly

**Cause**: Timeout (default 30s)  
**Solution**: Increase timeout to 120s

### Issue: Heartbeat Crashes App

**Cause**: Treating heartbeat as message  
**Solution**: Check `type == "heartbeat"` and skip

### Issue: 409 Errors

**Cause**: Sending duplicate request_id  
**Solution**: Generate new UUID for each request

### Issue: Slow Responses

**Cause**: Not using cache  
**Solution**: Ensure request_id sent correctly

---

## Example Responses

### Complete Response Sequence

```json
{"type":"message","data":"The most popular temples in Bangkok"}
{"type":"message","data":" are:"}
{"type":"message","data":"\n1. Wat Phra Kaew"}
{"type":"heartbeat"}
{"type":"message","data":"\n2. Wat Arun"}
{"type":"message","data":"\n3. Wat Pho"}
{"type":"heartbeat"}
{"type":"message","data":"\n\nWat Phra Kaew is..."}
```

When concatenated:
```
The most popular temples in Bangkok are:
1. Wat Phra Kaew
2. Wat Arun
3. Wat Pho

Wat Phra Kaew is...
```

---

## API Contract

This API is **production-ready** and **stable**.

- **Version**: 1.0
- **Status**: Stable
- **Backward Compatibility**: Yes (new request_id added)
- **Support**: Full

---

**Summary**: Stream JSON events, handle heartbeats, catch errors, retry strategically. ✅
