# Sage CLI

A simple command-line AI chat interface powered by Google Gemini.

## Quick Start

```bash
# First time setup
sage setup

# Start chatting
sage
```

## Usage

### Chat Mode

Simply type your message and press Enter:

```
> hello
AI responds...

> what is the weather?
AI responds...

> .exit
```

Type `.exit` to quit.

### Commands

```bash
sage                # Start interactive chat
sage setup          # Configure API keys
sage update         # Update to latest version
sage --version      # Show version
```

## Configuration

Sage stores encrypted configuration in `~/.sage-cli/config.json`

API keys are encrypted for security.

## Requirements

- Node.js 16 or higher
- Gemini API key (get one at https://makersuite.google.com/app/apikey)

## Features

- Clean REPL-style chat interface
- Conversation history maintained during session
- Web search integration when needed
- Markdown formatting in responses
- Code syntax highlighting
- Encrypted API key storage
