#!/usr/bin/env node

const originalLog = console.log;
console.log = () => {};

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import ConfigManager from "../src/config/config-manager.mjs";

// Get the directory where this script is located
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ debug: false });

// Try to load .env from the installation directory (one level up from bin/)
const installDir = path.resolve(__dirname, "..");
const envPath = path.join(installDir, ".env");

dotenv.config({
  path: envPath,
  debug: false,
});

// Load API keys from ConfigManager into environment variables
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
  }
} catch (error) {
  // Silently fail if config doesn't exist yet
}

console.log = originalLog;

import { parseAndExecuteCommand } from "../src/core/command-parser.mjs";

const args = process.argv.slice(2);

parseAndExecuteCommand(args).catch(error => {
  console.error("Error:", error.message);

  // Exit with appropriate error code
  if (error.code === "ENOENT") {
    process.exit(127); // Command not found
  } else if (error.code === "EACCES") {
    process.exit(126); // Permission denied
  } else if (
    error.message.includes("API_KEY") ||
    error.message.includes("configuration")
  ) {
    process.exit(78); // Configuration error
  } else {
    process.exit(1); // General error
  }
});
