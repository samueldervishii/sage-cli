import fs from "fs-extra";
import path from "path";
import os from "os";
import crypto from "crypto";
import chalk from "chalk";
import { fileURLToPath } from "url";
import { PATHS, DEFAULTS } from "../constants/constants.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ConfigManager {
  constructor() {
    this.configDir = path.join(os.homedir(), ".sage-cli");
    this.configFile = path.join(this.configDir, "config.json");
    this.fallbackEnvFile = path.join(process.cwd(), ".env");
    this.encryptionKey = this.getOrCreateEncryptionKey();
  }

  getOrCreateEncryptionKey() {
    const keyFile = path.join(this.configDir, ".key");
    try {
      if (fs.existsSync(keyFile)) {
        return fs.readFileSync(keyFile, "utf8").trim();
      }
    } catch {
      // Ignore read errors
    }
    const key = crypto.randomBytes(32).toString("hex");
    try {
      fs.ensureDirSync(this.configDir);
      fs.writeFileSync(keyFile, key, { mode: 0o600 });
      return key;
    } catch {
      console.warn(
        chalk.yellow("Warning: Could not create encryption key file")
      );
      return crypto.randomBytes(32).toString("hex");
    }
  }

  encrypt(text) {
    if (!text) return text;
    try {
      // Generate a random IV for each encryption
      const iv = crypto.randomBytes(16);
      // Generate a random salt for key derivation
      const salt = crypto.randomBytes(16);
      // Derive key using scrypt with random salt
      const key = crypto.scryptSync(this.encryptionKey, salt, 32);
      const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
      let encrypted = cipher.update(text, "utf8", "hex");
      encrypted += cipher.final("hex");
      // Format: salt:iv:encrypted (both salt and IV needed for decryption)
      return salt.toString("hex") + ":" + iv.toString("hex") + ":" + encrypted;
    } catch {
      console.warn(chalk.yellow("Warning: Encryption failed, storing plain"));
      return text;
    }
  }

  decrypt(encryptedText) {
    if (!encryptedText) return encryptedText;
    try {
      const parts = encryptedText.split(":");

      // New format with salt: salt:iv:encrypted (3 parts)
      if (parts.length === 3) {
        const salt = Buffer.from(parts[0], "hex");
        const iv = Buffer.from(parts[1], "hex");
        const encrypted = parts[2];
        const key = crypto.scryptSync(this.encryptionKey, salt, 32);
        const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
        let decrypted = decipher.update(encrypted, "hex", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted;
      }
      // Old format with hardcoded salt: iv:encrypted (2 parts)
      // Note: Uses hardcoded salt for backward compatibility with older configs
      // This is intentionally kept as-is to not break existing installations
      else if (parts.length === 2) {
        const iv = Buffer.from(parts[0], "hex");
        const encrypted = parts[1];
        const key = crypto.scryptSync(this.encryptionKey, "salt", 32);
        const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
        let decrypted = decipher.update(encrypted, "hex", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted;
      }
      // Legacy format: deprecated createDecipher (removed in Node 17+)
      // Gracefully handle by returning encrypted text if method unavailable
      else {
        // Check if deprecated method exists (Node <17)
        if (typeof crypto.createDecipher === "function") {
          const decipher = crypto.createDecipher(
            "aes-256-cbc",
            this.encryptionKey
          );
          let decrypted = decipher.update(encryptedText, "hex", "utf8");
          decrypted += decipher.final("utf8");
          return decrypted;
        } else {
          // Method removed in Node 17+, cannot decrypt legacy format
          console.warn(
            chalk.yellow(
              "Warning: Cannot decrypt legacy format on Node.js 17+. Please reconfigure API keys."
            )
          );
          return encryptedText;
        }
      }
    } catch {
      return encryptedText;
    }
  }

  async ensureConfigDir() {
    try {
      await fs.ensureDir(this.configDir);
      await fs.chmod(this.configDir, 0o700);
    } catch (error) {
      console.warn(
        chalk.yellow(
          `Warning: Could not create config directory: ${error.message}`
        )
      );
    }
  }

  async loadConfig() {
    try {
      if (await fs.pathExists(this.configFile)) {
        const configData = await fs.readJSON(this.configFile);
        let needsReEncryption = false;

        if (configData.apiKeys) {
          Object.keys(configData.apiKeys).forEach(key => {
            const encryptedValue = configData.apiKeys[key];
            // Check if using old encryption format (only 2 parts: iv:encrypted)
            if (encryptedValue && encryptedValue.split(":").length === 2) {
              needsReEncryption = true;
            }
            configData.apiKeys[key] = this.decrypt(encryptedValue);
          });

          // If old format detected, re-encrypt with new secure format
          if (needsReEncryption) {
            await this.saveConfig(configData);
            console.log(
              chalk.green("Config upgraded to new secure encryption format")
            );
          }
        }
        return configData;
      }

      return await this.migrateFromEnv();
    } catch (error) {
      console.warn(
        chalk.yellow(`Warning: Could not load config: ${error.message}`)
      );
      return this.getDefaultConfig();
    }
  }

  async saveConfig(config) {
    try {
      await this.ensureConfigDir();
      const configToSave = JSON.parse(JSON.stringify(config));
      if (configToSave.apiKeys) {
        Object.keys(configToSave.apiKeys).forEach(key => {
          if (configToSave.apiKeys[key]) {
            configToSave.apiKeys[key] = this.encrypt(configToSave.apiKeys[key]);
          }
        });
      }

      await fs.writeJSON(this.configFile, configToSave, {
        spaces: 2,
        mode: 0o600,
      });

      console.log(chalk.green(`Configuration saved to ${this.configFile}`));
      return true;
    } catch (error) {
      console.error(chalk.red(`Error saving config: ${error.message}`));
      return false;
    }
  }

  async migrateFromEnv() {
    try {
      if (!(await fs.pathExists(this.fallbackEnvFile))) {
        return this.getDefaultConfig();
      }

      console.log(chalk.blue("Migrating configuration from .env file..."));

      const envContent = await fs.readFile(this.fallbackEnvFile, "utf8");
      const envVars = {};

      envContent.split("\n").forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const [key, ...valueParts] = trimmed.split("=");
          if (key && valueParts.length > 0) {
            envVars[key.trim()] = valueParts
              .join("=")
              .trim()
              .replace(/['"]/g, "");
          }
        }
      });

      const config = this.getDefaultConfig();

      if (envVars.GEMINI_API_KEY) {
        config.apiKeys.gemini = envVars.GEMINI_API_KEY;
      }
      if (envVars.OPENAI_API_KEY) {
        config.apiKeys.openai = envVars.OPENAI_API_KEY;
      }
      if (envVars.SERPER_API_KEY) {
        config.apiKeys.serper = envVars.SERPER_API_KEY;
      }
      if (envVars.OPENROUTER_API_KEY) {
        config.apiKeys.openrouter = envVars.OPENROUTER_API_KEY;
      }
      if (envVars.GEMINI_MODEL) {
        config.preferences.geminiModel = envVars.GEMINI_MODEL;
      }
      if (envVars.OPENROUTER_MODEL) {
        config.preferences.openrouterModel = envVars.OPENROUTER_MODEL;
      }

      const saved = await this.saveConfig(config);
      if (saved) {
        console.log(chalk.green("Configuration migrated successfully!"));
        console.log(
          chalk.dim("Your API keys are now stored securely in ~/.sage-cli/")
        );
      }

      return config;
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Migration failed: ${error.message}`));
      return this.getDefaultConfig();
    }
  }

  getDefaultConfig() {
    // Try to load version from package.json, fallback to DEFAULTS.VERSION
    let version = DEFAULTS.VERSION;
    try {
      const packagePath = path.join(__dirname, PATHS.PACKAGE);
      const packageData = fs.readJsonSync(packagePath);
      version = packageData.version || DEFAULTS.VERSION;
    } catch (_error) {
      // Use fallback version if package.json can't be read
    }

    return {
      version: version,
      apiKeys: {
        gemini: null,
        openai: null,
        serper: null,
        openrouter: null,
      },
      preferences: {
        defaultModel: "gemini",
        geminiModel: DEFAULTS.GEMINI_MODEL,
        openrouterModel: "deepseek/deepseek-r1-distill-llama-70b:free",
        outputFormat: "detailed",
        autoUpdate: true,
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  async getApiKey(provider) {
    const config = await this.loadConfig();
    return config.apiKeys?.[provider] || null;
  }

  async getGeminiModel() {
    // Check environment variable first (highest priority)
    if (process.env.GEMINI_MODEL) {
      return process.env.GEMINI_MODEL;
    }

    // Then check config
    const config = await this.loadConfig();
    if (config.preferences?.geminiModel) {
      return config.preferences.geminiModel;
    }

    // Fall back to default
    return DEFAULTS.GEMINI_MODEL;
  }

  async setApiKey(provider, key) {
    const config = await this.loadConfig();
    if (!config.apiKeys) {
      config.apiKeys = {};
    }
    config.apiKeys[provider] = key;
    config.lastUpdated = new Date().toISOString();
    return await this.saveConfig(config);
  }

  async getPreference(key, defaultValue = null) {
    const config = await this.loadConfig();
    return config.preferences?.[key] ?? defaultValue;
  }

  async setPreference(key, value) {
    const config = await this.loadConfig();
    if (!config.preferences) {
      config.preferences = {};
    }
    config.preferences[key] = value;
    config.lastUpdated = new Date().toISOString();
    return await this.saveConfig(config);
  }

  async hasValidConfig() {
    try {
      const config = await this.loadConfig();
      return !!(config.apiKeys?.gemini || config.apiKeys?.openai);
    } catch {
      return false;
    }
  }

  async getConfigInfo() {
    const config = await this.loadConfig();
    const hasGemini = !!config.apiKeys?.gemini;
    const hasOpenAI = !!config.apiKeys?.openai;
    const hasSerper = !!config.apiKeys?.serper;

    return {
      configPath: this.configFile,
      hasValidConfig: hasGemini || hasOpenAI,
      providers: {
        gemini: hasGemini,
        openai: hasOpenAI,
        serper: hasSerper,
      },
      preferences: config.preferences || {},
      version: config.version,
      lastUpdated: config.lastUpdated,
    };
  }

  async resetConfig() {
    try {
      if (await fs.pathExists(this.configFile)) {
        await fs.remove(this.configFile);
      }
      console.log(chalk.green("Configuration reset"));
      return true;
    } catch (error) {
      console.error(chalk.red(`Error resetting config: ${error.message}`));
      return false;
    }
  }
}

export default ConfigManager;
