import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import os from "os";

class Logger {
  constructor() {
    this.logDir = path.join(os.homedir(), ".sage-cli", "logs");
    this.logFile = path.join(this.logDir, `sage-${this.getDateString()}.log`);
    this.debugMode =
      process.env.SAGE_DEBUG === "true" || process.env.DEBUG === "true";
    this.initializeLogDirectory();
  }

  getDateString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  initializeLogDirectory() {
    try {
      fs.ensureDirSync(this.logDir);
      // Clean up old logs (keep last 7 days)
      this.cleanOldLogs();
    } catch (error) {
      console.error(
        chalk.yellow("Warning: Could not initialize log directory"),
        error.message
      );
    }
  }

  cleanOldLogs() {
    try {
      const files = fs.readdirSync(this.logDir);
      const now = Date.now();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

      files.forEach(file => {
        const filePath = path.join(this.logDir, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
        }
      });
      // eslint-disable-next-line no-unused-vars
    } catch (error) {
      // Silent fail for cleanup
    }
  }

  formatLogEntry(level, message, data = null) {
    const timestamp = new Date().toISOString();
    let logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    if (data) {
      if (data instanceof Error) {
        logEntry += `\n  Error: ${data.message}\n  Stack: ${data.stack}`;
      } else if (typeof data === "object") {
        logEntry += `\n  Data: ${JSON.stringify(data, null, 2)}`;
      } else {
        logEntry += `\n  Data: ${data}`;
      }
    }

    return logEntry + "\n";
  }

  writeToFile(level, message, data = null) {
    try {
      const logEntry = this.formatLogEntry(level, message, data);
      fs.appendFileSync(this.logFile, logEntry);
      // eslint-disable-next-line no-unused-vars
    } catch (error) {
      // Silent fail for file writing
    }
  }

  debug(message, data = null) {
    this.writeToFile("debug", message, data);
    if (this.debugMode) {
      console.log(chalk.gray(`[DEBUG] ${message}`));
      if (data) {
        console.log(chalk.gray(JSON.stringify(data, null, 2)));
      }
    }
  }

  info(message, data = null) {
    this.writeToFile("info", message, data);
    if (this.debugMode) {
      console.log(chalk.blue(`[INFO] ${message}`));
    }
  }

  warn(message, data = null) {
    this.writeToFile("warn", message, data);
    console.log(chalk.yellow(`[WARN] ${message}`));
    if (data && this.debugMode) {
      console.log(chalk.yellow(JSON.stringify(data, null, 2)));
    }
  }

  error(message, error = null) {
    this.writeToFile("error", message, error);
    console.error(chalk.red(`[ERROR] ${message}`));

    if (error) {
      if (error instanceof Error) {
        console.error(chalk.red(`  ${error.message}`));
        if (this.debugMode && error.stack) {
          console.error(chalk.gray(error.stack));
        }
      } else {
        console.error(chalk.red(JSON.stringify(error, null, 2)));
      }
    }

    // Provide helpful hint about debug mode
    if (!this.debugMode) {
      console.log(chalk.gray(`  (Run with SAGE_DEBUG=true for more details)`));
    }
  }

  success(message) {
    this.writeToFile("success", message);
    console.log(chalk.green(`${message}`));
  }

  logRequest(service, action, details = null) {
    const message = `${service} - ${action}`;
    this.debug(message, details);
  }

  logResponse(service, action, success, details = null) {
    const status = success ? "SUCCESS" : "FAILED";
    const message = `${service} - ${action} - ${status}`;

    if (success) {
      this.info(message, details);
    } else {
      this.error(message, details);
    }
  }

  getLogPath() {
    return this.logFile;
  }
}

// Singleton instance
const logger = new Logger();

export default logger;
