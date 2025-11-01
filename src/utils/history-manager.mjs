import fs from "fs-extra";
import path from "path";
import os from "os";
import readline from "readline";
import chalk from "chalk";

class HistoryManager {
  constructor() {
    this.historyPath = path.join(
      os.homedir(),
      ".local",
      "bin",
      "sage-cli",
      "command-history.json"
    );
    this.history = [];
    this.loadHistory();
  }

  async loadHistory() {
    try {
      if (await fs.pathExists(this.historyPath)) {
        const data = await fs.readJson(this.historyPath);
        this.history = data.commands || [];
      }
    } catch (error) {
      this.history = [];
    }
  }

  async saveHistory() {
    try {
      await fs.ensureDir(path.dirname(this.historyPath));
      await fs.writeJson(
        this.historyPath,
        {
          commands: this.history.slice(-100), // Keep last 100 commands
          lastUpdated: new Date().toISOString(),
        },
        { spaces: 2 }
      );
    } catch (error) {
      // Silently fail if we can't save history
    }
  }

  async addCommand(command) {
    if (!command || !command.trim()) return;

    // Don't add duplicate consecutive commands
    if (
      this.history.length > 0 &&
      this.history[this.history.length - 1] === command
    ) {
      return;
    }

    this.history.push(command);
    await this.saveHistory();
  }

  getHistory() {
    return [...this.history];
  }

  async promptWithHistory(message = "> ") {
    await this.loadHistory(); // Reload to get latest

    return new Promise((resolve, reject) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true,
        historySize: 100,
      });

      // Load history into readline (only slash commands)
      if (this.history.length > 0) {
        // Manually set history by accessing internal property
        // This is a workaround since readline doesn't expose a direct method
        rl.history = [...this.history].reverse(); // Reverse because readline stores newest first
      }

      rl.question(chalk.cyan(message), async answer => {
        rl.close();
        // Don't save here - let the caller decide what to save
        resolve(answer);
      });

      rl.on("SIGINT", () => {
        rl.close();
        reject(new Error("User interrupted"));
      });
    });
  }

  async showHistory() {
    await this.loadHistory();

    if (this.history.length === 0) {
      console.log(chalk.yellow("No command history found."));
      return;
    }

    console.log(
      chalk.cyan(`\nCommand History (${this.history.length} entries):\n`)
    );

    const displayCount = Math.min(20, this.history.length);
    const startIndex = this.history.length - displayCount;

    for (let i = startIndex; i < this.history.length; i++) {
      console.log(chalk.gray(`${i + 1}.`), chalk.white(this.history[i]));
    }

    if (this.history.length > 20) {
      console.log(
        chalk.gray(`\n... and ${this.history.length - 20} more entries`)
      );
    }
  }

  async clearHistory() {
    this.history = [];
    await this.saveHistory();
    console.log(chalk.green("Command history cleared."));
  }
}

export default HistoryManager;
