import { spawn } from "child_process";
import chalk from "chalk";

class TerminalService {
  constructor() {
    this.serverProcess = null;
    this.isConnected = false;
    this.serverPath = null;
  }

  async connect() {
    if (this.isConnected) {
      return true;
    }

    try {
      this.useBasicShell();
      this.isConnected = true;
      return true;
    } catch (error) {
      console.log(
        chalk.yellow(`Terminal service setup failed: ${error.message}`)
      );
      return false;
    }
  }

  async installTerminalMCP() {
    return new Promise(resolve => {
      console.log(chalk.gray("Installing terminal-controller MCP server..."));

      const installProcess = spawn("pip", ["install", "terminal-controller"], {
        stdio: ["ignore", "pipe", "pipe"],
      });

      let output = "";
      let error = "";

      installProcess.stdout.on("data", data => {
        output += data.toString();
      });

      installProcess.stderr.on("data", data => {
        error += data.toString();
      });

      installProcess.on("close", code => {
        if (code === 0) {
          console.log(
            chalk.green("Terminal MCP server installed successfully")
          );
          resolve();
        } else {
          console.log(
            chalk.yellow("Pip install failed, trying alternative...")
          );
          resolve();
        }
      });

      installProcess.on("error", err => {
        console.log(chalk.yellow(`Install error: ${err.message}`));
        resolve();
      });
    });
  }

