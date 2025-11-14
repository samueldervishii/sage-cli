# Sage CLI

An intelligent command-line AI assistant powered by Google Gemini with memory, file operations, automatic fallback support, and **REST API**.

> **Disclaimer:** This project is NOT affiliated with, endorsed by, or connected to Sage Group plc or any of its products (Sage Intacct, Sage 50cloud, etc.). This is an independent open-source project.

## Features

- **Interactive Chat** - REPL-style interface with conversation context
- **REST API** - Use Sage as an API server for your applications
- **Memory System** - Sage remembers your preferences across conversations
- **File Operations** - Read, write, and search files with AI assistance
- **Web Search** - Real-time web search integration via Serper API
- **Conversation History** - All conversations saved locally with export support
- **Resume Conversations** - Continue previous chats seamlessly
- **Automatic Fallback** - Switches to OpenRouter (free DeepSeek) when Gemini rate limits
- **Secure Storage** - Encrypted API keys and local-only data
- **Tested** - Comprehensive test suite included

## Quick Start

### CLI Mode

```bash
# Install
npm install -g sage-cli

# First time setup
sage setup

# Start chatting
sage
```

### API Mode

```bash
# Install
npm install -g sage-cli

# First time setup
sage setup

# Start API server (default port 3000)
npm run api

# Or specify custom port
npm run api -- --port=8080
```

## Usage

### Basic Chat

```bash
sage
> hello
• Hi! How can I help you today?

> remember that I like blueberries
• I'll remember that!

> what fruit should I eat?
• Since you like blueberries, they would be a great choice!

> .exit
```

### Commands

```bash
# Chat
sage                        # Start new chat
sage --resume               # Resume previous conversation

# Memory Management
sage memory list            # List all memories
sage memory search <query>  # Search memories
sage memory stats           # Show memory statistics
sage memory export          # Export to markdown
sage memory clear           # Delete all memories

# History
sage history list           # List conversations
sage history show <id>      # Show conversation
sage history export <id>    # Export conversation
sage history clean          # Delete all history
sage history info           # Show storage info

# System
sage setup                  # Configure API keys
sage update                 # Update to latest version
sage --version              # Show version
```

## Configuration

### Required API Keys

**Gemini API** (Primary)

- Get free key: https://makersuite.google.com/app/apikey
- Add during `sage setup` or in `.env` as `GEMINI_API_KEY`

### Optional API Keys

**OpenRouter** (Fallback when Gemini rate limits)

- Get free key: https://openrouter.ai/keys
- Add during setup or in `.env` as `OPENROUTER_API_KEY`
- Uses free DeepSeek R1 70B model automatically

**Serper** (Web Search)

- Get free key: https://serper.dev
- Add during setup or in `.env` as `SERPER_API_KEY`

### Storage Locations

```
~/.sage-cli/
├── config.json           # Encrypted API keys and preferences
├── .key                  # Encryption key
├── conversations/        # Conversation history
└── memory/
    └── memories.json     # User memories
```

## Memory System

Sage can remember information about you across conversations:

```bash
# Store a memory
> remember that I'm a developer working on a CLI tool
• I'll remember that!

# Sage uses memories automatically
> what should I build next?
• Since you're working on a CLI tool, here are some ideas...

# View memories
sage memory list
```

Memory is context-aware and works with both Gemini and OpenRouter fallback.

## File Operations

Sage can interact with your filesystem:

```bash
> read package.json
# Shows file content

> search for *.test.js files
# Lists test files

> create a new file called hello.js with a hello world function
# Creates the file (with confirmation)
```

**Security**: Sage blocks access to sensitive files (.env, SSH keys, etc.) and validates all paths.

## Conversation History

All conversations are automatically saved:

```bash
# List recent conversations
sage history list

# Resume a conversation
sage --resume
# (Select from list)

# Export to markdown
sage history export 2025-11-07-123456
```

Auto-cleanup: Keeps last 50 conversations or 30 days, whichever is more recent.

## API Server

Sage can be run as a REST API server for integration with web apps, mobile apps, or other services.

### Starting the Server

```bash
# Production mode
npm run api

# Development mode (with debug logs)
npm run api:dev

# Custom port
npm run api -- --port=8080
```

### API Endpoints

#### Health Check

```bash
GET /health
```

Response:

```json
{
  "status": "healthy",
  "version": "1.5.0",
  "timestamp": "2025-11-08T19:54:40.907Z"
}
```

#### Chat Endpoints

**Initialize Chat Session**

```bash
POST /api/chat/initialize
Content-Type: application/json

{
  "conversationId": "optional-conversation-id"
}
```

Response:

```json
{
  "success": true,
  "sessionId": "uuid-session-id",
  "resumed": false,
  "conversationId": "2025-11-08-123456"
}
```

**Send Message**

```bash
POST /api/chat/send
Content-Type: application/json
X-Session-ID: your-session-id

{
  "message": "Hello, what can you help me with?"
}
```

Response:

```json
{
  "success": true,
  "reply": "Hello! I can help you with...",
  "searchUsed": false,
  "functionCalls": [],
  "fallback": false
}
```

