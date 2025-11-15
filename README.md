# Sage

An intelligent AI assistant platform with a REST API backend and interactive web playground, powered by Google Gemini and DeepSeek.

> **Disclaimer:** This project is NOT affiliated with, endorsed by, or connected to Sage Group plc or any of its products (Sage Intacct, Sage 50cloud, etc.). This is an independent open-source project.

## Features

- **Interactive Web Playground** - Modern React-based chat interface
- **REST API Server** - Full-featured backend for custom integrations
- **Memory System** - Remembers user preferences across conversations
- **File Operations** - Read, write, and search files with AI assistance
- **Web Search** - Real-time web search integration via MCP protocol
- **Conversation History** - All conversations saved to MongoDB with export support
- **Resume Conversations** - Continue previous chats seamlessly
- **Multiple AI Models** - Support for Google Gemini and DeepSeek via OpenRouter
- **Secure Storage** - MongoDB-based data persistence

## Architecture

The project consists of two main components:

- **Server** (`/server`) - Express.js REST API backend
- **Playground** (`/playground`) - React + Vite web interface

## Quick Start

### Prerequisites

- Node.js 18+ installed
- MongoDB database (local or Atlas)
- API keys for Gemini and/or OpenRouter

### 1. Server Setup

```bash
cd server

# Install dependencies
npm install

# Create .env file from example
cp .env.example .env

# Edit .env with your configuration
# Required: MONGODB_URI, GEMINI_API_KEY or OPENROUTER_API_KEY
```

**Environment Configuration** (server/.env):

```bash
# MongoDB (Required)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sage-db

# AI Model API Keys (at least one required)
GEMINI_API_KEY=your_gemini_api_key_here
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Optional Configuration
PORT=3000
CORS_ORIGIN=http://localhost:5173
DEBUG=1
```

**Start the server:**

```bash
# Production mode
npm start

# Development mode (with debug logs)
npm run dev
```

Server runs on `http://localhost:3000` by default.

### 2. Playground Setup

```bash
cd playground

# Install dependencies
npm install

# Start development server
npm run dev
```

Playground runs on `http://localhost:5173` by default.

### 3. Access the Application

Open your browser to `http://localhost:5173` to use the web interface.

## Configuration

### Required API Keys

**MongoDB** (Database)
- Local: Install MongoDB locally or use Docker
- Cloud: Get free cluster at https://www.mongodb.com/cloud/atlas
- Add connection string to `.env` as `MONGODB_URI`

**Gemini API** (Primary AI Model)
- Get free key: https://makersuite.google.com/app/apikey
- Add to `.env` as `GEMINI_API_KEY`
- Default model: `gemini-2.0-flash-exp`

### Optional API Keys

**OpenRouter** (Alternative AI Models)
- Get free key: https://openrouter.ai/keys
- Add to `.env` as `OPENROUTER_API_KEY`
- Default model: `deepseek/deepseek-r1-distill-llama-70b:free` (completely free!)

**Serper** (Web Search via MCP)
- Get free key: https://serper.dev
- Add to `.env` as `SERPER_API_KEY`
- If not provided, web search functionality will be disabled

### Server Configuration Options

```bash
# Server Settings
PORT=3000                                    # API server port
CORS_ORIGIN=http://localhost:5173            # CORS allowed origins
NODE_ENV=development                         # Environment mode
DEBUG=1                                      # Enable debug logging

# AI Model Selection
GEMINI_MODEL=gemini-2.0-flash-exp           # Gemini model
OPENROUTER_MODEL=deepseek/deepseek-r1-distill-llama-70b:free  # OpenRouter model
```

## Using the Playground

The web playground provides a full-featured interface:

### Chat Interface
- Send messages to AI assistants (Gemini or DeepSeek)
- View streaming responses with typewriter effect
- Automatic conversation saving to MongoDB

### History Management
- Browse all previous conversations
- View conversation details and messages
- Export conversations to markdown
- Delete individual conversations
- Delete all conversations with one click

### Memory Explorer
- View all stored memories
- Search through memories
- See memory statistics
- Delete individual or all memories

### Settings
- Switch between AI models (Gemini/DeepSeek)
- Configure model temperature
- View server health status
- Check API server information

## API Documentation

The REST API provides programmatic access to all features.

### Base URL

```
http://localhost:3000
```

### Authentication

The API uses session-based authentication:
- Sessions are created automatically on first request
- Include `X-Session-ID` header in subsequent requests
- Sessions expire after 30 minutes of inactivity

### Health Check

```bash
GET /health
```

Response:
```json
{
  "status": "healthy",
  "version": "2025.11.1",
  "timestamp": "2025-11-15T12:00:00.000Z"
}
```

### Chat Endpoints

#### Initialize Chat Session

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
  "conversationId": "conversation-id"
}
```

#### Send Message

```bash
POST /api/chat/send
Content-Type: application/json
X-Session-ID: your-session-id