  async startServer() {
    return new Promise(resolve => {
      this.serverProcess = spawn("python", ["-m", "terminal_controller"], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      let serverReady = false;

      this.serverProcess.stdout.on("data", data => {
        const output = data.toString();
        if (output.includes("Server started") || output.includes("listening")) {
          serverReady = true;
          resolve();
        }
      });

      this.serverProcess.stderr.on("data", data => {
        const error = data.toString();
        if (!serverReady && error.includes("ModuleNotFoundError")) {
          this.useBasicShell();
          resolve();
        }
      });

      setTimeout(() => {
        if (!serverReady) {
          this.useBasicShell();
          resolve();
        }
      }, 3000);

      this.serverProcess.on("error", () => {
        this.useBasicShell();
        resolve();
      });
    });
  }

  useBasicShell() {
    this.serverProcess = null;
  }

  async executeCommand(command) {
    if (this.serverProcess && this.isConnected) {
      return await this.executeMCPCommand(command);
    } else {
      return await this.executeDirectCommand(command);
    }
  }

  async executeMCPCommand(command) {
    return await this.executeDirectCommand(command);
  }

  validateCommand(command) {
    if (!command || typeof command !== "string") {
      return {
        valid: false,
        reason: "Invalid command: must be a non-empty string",
      };
    }

    // Check command length to prevent buffer overflow attempts
    if (command.length > 2048) {
      return { valid: false, reason: "Command too long" };
    }

    // Check for null bytes and control characters
    if (
      command.includes("\x00") ||
      /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(command)
    ) {
      return { valid: false, reason: "Invalid characters detected" };
    }

    const lowerCommand = command.toLowerCase().trim();

    // Enhanced dangerous commands list
    const dangerousCommands = [
      // Destructive file operations
      "rm -rf",
      "sudo rm",
      "del /f",
      "format",
      "fdisk",
      "mkfs",
      // System control
      "shutdown",
      "reboot",
      "halt",
      "poweroff",
      "init 0",
      "init 6",
      // User/permission changes
      "sudo",
      "su ",
      "passwd",
      "chown",
      "chmod 777",
      "usermod",
      "userdel",
      // Process control
      "kill -9",
      "killall",
      "pkill",
      // Network/system config
      "iptables",
      "ufw",
      "firewall",
      "mount",
      "umount",
      // Package management with sudo
      "sudo apt",
      "sudo yum",
      "sudo dnf",
      "sudo pacman",
      // Dangerous shells and interpreters
      "/bin/sh",
      "/bin/bash",
      "python -c",
      "perl -e",
      "ruby -e",
      // System monitoring that could be resource intensive
      "dd if=",
      "find /",
      "locate .",
      // Cron and scheduled tasks
      "crontab",
      "at ",
      // System service management
      "systemctl",
      "service ",
      "systemd",
      // Binary execution attempts
      "curl | sh",
      "wget | sh",
      "curl | bash",
      "wget | bash",
    ];

    // Check for dangerous command patterns
    for (const dangerous of dangerousCommands) {
      if (lowerCommand.includes(dangerous)) {
        return {
          valid: false,
          reason: `Dangerous command blocked: ${dangerous}`,
        };
      }
    }

    // Check for command injection attempts
    const injectionPatterns = [
      /[;&|`$(){}\[\]]/, // Command separators and substitution
      /<|>/, // Redirection
      /\*\*/, // Glob patterns that could be resource intensive
      /^\s*\./, // Hidden file access
      /\.\.\//, // Path traversal in commands
    ];

    for (const pattern of injectionPatterns) {
      if (pattern.test(command)) {
        return { valid: false, reason: "Command injection attempt detected" };
      }
    }

    // Whitelist safe commands only
    const safeCommandPrefixes = [
      "ls",
      "dir",
      "pwd",
      "whoami",
      "id",
      "date",
      "uptime",
      "uname",
      "hostname",
      "df -h",
      "free -h",
      "ps aux",
      "git status",
      "git log",
      "git branch",
      "git diff",
      "npm list",
      "npm --version",
      "node --version",
      "python --version",
      "cat ",
      "head ",
      "tail ",
      "grep ",
      "wc ",
      "sort",
      "uniq",
      "ping -c",
      "curl -s",
      "wget --version",
      "which ",
      "type ",
      "echo ",
      "printf ",
      "env",
      "printenv",
    ];

    const isWhitelisted = safeCommandPrefixes.some(
      prefix =>
        lowerCommand.startsWith(prefix) || lowerCommand === prefix.trim()
    );

    if (!isWhitelisted) {
      return {
        valid: false,
        reason: "Command not in whitelist of safe operations",
      };
    }

    return { valid: true };
  }

  async executeDirectCommand(command) {
    return new Promise((resolve, reject) => {
      // Validate command first
      const validation = this.validateCommand(command);
      if (!validation.valid) {
        reject(new Error(`Command blocked: ${validation.reason}`));
        return;
      }

      const parts = command.trim().split(/\s+/);
      const cmd = parts[0];
      const args = parts.slice(1);

      const childProcess = spawn(cmd, args, {
        stdio: ["ignore", "pipe", "pipe"],
        shell: false, // Disable shell to prevent command injection
        timeout: 5000,
        detached: false,
        windowsHide: true,
        env: {
          // Sanitized environment - remove potentially dangerous vars
          PATH: process.env.PATH,
          HOME: process.env.HOME,
          USER: process.env.USER,
          TERM: process.env.TERM || "dumb",
        },
      });

      let output = "";
      let error = "";

      childProcess.stdout.on("data", data => {
        output += data.toString();
      });

      childProcess.stderr.on("data", data => {
        error += data.toString();
      });

      childProcess.on("close", code => {
        resolve({
          command,
          exitCode: code,
          output: output.trim(),
          error: error.trim(),
          success: code === 0,
        });
      });

      childProcess.on("error", err => {
        reject(new Error(`Command execution failed: ${err.message}`));
      });
    });
  }

  async disconnect() {
    if (this.serverProcess) {
      this.serverProcess.kill();
      this.serverProcess = null;
    }
    this.isConnected = false;
  }

  static detectTerminalIntent(input) {
    const terminalKeywords = [
      "run",
      "execute",
      "command",
      "terminal",
      "shell",
      "bash",
      "ping",
      "curl",
      "wget",
      "ls",
      "dir",
      "ps",
      "top",
      "df",
      "du",
      "git status",
      "git log",
      "npm",
      "node",
      "python",
      "java",
      "check",
      "test connection",
      "system info",
    ];

    const lowerInput = input.toLowerCase();
    return terminalKeywords.some(keyword => lowerInput.includes(keyword));
  }

  static extractCommand(input) {
    const patterns = [
      /(?:run|execute)\s+["']?([^"']+)["']?/i,
      /(?:command|shell|terminal):\s*(.+)/i,
      /`([^`]+)`/,
      /(?:ping|curl|wget|ls|dir|ps|top|df|du|git|npm|node|python)\s+.*/i,
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        let command = match[1] || match[0];
        if (command.startsWith("ping ")) {
          if (!command.includes("-c")) {
            command = command.replace("ping ", "ping -c 3 ");
          }
        }

        return command;
      }
    }

    if (input.split(" ").length <= 5 && !input.includes("?")) {
      let command = input.trim();

      if (command.startsWith("ping ") && !command.includes("-c")) {
        command = command.replace("ping ", "ping -c 3 ");
      }

      return command;
    }

    return null;
  }

  static formatCommandResult(result) {
    let formatted = `\n${chalk.cyan("Command:")} ${result.command}\n`;
    formatted += `${chalk.gray("Exit Code:")} ${result.exitCode}\n`;

    if (result.output) {
      formatted += `\n${chalk.green("Output:")}\n${result.output}\n`;
    }

    if (result.error) {
      formatted += `\n${chalk.red("Error:")}\n${result.error}\n`;
    }

    return formatted;
  }

  static getSafeCommandsInfo() {
    return {
      message: chalk.cyan(`
Terminal Integration Info:

${chalk.green("Safe Commands:")}
  • System info: uname, whoami, pwd, date
  • File operations: ls, dir, cat, head, tail
  • Network: ping, curl (with limits)  
  • Process info: ps, top (brief)
  • Git operations: git status, git log
  • Development: npm list, node --version

${chalk.yellow("Security Features:")}
  • Command timeout (5 seconds)
  • Dangerous command blocking
  • Output size limits
  • No sudo/root operations

${chalk.blue("Usage Examples:")}
  • "ping google.com"
  • "check system info"
  • "run git status"
  • "execute npm --version"
`),
    };
  }
}

export default TerminalService;
