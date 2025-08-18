# Sage CLI

Interactive CLI tool for generating mock servers and APIs.

## Features

- **Interactive Terminal UI** with gradient colors and emojis
- **AI-powered code generation** for fast and accurate mock server creation
- **Interactive Chat Mode** - conversational interface for better UX
- **Web Search Integration** - real-time web search using Serper API via MCP
- **Secure Filesystem Access** - browse and manage files safely via MCP tools
- **Command History** - track all your previous prompts
- **Configuration Management** - customize settings easily
- **Smart Cleanup** - manage generated files efficiently
- **Endpoint Testing** - test your generated APIs instantly

## Installation

### Quick Install (Recommended)

Install Sage CLI with a single command:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/samueldervishii/sage-cli/main/install.sh)"
```

This will:

- Check Node.js requirements (v14+)
- Download and install Sage CLI from GitHub
- Set up the `sage` command globally
- Optionally add to your PATH

### Manual Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Make it globally available:
   ```bash
   npm link
   ```

### Requirements

- **Node.js** version 14 or higher
- **npm** (comes with Node.js)
- **curl** or **wget** (for installation script)

## Usage

### Interactive Mode (Recommended)

Simply run:

```bash
sage
```

This opens the interactive terminal where you can:

- Chat to generate mock servers
- Search the web for information
- Browse and manage files securely
- Browse command history
- Manage configuration
- Clean generated files
- Test endpoints

### Command Mode

For quick one-off commands:

```bash
# Generate a mock server
sage "create a REST API for user management with CRUD operations"

# View command history
sage history

# Access file explorer
sage files

# Clean all generated files
sage clean --all

# Show help
sage --help
```

## Configuration

sage uses a `.sage.json` file for configuration. You can manage it through the interactive interface or manually:

```json
{
  "defaultPort": 3000,
  "openBrowser": true,
  "editor": "code",
  "projectDir": "generated"
}
```

## Examples

### Generate a Simple API

```bash
sage "create a GET /users endpoint that returns a list of users with id, name, and email"
```

### Create a Complex Mock Server

```bash
sage "build a REST API for a blog with posts, comments, and users. Include CRUD operations for each resource"
```

## MCP Tools Integration

Sage leverages the **Model Context Protocol (MCP)** to provide extended capabilities through secure tool integrations:

### Web Search Tool

- **Provider**: Serper API via `serper-search-scrape-mcp-server`
- **Features**: Real-time web search with intelligent query processing
- **Setup**: Add `SERPER_API_KEY` to your `.env` file (get free key from [serper.dev](https://serper.dev/api-key))
- **Usage**: Chat naturally - Sage detects when web search is needed
- **Example**: "search for the latest React 19 features"

### Filesystem Tool

- **Provider**: `@modelcontextprotocol/server-filesystem`
- **Features**: Secure file and directory operations with built-in safety restrictions
- **Security**: Protects system files, SSH keys, and sensitive directories
- **Allowed Areas**: Home directories, project folders, temp files, web content
- **Usage**: Access via "File Explorer (Filesystem)" in interactive mode or `sage files`
- **Examples**:
  - "show me the package.json file"
  - "list files in the current directory"
  - "read the contents of src/components"

### Security Features

- **Path Validation**: Prevents access to system-critical files and directories
- **SSH Key Protection**: Blocks access to `.ssh/`, `.gnupg/` directories
- **System File Protection**: Restricts `/etc/passwd`, `/boot/`, `/sys/` and other sensitive areas
- **User Directory Safety**: Allows development work while maintaining security boundaries

## File Structure

```
sage-cli/
├── bin/
│   └── sage.mjs          # Main CLI entry point
├── lib/
│   ├── generate.mjs        # Code generation logic
│   ├── simple-chat.mjs     # Chat mode with MCP integration
│   ├── search-service.mjs  # Web search MCP client
│   └── filesystem-service.mjs # Filesystem MCP client
├── generated/              # Generated mock servers
├── conversations/          # Chat session history
├── logs/
│   └── history.json        # Command history
├── .env                    # Environment variables
├── .sage.json         # Configuration file
└── package.json
```

## Features in Detail

### Interactive Interface

- Gradient ASCII art banner
- Color-coded messages and status indicators
- Spinning loaders for operations
- Emoji-rich menu system

### AI-Powered Generation

- Optimized prompts for Express.js code generation
- Automatic ESM syntax conversion
- Smart code validation and cleanup

### Smart History

- Tracks all prompts with timestamps
- Shows recent 10 entries by default
- Persistent storage between sessions

### Flexible Configuration

- Interactive configuration editor
- Support for custom ports, editors, directories
- Browser auto-opening option

## Troubleshooting

### Web Search Not Working

If web search functionality isn't working:

1. Check if `SERPER_API_KEY` is set in your `.env` file
2. Get a free API key from [serper.dev](https://serper.dev/api-key)
3. The MCP server will be installed automatically on first use

### Filesystem Access Issues

If file operations aren't working:

1. The filesystem MCP server installs automatically
2. Check console for permission errors
3. Remember that system files are protected for security

### Permission Denied

If you get permission errors, try:

```bash
chmod +x bin/sage.mjs
```

### Dependencies Issues

Clean install dependencies:

```bash
rm -rf node_modules package-lock.json
npm install
```

## Contributing

This is a personal project by Samuel, but feel free to:

- Report issues
- Suggest features
- Submit pull requests