{
  "message": "Hello, what can you help me with?",
  "model": "deepseek"
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

#### Get Chat Status

```bash
GET /api/chat/status
X-Session-ID: your-session-id
```

#### Clear Session

```bash
DELETE /api/chat/session
X-Session-ID: your-session-id
```

### Memory Endpoints

#### List Memories

```bash
GET /api/memory/list?limit=50
```

#### Search Memories

```bash
GET /api/memory/search?query=preferences
```

#### Add Memory

```bash
POST /api/memory/add
Content-Type: application/json

{
  "content": "User prefers React over Vue",
  "category": "preference"
}
```

#### Get Statistics

```bash
GET /api/memory/stats
```

#### Delete Memory

```bash
DELETE /api/memory/:id
```

#### Clear All Memories

```bash
DELETE /api/memory/clear
```

### History Endpoints

#### List Conversations

```bash
GET /api/history/list?limit=50
```

#### Get Conversation

```bash
GET /api/history/:id
```

#### Export Conversation

```bash
GET /api/history/:id/export
```

Returns conversation as markdown file.

#### Search Conversations

```bash
GET /api/history/search?q=search-term&limit=50
```

#### Delete Conversation

```bash
DELETE /api/history/:id
```

#### Delete All Conversations

```bash
DELETE /api/history/all
```

#### Get Storage Info

```bash
GET /api/history/info/storage
```

### API Features

- **Rate Limiting** - 100 requests per 15 minutes per IP
- **Session Management** - Automatic session creation and cleanup
- **CORS Support** - Configurable cross-origin requests
- **Error Handling** - Comprehensive error responses
- **MongoDB Storage** - Persistent conversation and memory storage

### Example: Using the API with JavaScript

```javascript
// Initialize chat session
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
    model: "deepseek"
  }),
});

const data = await chatResponse.json();
console.log(data.reply);
```

### Example: Using the API with cURL

```bash
# 1. Initialize a chat session
curl -X POST http://localhost:3000/api/chat/initialize \
  -H "Content-Type: application/json" \
  -d '{}' -i

# Extract X-Session-ID from response headers

# 2. Send a message
curl -X POST http://localhost:3000/api/chat/send \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: your-session-id" \
  -d '{"message": "What is Node.js?", "model": "gemini"}'

# 3. Check memory stats
curl http://localhost:3000/api/memory/stats
```

## Memory System

Sage can remember information across conversations:

- Automatically stores important information from conversations
- Uses memories to provide context-aware responses
- Search and manage memories through the Playground or API
- Works with both Gemini and DeepSeek models

Example conversation:
```
User: Remember that I'm a developer working on a React application
AI: I'll remember that!

[Later conversation]
User: What should I learn next?
AI: Since you're working on a React application, you might want to learn...
```

## File Operations

Sage can interact with your filesystem (when configured):

- Read file contents
- Search for files matching patterns
- Create new files (with confirmation)
- Secure path validation prevents directory traversal
- Blocks access to sensitive files (.env, SSH keys, etc.)

## Development

### Project Structure

```
sage-cli/
├── server/                # Backend API server
│   ├── src/
│   │   ├── api/          # Express routes and middleware
│   │   ├── services/     # Business logic (chat, memory, storage)
│   │   └── utils/        # Utilities (OpenRouter client, search)
│   ├── .env              # Environment configuration
│   └── package.json
├── playground/           # Frontend web app
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── contexts/     # React contexts
│   │   └── services/     # API client
│   └── package.json
└── README.md
```

### Running Tests

```bash
# Server linting
cd server
npm run lint
npm run lint:fix

# Server formatting
npm run format
npm run format:check

# Playground linting
cd playground
npm run lint
npm run lint:fix

# Playground formatting
npm run format
npm run format:check
```

### Building for Production

```bash
# Build playground
cd playground
npm run build

# Serve built files
npm run preview

# Server runs as-is (no build step)
cd server
npm start
```

## Versioning

This project uses **CalVer** (Calendar Versioning) with the format `YYYY.MM.MICRO`:

- `YYYY` - Four-digit year
- `MM` - Zero-padded month (01-12)
- `MICRO` - Incremental patch number within the month

Examples:
- `2025.11.1` - First release in November 2025
- `2025.11.2` - Second release in November 2025
- `2025.12.1` - First release in December 2025

Version is automatically updated by GitHub Actions workflow on each release.

## Security

- **Environment Variables** - Sensitive keys stored in .env (never committed)
- **MongoDB Storage** - Secure database with connection string authentication
- **Path Validation** - Prevents directory traversal attacks
- **Sensitive File Blocking** - Protects .env, SSH keys, credentials
- **CORS Configuration** - Configurable cross-origin access
- **Rate Limiting** - Prevents API abuse

## License

Apache License 2.0

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues.

## Support

For issues, questions, or feature requests, please open an issue on GitHub:
https://github.com/samueldervishii/sage-cli/issues

---

_Sage - Your intelligent AI assistant platform_
