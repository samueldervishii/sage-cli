# Postman Testing Guide for Sage API

## Prerequisites

1. Start the API server:

```bash
npm run api:dev
```

2. Server should be running at: `http://localhost:3000`

---

## 1. Health Check

**Method:** `GET`
**URL:** `http://localhost:3000/health`

**Headers:** None needed

**Expected Response:**

```json
{
  "status": "healthy",
  "version": "1.5.0",
  "timestamp": "2025-11-08T20:00:40.907Z"
}
```

---

## 2. Chat - Initialize Session

**Method:** `POST`
**URL:** `http://localhost:3000/api/chat/initialize`

**Headers:**

```
Content-Type: application/json
```

**Body (raw JSON):**

```json
{}
```

**Or to resume an existing conversation:**

```json
{
  "conversationId": "2025-11-08-123456"
}
```

**Expected Response:**

```json
{
  "success": true,
  "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "resumed": false,
  "conversationId": "2025-11-08-200045"
}
```

**IMPORTANT:** Copy the `X-Session-ID` from the response headers! You'll need it for all subsequent requests.

**In Postman:**

1. After sending the request, go to the "Headers" tab in the response section
2. Look for `X-Session-ID` header
3. Copy its value

---

## 3. Chat - Send Message

**Method:** `POST`
**URL:** `http://localhost:3000/api/chat/send`

**Headers:**

```
Content-Type: application/json
X-Session-ID: <paste-session-id-from-step-2>
```

**Body (raw JSON):**

```json
{
  "message": "Hello! What can you help me with?"
}
```

**Expected Response:**

```json
{
  "success": true,
  "reply": "Hello! I'm Sage, your AI assistant. I can help you with...",
  "searchUsed": false,
  "functionCalls": [],
  "fallback": false
}
```

**More Example Messages:**

```json
{
  "message": "What is JavaScript?"
}
```

```json
{
  "message": "Explain async/await in simple terms"
}
```

```json
{
  "message": "remember that I like to code in TypeScript"
}
```

---

## 4. Chat - Get Status

**Method:** `GET`
**URL:** `http://localhost:3000/api/chat/status`

**Headers:**

```
X-Session-ID: <your-session-id>
```

**Expected Response:**

```json
{
  "initialized": true,
  "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "conversationId": "2025-11-08-200045",
  "messageCount": 4
}
```

---

## 5. Chat - Clear Session

**Method:** `DELETE`
**URL:** `http://localhost:3000/api/chat/session`

**Headers:**

```
X-Session-ID: <your-session-id>
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Session cleared"
}
```

---

## 6. Memory - List All Memories

**Method:** `GET`
**URL:** `http://localhost:3000/api/memory/list?limit=50`

**Headers:** None needed

**Expected Response:**

```json
{
  "success": true,
  "memories": [
    {
      "content": "User likes to code in TypeScript",
      "category": "preference",
      "timestamp": "2025-11-08T20:05:00.000Z",
      "accessCount": 1
    }
  ],
  "count": 1
}
```

---

## 7. Memory - Search Memories

**Method:** `GET`
**URL:** `http://localhost:3000/api/memory/search?query=TypeScript`

**Headers:** None needed

**Expected Response:**

```json
{
  "success": true,
  "query": "TypeScript",
  "results": [
    {
      "content": "User likes to code in TypeScript",
      "category": "preference",
      "timestamp": "2025-11-08T20:05:00.000Z"
    }
  ],
  "count": 1
}
```

---

## 8. Memory - Add Memory

**Method:** `POST`
**URL:** `http://localhost:3000/api/memory/add`

**Headers:**

```
Content-Type: application/json
```

**Body (raw JSON):**

```json
{
  "content": "User prefers React over Vue",
  "category": "preference"
}
```

**Categories:** `preference`, `fact`, `context`, `project`, `general`

**Expected Response:**

```json
{
  "success": true,
  "message": "Memory stored successfully"
}
```

---

## 9. Memory - Get Statistics

**Method:** `GET`
**URL:** `http://localhost:3000/api/memory/stats`

**Headers:** None needed

**Expected Response:**

```json
{
  "success": true,
  "stats": {
    "totalMemories": 2,
    "categories": {
      "preference": 2
    },
    "oldestMemory": "11/8/2025",
    "mostAccessed": {
      "content": "User likes to code in TypeScript",
      "category": "preference",
      "accessCount": 3
    }
  }
}
```

---

## 10. Memory - Clear All

**Method:** `DELETE`
**URL:** `http://localhost:3000/api/memory/clear`

**Headers:** None needed

**Expected Response:**

```json
{
  "success": true,
  "message": "All memories cleared successfully"
}
```

---

## 11. History - List Conversations

**Method:** `GET`
**URL:** `http://localhost:3000/api/history/list?limit=10`

**Headers:** None needed

**Expected Response:**

