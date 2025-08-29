import fs from "fs-extra";
import path from "path";
import os from "os";
import crypto from "crypto";
import chalk from "chalk";

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
    } catch (error) {}
    const key = crypto.randomBytes(32).toString("hex");
    try {
      fs.ensureDirSync(this.configDir);
      fs.writeFileSync(keyFile, key, { mode: 0o600 });
      return key;
    } catch (error) {
      console.warn(
        chalk.yellow("Warning: Could not create encryption key file")
      );
      return crypto.randomBytes(32).toString("hex");
    }
  }

  encrypt(text) {
    if (!text) return text;
    try {
      const cipher = crypto.createCipher("aes-256-cbc", this.encryptionKey);
      let encrypted = cipher.update(text, "utf8", "hex");
      encrypted += cipher.final("hex");
      return encrypted;
    } catch (error) {
      console.warn(chalk.yellow("Warning: Encryption failed, storing plain"));
      return text;
    }
  }

  decrypt(encryptedText) {
    if (!encryptedText) return encryptedText;
    try {
      const decipher = crypto.createDecipher("aes-256-cbc", this.encryptionKey);
      let decrypted = decipher.update(encryptedText, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (error) {
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
        if (configData.apiKeys) {
          Object.keys(configData.apiKeys).forEach(key => {
            configData.apiKeys[key] = this.decrypt(configData.apiKeys[key]);
          });
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

      console.log(chalk.green(`✓ Configuration saved to ${this.configFile}`));
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

      const saved = await this.saveConfig(config);
      if (saved) {
        console.log(chalk.green("✓ Configuration migrated successfully!"));
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
    return {
      version: "0.0.10-beta",
      apiKeys: {
        gemini: null,
        openai: null,
        serper: null,
      },
      preferences: {
        defaultModel: "gemini",
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
    } catch (error) {
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
      console.log(chalk.green("✓ Configuration reset"));
      return true;
    } catch (error) {
      console.error(chalk.red(`Error resetting config: ${error.message}`));
      return false;
    }
  }
}

export default ConfigManager;
