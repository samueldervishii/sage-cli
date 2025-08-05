# Sophia CLI

Interactive CLI tool for generating mock servers and APIs.

## Features

- **Interactive Terminal UI** with gradient colors and emojis
- **AI-powered code generation** for fast and accurate mock server creation
- **Interactive Chat Mode** - conversational interface for better UX
- **Command History** - track all your previous prompts
- **Configuration Management** - customize settings easily
- **Smart Cleanup** - manage generated files efficiently
- **Endpoint Testing** - test your generated APIs instantly

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your API key:
   ```bash
   cp .env.example .env
   # Edit .env and add your API key
   ```
4. Make it globally available:
   ```bash
   npm link
   ```

## Usage

### Interactive Mode (Recommended)

Simply run:

```bash
sophia
```

This opens the interactive terminal where you can:

- Chat to generate mock servers
- Browse command history
- Manage configuration
- Clean generated files
- Test endpoints

### Command Mode

For quick one-off commands:

```bash
# Generate a mock server
sophia "create a REST API for user management with CRUD operations"

# View command history
sophia history

# Clean all generated files
sophia clean --all

# Show help
sophia --help
```

## Configuration

Sophia uses a `.sophiarc.json` file for configuration. You can manage it through the interactive interface or manually:

```json
{
  "defaultPort": 3000,
  "openBrowser": true,
  "editor": "code",
  "projectDir": "generated"
}
```

## Environment Variables

Create a `.env` file with your API configuration:

```bash
# Required: API Key
API_KEY=your_api_key_here
```

## Examples

### Generate a Simple API

```bash
sophia "create a GET /users endpoint that returns a list of users with id, name, and email"
```

### Create a Complex Mock Server

```bash
sophia "build a REST API for a blog with posts, comments, and users. Include CRUD operations for each resource"
```


## File Structure

```
sophia-cli/
├── bin/
│   └── sophia.mjs          # Main CLI entry point
├── lib/
│   └── generate.mjs        # Code generation logic
├── generated/              # Generated mock servers
├── logs/
│   └── history.json        # Command history
├── .env                    # Environment variables
├── .sophiarc.json         # Configuration file
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

### "API_KEY" Error

Make sure your `.env` file contains a valid API key:

```bash
API_KEY=your_actual_api_key_here
```

### Permission Denied

If you get permission errors, try:

```bash
chmod +x bin/sophia.mjs
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