```json
{
  "success": true,
  "conversations": [
    {
      "id": "2025-11-08-200045",
      "startedAt": "2025-11-08T20:00:45.123Z",
      "firstUserMessage": "Hello! What can you help me with?",
      "messageCount": 4
    }
  ],
  "count": 1
}
```

---

## 12. History - Get Specific Conversation

**Method:** `GET`
**URL:** `http://localhost:3000/api/history/2025-11-08-200045`

Replace `2025-11-08-200045` with an actual conversation ID from step 11.

**Headers:** None needed

**Expected Response:**

```json
{
  "success": true,
  "conversation": {
    "id": "2025-11-08-200045",
    "startedAt": "2025-11-08T20:00:45.123Z",
    "messages": [
      {
        "role": "user",
        "content": "Hello! What can you help me with?",
        "timestamp": "2025-11-08T20:00:45.123Z"
      },
      {
        "role": "model",
        "content": "Hello! I'm Sage...",
        "timestamp": "2025-11-08T20:00:46.456Z",
        "searchUsed": false,
        "functionCalls": []
      }
    ]
  }
}
```

---

## 13. History - Export Conversation

**Method:** `GET`
**URL:** `http://localhost:3000/api/history/2025-11-08-200045/export`

**Headers:** None needed

**Expected Response:**
Markdown file download with conversation content

---

## 14. History - Get Storage Info

**Method:** `GET`
**URL:** `http://localhost:3000/api/history/info/storage`

**Headers:** None needed

**Expected Response:**

```json
{
  "success": true,
  "info": {
    "directory": "C:\\Users\\username\\.sage-cli\\conversations",
    "conversationCount": 5,
    "totalSizeMB": "0.15"
  }
}
```

---

## 15. History - Delete All

**Method:** `DELETE`
**URL:** `http://localhost:3000/api/history/clean`

**Headers:** None needed

**Expected Response:**

```json
{
  "success": true,
  "message": "Deleted 5 conversation(s)",
  "count": 5
}
```

---

## Complete Testing Flow

### Scenario: Full Chat Session

1. **Initialize Chat Session**
   - POST `/api/chat/initialize`
   - Save the `X-Session-ID` from response headers

2. **Send First Message**
   - POST `/api/chat/send`
   - Include `X-Session-ID` header
   - Body: `{"message": "Hello!"}`

3. **Ask to Remember Something**
   - POST `/api/chat/send`
   - Body: `{"message": "remember that I'm learning Node.js"}`

4. **Check Memory Was Stored**
   - GET `/api/memory/list`

5. **Continue Conversation**
   - POST `/api/chat/send`
   - Body: `{"message": "What should I learn next?"}`
   - AI will use the memory about Node.js

6. **Check Session Status**
   - GET `/api/chat/status`

7. **View Conversation History**
   - GET `/api/history/list`
   - Find your conversation ID

8. **Clear Session**
   - DELETE `/api/chat/session`

---

## Postman Collection

You can import this as a Postman collection:

```json
{
  "info": {
    "name": "Sage API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000"
    },
    {
      "key": "sessionId",
      "value": ""
    }
  ],
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "header": [],
        "url": "{{baseUrl}}/health"
      }
    },
    {
      "name": "Initialize Chat",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{}"
        },
        "url": "{{baseUrl}}/api/chat/initialize"
      }
    },
    {
      "name": "Send Message",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          },
          {
            "key": "X-Session-ID",
            "value": "{{sessionId}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"message\": \"Hello! What can you help me with?\"\n}"
        },
        "url": "{{baseUrl}}/api/chat/send"
      }
    },
    {
      "name": "List Memories",
      "request": {
        "method": "GET",
        "header": [],
        "url": "{{baseUrl}}/api/memory/list?limit=50"
      }
    }
  ]
}
```

---

## Tips for Postman

1. **Save the Session ID as an Environment Variable:**
   - After initializing chat, go to Tests tab in Postman
   - Add this script:

   ```javascript
   pm.environment.set("sessionId", pm.response.headers.get("X-Session-ID"));
   ```

2. **Use Variables:**
   - Create environment variables for `baseUrl` and `sessionId`
   - Use `{{baseUrl}}` and `{{sessionId}}` in requests

3. **Check Response Headers:**
   - Always check the Headers tab in responses
   - The `X-Session-ID` is crucial for maintaining chat context

4. **Test Authentication Errors:**
   - Try sending messages without `X-Session-ID`
   - Should get error: "Chat session not initialized"

---

## Troubleshooting

### Error: "Chat session not initialized"

- You forgot to initialize the chat first
- Or you forgot to include the `X-Session-ID` header

### Error: "Message is required"

- Check that your body has `"message"` field
- Make sure Content-Type is `application/json`

### Error: "EADDRINUSE"

- Port 3000 is already in use
- Kill the process: `netstat -ano | findstr :3000` then `taskkill /PID <pid> /F`

### Session Expired

- Sessions expire after 30 minutes of inactivity
- Initialize a new session
