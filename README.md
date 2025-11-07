# Sage CLI

An intelligent command-line AI assistant powered by Google Gemini with memory, file operations, and automatic fallback support.

## Features

- **Interactive Chat** - REPL-style interface with conversation context
- **Memory System** - Sage remembers your preferences across conversations
- **File Operations** - Read, write, and search files with AI assistance
- **Web Search** - Real-time web search integration via Serper API
- **Conversation History** - All conversations saved locally with export support
- **Resume Conversations** - Continue previous chats seamlessly
- **Automatic Fallback** - Switches to OpenRouter (free DeepSeek) when Gemini rate limits
- **Secure Storage** - Encrypted API keys and local-only data
- **Tested** - Comprehensive test suite included

## Quick Start

```bash
# Install
npm install -g sage-cli

# First time setup
sage setup

# Start chatting
sage
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
