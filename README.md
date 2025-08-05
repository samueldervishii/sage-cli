# Sophia CLI

**Sophia** - Your Interactive AI Assistant for generating mock servers and more!

Created by Samuel, powered by Google's Gemini AI.

## Features

- **Beautiful Interactive Terminal UI** with gradient colors and emojis
- **Powered by Gemini AI** for fast and accurate code generation
- **Interactive Chat Mode** - conversational interface for better UX
- **Command History** - track all your previous prompts
- **Configuration Management** - customize settings easily
- **Smart Cleanup** - manage generated files efficiently
- **Endpoint Testing** - test your generated APIs instantly
- **Spring Boot Integration** - create Java projects via Spring Initializr
- **Swagger Support** - generate projects from OpenAPI specs

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your Gemini API key:
   ```bash
   cp .env.example .env
   # Edit .env and add your Gemini API key
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

This opens the beautiful interactive terminal where you can:

- Chat with Sophia to generate mock servers
- Browse command history
- Manage configuration
- Clean generated files
- Test endpoints
- Create Spring Boot projects
- Generate from Swagger files

### Legacy Command Mode

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

## Configuration ⚙️

Sophia uses a `.sophiarc.json` file for configuration. You can manage it through the interactive interface or manually:

```json
{
  "defaultPort": 3000,
  "openBrowser": true,
  "editor": "code",
  "projectDir": "generated"
}
```

## Environment Variables 🔧

Create a `.env` file with your API configuration:

```bash
# Required: Gemini AI API Key
GEMINI_API_KEY=your_gemini_api_key_here
```

Get your Gemini API key from: https://makersuite.google.com/app/apikey

## Examples

### Generate a Simple API

```bash
sophia "create a GET /users endpoint that returns a list of users with id, name, and email"
```

### Create a Complex Mock Server

```bash
sophia "build a REST API for a blog with posts, comments, and users. Include CRUD operations for each resource"
```

### Generate Spring Boot Project

Use the interactive mode and select "Create Spring Boot Project"

## File Structure

```
sophia-cli/
├── bin/
│   └── mock-cli.mjs        # Main CLI entry point
├── lib/
│   ├── generate.mjs        # Code generation logic (Gemini AI)
│   └── runner.mjs          # Server runner
├── generated/              # Generated mock servers
├── logs/
│   └── history.json        # Command history
├── .env                    # Environment variables
├── .sophiarc.json         # Configuration file
└── package.json
```

## Features in Detail 🔍

### Beautiful Interface

- Gradient ASCII art banner
- Color-coded messages and status indicators
- Spinning loaders for operations
- Emoji-rich menu system

### AI-Powered Generation

- Uses Google's Gemini 2.0 Flash model
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

Make sure your `.env` file contains a valid Gemini API key:

```bash
GEMINI_API_KEY=your_actual_api_key_here
```

### Permission Denied

If you get permission errors, try:

```bash
chmod +x bin/mock-cli.mjs
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

**Enjoy using Sophia!**

_"Making mock server generation as easy as having a conversation"_
