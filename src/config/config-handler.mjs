import path from "path";
import os from "os";
import dotenv from "dotenv";
import ConfigManager from "./config-manager.mjs";

export async function reloadEnvVars() {
  const originalLog = console.log;
  console.log = () => {};

  dotenv.config({ override: true, debug: false });
  dotenv.config({
    path: path.join(os.homedir(), ".local", "bin", "sage-cli", ".env"),
    override: true,
    debug: false,
  });

  // Load API keys from ConfigManager into environment
  try {
    const configManager = new ConfigManager();
    const config = await configManager.loadConfig();

    if (config.apiKeys) {
      if (config.apiKeys.gemini && !process.env.GEMINI_API_KEY) {
        process.env.GEMINI_API_KEY = config.apiKeys.gemini;
      }
      if (config.apiKeys.openai && !process.env.OPENAI_API_KEY) {
        process.env.OPENAI_API_KEY = config.apiKeys.openai;
      }
      if (config.apiKeys.serper && !process.env.SERPER_API_KEY) {
        process.env.SERPER_API_KEY = config.apiKeys.serper;
      }
    }
  } catch {
    // Silently fail if config doesn't exist yet
  }

  console.log = originalLog;
}
