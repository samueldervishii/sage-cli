# Sage Playground

A modern web interface for the Sage AI Assistant API, built with React and Vite.

## Features

- **Chat Playground**: Interactive chat interface with multiple AI models
  - Support for Gemini and GPT models
  - Adjustable temperature and max tokens
  - System prompt configuration
  - Real-time message streaming

- **Memory Explorer**: Browse, search, and manage AI memories
  - View all stored memories
  - Search through memories
  - Add new memories
  - Clear memory storage
  - View memory statistics

- **History**: Access and manage conversation history
  - Browse past conversations
  - View conversation details
  - Export conversations as JSON
  - Clean old conversations

- **API Documentation**: Complete API reference
  - Endpoint documentation
  - Request/response examples
  - cURL examples
  - Quick start guide

## Getting Started

### Prerequisites

- Node.js 16+ installed
- Sage API server running (default: http://localhost:3000)

### Installation

1. Install dependencies:

```bash
npm install
```

2. Configure the API URL (optional):

```bash
cp .env.example .env
# Edit .env to change VITE_API_URL if needed
```

3. Start the development server:

```bash
npm run dev
```

The playground will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The production-ready files will be in the `dist` directory.

## Configuration

### Environment Variables

- `VITE_API_URL`: The base URL for the Sage API server (default: `http://localhost:3000`)

## Development

### Project Structure

```
playground/
├── src/
│   ├── components/     # Reusable components
│   │   └── Layout.jsx  # Main layout with sidebar
│   ├── contexts/       # React contexts
│   │   └── AppContext.jsx
│   ├── pages/          # Page components
│   │   ├── ChatPlayground.jsx
│   │   ├── MemoryExplorer.jsx
│   │   ├── History.jsx
│   │   └── ApiDocs.jsx
│   ├── services/       # API services
│   │   └── api.js
│   ├── App.jsx         # Root component
│   └── main.jsx        # Entry point
├── public/             # Static assets
└── index.html          # HTML template
```

### Tech Stack

- **React 18**: UI framework
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **Headless UI**: Unstyled, accessible UI components
- **Heroicons**: Beautiful hand-crafted SVG icons
- **Axios**: HTTP client for API requests

## Usage

### Starting the API Server

Before using the playground, make sure the Sage API server is running:

```bash
# From the sage-cli root directory
npm run api
```

Or with a custom port:

```bash
npm run api -- --port=3001
```

### Using the Playground

1. **Chat**: Select a model, adjust settings, and start chatting
2. **Memory**: View and manage memories, search for specific content
3. **History**: Browse past conversations and export them
4. **API Docs**: Reference for all available API endpoints

## Dark Mode

The playground supports dark mode, which can be toggled from the top-right corner of the interface.

## License

Part of the Sage CLI project.
