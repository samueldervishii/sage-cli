#!/usr/bin/env node

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import ConfigManager from "../src/config/config-manager.mjs";
import SageAPIServer from "../src/api/server.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ debug: false });

const installDir = path.resolve(__dirname, "..");
const envPath = path.join(installDir, ".env");
dotenv.config({ path: envPath, debug: false });

// Load API keys from ConfigManager
try {
  const configManager = new ConfigManager();
  const config = await configManager.loadConfig();

  if (config.apiKeys) {
    if (config.apiKeys.gemini) {
      process.env.GEMINI_API_KEY = config.apiKeys.gemini;
    }
    if (config.apiKeys.openai) {
      process.env.OPENAI_API_KEY = config.apiKeys.openai;
    }
    if (config.apiKeys.serper) {
      process.env.SERPER_API_KEY = config.apiKeys.serper;
    }
    if (config.apiKeys.openrouter) {
      process.env.OPENROUTER_API_KEY = config.apiKeys.openrouter;
    }
  }
} catch (error) {
  console.error("⚠ Warning: Could not load configuration");
  if (process.env.DEBUG) {
    console.error("Config loading failed:", error.message);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const portArg = args.find(arg => arg.startsWith("--port="));
const port = portArg
  ? parseInt(portArg.split("=")[1])
  : process.env.PORT || 3000;

// Start API server
const server = new SageAPIServer(port);

server
  .start()
  .then(() => {
    console.log("✓ Server started successfully");
    console.log(`\nPress Ctrl+C to stop the server\n`);
  })
  .catch(error => {
    console.error("✗ Failed to start server:", error.message);
    process.exit(1);
  });

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("\n\nShutting down gracefully...");
  await server.stop();
  console.log("✓ Server stopped");
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("\n\nShutting down gracefully...");
  await server.stop();
  console.log("✓ Server stopped");
  process.exit(0);
});