**Get Chat Status**

```bash
GET /api/chat/status
X-Session-ID: your-session-id
```

**Clear Session**

```bash
DELETE /api/chat/session
X-Session-ID: your-session-id
```

#### Memory Endpoints

**List Memories**

```bash
GET /api/memory/list?limit=50
```

**Search Memories**

```bash
GET /api/memory/search?query=preferences
```

**Add Memory**

```bash
POST /api/memory/add
Content-Type: application/json

{
  "content": "User prefers React over Vue",
  "category": "preference"
}
```

**Get Statistics**

```bash
GET /api/memory/stats
```

**Clear All Memories**

```bash
DELETE /api/memory/clear
```

#### History Endpoints

**List Conversations**

```bash
GET /api/history/list?limit=50
```

**Get Conversation**

```bash
GET /api/history/:id
```

**Export Conversation**

```bash
GET /api/history/:id/export
```

**Get Storage Info**

```bash
GET /api/history/info/storage
```

**Delete All History**

```bash
DELETE /api/history/clean
```

### Session Management

The API uses session-based state management:

- Sessions are created automatically on first request
- Include `X-Session-ID` header in subsequent requests
- Sessions expire after 30 minutes of inactivity
- Each session maintains its own chat context

### Example: Using the API with cURL

```bash
# 1. Initialize a chat session
curl -X POST http://localhost:3000/api/chat/initialize \
  -H "Content-Type: application/json" \
  -d '{}'

# Response includes X-Session-ID header

# 2. Send a message (use session ID from step 1)
curl -X POST http://localhost:3000/api/chat/send \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: your-session-id" \
  -d '{"message": "What is Node.js?"}'

# 3. Check memory stats
curl http://localhost:3000/api/memory/stats
```

### Example: Using the API with JavaScript

```javascript
// Initialize chat
const initResponse = await fetch("http://localhost:3000/api/chat/initialize", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({}),
});

const sessionId = initResponse.headers.get("X-Session-ID");

// Send message
const chatResponse = await fetch("http://localhost:3000/api/chat/send", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Session-ID": sessionId,
  },
  body: JSON.stringify({
    message: "Explain TypeScript in simple terms",
  }),
});

const data = await chatResponse.json();
console.log(data.reply);
```

### API Configuration

```bash
# Environment variables
PORT=3000                    # API server port
CORS_ORIGIN=*                # CORS origin (default: *)
DEBUG=1                      # Enable debug logging

# Note: Scripts use cross-env for Windows compatibility
# npm run api:dev works on all platforms
```

### API Features

- **Rate Limiting** - 100 requests per 15 minutes per IP
- **Session Management** - Automatic session creation and cleanup
- **CORS Support** - Configurable cross-origin requests
- **Error Handling** - Comprehensive error responses
- **Same Core Logic** - Uses the same ChatService as CLI

## Automatic Fallback

When Gemini hits rate limits, Sage automatically switches to OpenRouter's free DeepSeek model:

- **Silent fallback** - No disruption to user experience
- **Memory support** - Memories work with both providers
- **Free tier** - DeepSeek R1 Distill 70B is completely free
- **Seamless** - You won't even notice the switch

Set `DEBUG=1` to see fallback in action.

## Testing

```bash
npm test                    # Run all tests
npm run lint                # Check code quality
```

Test coverage:

- ConfigManager (encryption, API keys, model config)
- FileOperations (path validation, sensitive file blocking)
- ConversationHistory (storage, export, cleanup)

## Development

```bash
# Clone
git clone https://github.com/samueldervishii/sage-cli.git
cd sage-cli

# Install dependencies
npm install

# Run locally
node bin/sage.mjs

# Debug mode
DEBUG=1 sage
```

## Configuration Options

### Environment Variables

```bash
# API Keys
GEMINI_API_KEY=your-gemini-key
OPENROUTER_API_KEY=your-openrouter-key  # Optional fallback
SERPER_API_KEY=your-serper-key          # Optional web search

# Models
GEMINI_MODEL=gemini-2.0-flash-exp       # Default
OPENROUTER_MODEL=deepseek/deepseek-r1-distill-llama-70b:free  # Free!

# Debug
DEBUG=1                                  # Show detailed logs
```

### Config File

Located at `~/.sage-cli/config.json`:

```json
{
  "apiKeys": {
    "gemini": "encrypted-key",
    "openrouter": "encrypted-key",
    "serper": "encrypted-key"
  },
  "preferences": {
    "geminiModel": "gemini-2.0-flash-exp",
    "openrouterModel": "deepseek/deepseek-r1-distill-llama-70b:free"
  }
}
```

## Security

- **Encrypted API keys** - AES-256-CBC with random salt and IV
- **Local storage only** - No cloud sync, all data stays on your machine
- **Path validation** - Prevents directory traversal attacks
- **Sensitive file blocking** - Protects .env, SSH keys, credentials
- **Secure permissions** - Config files are 0600 (user read/write only)

_Sage CLI - Your intelligent terminal companion_
