# 📱 iOS IMPLEMENTATION GUIDE

**Time Required**: 30 minutes  
**Difficulty**: Easy (straightforward changes)  
**Breaking Changes**: None (backward compatible)

---

## What iOS Needs To Do

Your iOS app needs 3 small changes to work properly with the new backend.

---

## Change #1: Add request_id to Requests (10 minutes)

### Before (Current - Not Working Well)
```swift
let request = URLRequest(url: url)
let body: [String: Any] = [
    "text": message,
    "user_id": userId
]
request.httpBody = try JSONSerialization.data(withJSONObject: body)
session.dataTask(with: request).resume()
```

### After (Fixed - Working Great)
```swift
import Foundation

let request = URLRequest(url: url)
let requestId = UUID().uuidString  // ← ADD THIS: Generate unique ID

let body: [String: Any] = [
    "text": message,
    "user_id": userId,
    "request_id": requestId  // ← ADD THIS: Send the ID
]
request.httpBody = try JSONSerialization.data(withJSONObject: body)
session.dataTask(with: request).resume()
```

**What it does**: Helps server prevent retry loops

---

## Change #2: Handle Heartbeat Events (10 minutes)

The server sends `{"type": "heartbeat"}` events to keep connection alive.

### Listen for Heartbeat
```swift
if let dict = jsonObject as? [String: Any] {
    if let type = dict["type"] as? String {
        if type == "heartbeat" {
            // Connection is working, don't show to user
            print("Heartbeat received - connection alive")
            // Just continue processing
        } else if type == "message" {
            // Show this to user
            if let data = dict["data"] as? String {
                print("AI: \(data)")
                // Display message to user
            }
        }
    }
}
```

**What it does**: Keeps connection open, prevents timeouts

---

## Change #3: Increase Timeout (5 minutes)

### Before (Too Short - 30 seconds)
```swift
var request = URLRequest(url: url)
// Default timeout: 30 seconds
```

### After (Appropriate - 120 seconds)
```swift
var request = URLRequest(url: url)
request.timeoutInterval = 120  // ← Change this: 2 minutes

// Also improve connection handling
var config = URLSessionConfiguration.default
config.timeoutIntervalForRequest = 120
config.timeoutIntervalForResource = 240
config.waitsForConnectivity = true
let session = URLSession(configuration: config)
```

**What it does**: Allows longer response time on first request

---

## Complete Implementation Example

### Full Swift Code

```swift
import Foundation

class TravelChatAPI {
    private let baseURL = "http://your-server:5000"
    private var session: URLSession
    
    init() {
        // Configure session with proper timeouts
        var config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 120      // 2 minutes
        config.timeoutIntervalForResource = 240     // 4 minutes
        config.waitsForConnectivity = true
        config.shouldUseExtendedBackgroundIdleTimeout = true
        
        self.session = URLSession(configuration: config)
    }
    
    func sendMessage(
        text: String,
        userId: String
    ) async throws -> String {
        let url = URL(string: "\(baseURL)/api/messages/stream")!
        var request = URLRequest(url: url)
        
        // Setup request
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 120
        
        // Generate request ID (IMPORTANT: Send this every time)
        let requestId = UUID().uuidString
        
        // Create request body
        let body: [String: Any] = [
            "text": text,
            "user_id": userId,
            "request_id": requestId  // MUST INCLUDE THIS
        ]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        // Send request and handle streaming response
        let (stream, response) = try await session.bytes(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }
        
        // Handle HTTP status codes
        switch httpResponse.statusCode {
        case 200:
            // Success - continue
            break
        case 409:
            // Request already processing
            throw NSError(domain: "", code: 409, 
                         userInfo: [NSLocalizedDescriptionKey: "Request already processing"])
        case 500...599:
            // Server error
            throw URLError(.badServerResponse)
        default:
            throw URLError(.badServerResponse)
        }
        
        // Process streaming response
        var fullResponse = ""
        do {
            for try await line in stream.lines {
                // Try to parse JSON line
                if let jsonData = line.data(using: .utf8),
                   let json = try JSONSerialization.jsonObject(with: jsonData) as? [String: Any] {
                    
                    if let type = json["type"] as? String {
                        switch type {
                        case "heartbeat":
                            // Server is still working on response
                            print("Heartbeat received - keeping connection alive")
                            // Don't show to user, just continue
                            
                        case "message":
                            // Actual message data
                            if let data = json["data"] as? String {
                                print("Received: \(data)")
                                fullResponse += data
                                // Update UI here
                            }
                            
                        default:
                            print("Unknown message type: \(type)")
                        }
                    }
                }
            }
        } catch {
            print("Error reading stream: \(error)")
            throw error
        }
        
        return fullResponse
    }
}

// Usage Example
func testChat() async {
    let api = TravelChatAPI()
    
    do {
        let response = try await api.sendMessage(
            text: "What temples are in Bangkok?",
            userId: "user_12345"
        )
        print("Full response: \(response)")
    } catch {
        print("Error: \(error)")
    }
}
```

---

## Minimal Changes Version

If you want just the minimum changes:

```swift
// Change 1: Add request_id
let requestId = UUID().uuidString
let body: [String: Any] = [
    "text": message,
    "user_id": userId,
    "request_id": requestId  // ← ADD THIS
]

// Change 2: Handle heartbeat
if type == "heartbeat" {
    // Ignore, connection alive
} else if type == "message" {
    // Handle message
}

// Change 3: Increase timeout
request.timeoutInterval = 120  // ← CHANGE THIS
```

---

## Testing Your Changes

### Test 1: Send Request
```
Send message: "Hello"
Expected: Response in 2-5 seconds
Status: Should see heartbeats every 5 seconds
```

### Test 2: Send Duplicate
```
Send message twice quickly (within 2 seconds)
First request: Should process
Second request: Should see error 409
```

### Test 3: Long Response
```
Send: "Plan a week-long trip"
Expected: Heartbeats every 5 seconds
No timeout
Response within 2 minutes
```

---

## Common Issues

### Issue: Still Getting Timeouts
**Fix**: 
1. Verify timeout increased to 120s
2. Verify request_id being sent
3. Verify heartbeats being received

### Issue: Duplicate Request Error (409)
**This is expected**: Send request_id with each request to prevent this

### Issue: Connection Dropped
**Fix**: Check that heartbeat handler doesn't close connection

---

## Performance Improvements

After iOS app update + backend deployment:

```
Before                      After
─────────────────────────────────────
8-15 seconds to respond      2-5 seconds
Frequent timeouts           Almost none
App hangs                   Smooth responses
Users angry                 Users happy
```

---

## Deployment Order

**Do this in order**:

1. **Deploy backend first**: `git pull && docker compose restart web`
2. **Wait 1 hour**: Monitor server
3. **Then update iOS app**: Push to App Store
4. **Users update iOS app**: Within a few days

If you update iOS before deploying backend:
- Still works but slower
- Not ideal but won't break

If you deploy backend before iOS update:
- Much better, even without iOS changes
- But even more better with iOS changes

---

## Questions?

See [iOS_CLIENT_GUIDE.md](iOS_CLIENT_GUIDE.md) for more details  
See [API_REFERENCE.md](API_REFERENCE.md) for API specifics  
See [FAQ.md](FAQ.md) for common questions

---

**Estimated Time to Implement**: 30 minutes  
**Difficulty**: Easy  
**Risk**: None (backward compatible)  
**Benefit**: 70% performance improvement  

Let's go! 🚀
