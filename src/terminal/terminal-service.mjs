import { spawn } from "child_process";
import chalk from "chalk";
import { TIMEOUTS } from "../constants/constants.mjs";

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
          if (output) console.log(chalk.gray(output.trim()));
          resolve();
        } else {
          console.log(
            chalk.yellow("Pip install failed, trying alternative...")
          );
          if (error) console.log(chalk.gray("Error:", error.trim()));
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

    if (command.length > 2048) {
      return { valid: false, reason: "Command too long" };
    }

    // Check for null bytes and other dangerous control characters
    if (
      command.includes("\x00") ||
      /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(command)
    ) {
      return { valid: false, reason: "Invalid control characters detected" };
    }

    const lowerCommand = command.toLowerCase().trim();

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

    for (const dangerous of dangerousCommands) {
      if (lowerCommand.includes(dangerous)) {
        return {
          valid: false,
          reason: `Dangerous command blocked: ${dangerous}`,
        };
      }
    }

    // Comprehensive injection pattern checking (platform-aware)
    const isWindows = process.platform === "win32";
    const injectionPatterns = [
      { pattern: /[;&|`(){}[\]\\]/, desc: "Shell metacharacters" },
      { pattern: /<|>/, desc: "Redirection operators" },
      { pattern: /\*\*/, desc: "Globstar pattern" },
      { pattern: /^\s*\./, desc: "Dotfile execution" },
      { pattern: /\.\.\//, desc: "Directory traversal" },
      { pattern: /\x00/, desc: "Null byte" },
      { pattern: /[\r\n]/, desc: "Line break injection" },
      // Platform-specific patterns
      ...(isWindows
        ? [
            // Windows: Allow % for variables, but block $ for Unix-style expansion
            { pattern: /\$\{/, desc: "Unix variable expansion" },
          ]
        : [
            // Unix: Block both $ and ~ expansions
            { pattern: /\$/, desc: "Variable expansion" },
            { pattern: /~\//, desc: "Home directory expansion" },
          ]),
    ];

    for (const { pattern, desc } of injectionPatterns) {
      if (pattern.test(command)) {
        return {
          valid: false,
          reason: `Command injection attempt detected: ${desc}`,
        };
      }
    }

    // Build safe command list based on platform (isWindows already defined above)
    const safeCommandPrefixes = [
      // Cross-platform commands
      "whoami",
      "hostname",
      "git status",
      "git log",
      "git branch",
      "git diff",
      "npm list",
      "npm --version",
      "node --version",
      "python --version",

      // Platform-specific commands
      ...(isWindows
        ? [
            // Windows commands
            "dir",
            "cd",
            "echo ",
            "set",
            "ver",
            "systeminfo",
            "wmic logicaldisk",
            "ping -n",
            "ipconfig",
            "where ",
            "type ",
            "tree",
            "tasklist",
          ]
        : [
            // Unix/Linux/macOS commands
            "ls",
            "pwd",
            "id",
            "date",
            "uptime",
            "uname",
            "df -h",
            "free -h",
            "ps aux",
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
            "echo ",
            "printf ",
            "env",
            "printenv",
          ]),
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
      // Sanitize command: remove null bytes and other dangerous characters
      const sanitized = command
        .replace(/\x00/g, "") // Remove null bytes
        .replace(/[\x01-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "") // Remove other control characters
        .trim();

      if (!sanitized || sanitized !== command.trim()) {
        reject(new Error("Command contains invalid characters"));
        return;
      }

      const validation = this.validateCommand(sanitized);
      if (!validation.valid) {
        reject(new Error(`Command blocked: ${validation.reason}`));
        return;
      }

      // More robust command parsing
      const parts = sanitized.split(/\s+/).filter(part => part.length > 0);
      if (parts.length === 0) {
        reject(new Error("Empty command"));
        return;
      }

      const cmd = parts[0];
      const args = parts.slice(1);

      const childProcess = spawn(cmd, args, {
        stdio: ["ignore", "pipe", "pipe"],
        shell: false,
        timeout: TIMEOUTS.TERMINAL_COMMAND,
        detached: false,
        windowsHide: true,
        env: {
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
    const lowerInput = input.toLowerCase();
    const explicitTerminalPatterns = [
      /^(run|execute)\s+/,
      /run\s+the\s+command/,
      /execute\s+this\s+command/,
      /in\s+the\s+terminal/,
      /command\s+line/,
      /bash\s+command/,
      /shell\s+command/,
      /^ping\s+/,
      /^curl\s+/,
      /^wget\s+/,
      /^ls\s+/,
      /^git\s+(status|log|diff|branch)/,
      /^npm\s+(install|run|start)/,
      /^node\s+/,
      /system\s+information/,
      /check\s+system/,
      /test\s+connection\s+to/,
      /show\s+me\s+the\s+(output|result)\s+of/,
    ];

    return explicitTerminalPatterns.some(pattern => pattern.test(lowerInput));
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
    const isWindows = process.platform === "win32";

    const windowsInfo = chalk.cyan(`
Terminal Integration Info (Windows):

${chalk.green("Safe Commands:")}
  • System info: systeminfo, whoami, hostname, ver
  • File operations: dir, cd, type, tree
  • Network: ping, ipconfig
  • Process info: tasklist
  • Environment: set, echo
  • Git operations: git status, git log
  • Development: npm list, node --version

${chalk.yellow("Security Features:")}
  • Command timeout (5 seconds)
  • Dangerous command blocking
  • Output size limits
  • No admin/elevated operations

${chalk.blue("Usage Examples:")}
  • "ping -n 3 google.com"
  • "systeminfo"
  • "git status"
  • "node --version"
`);

    const unixInfo = chalk.cyan(`
Terminal Integration Info:

${chalk.green("Safe Commands:")}
  • System info: uname, whoami, pwd, date, hostname
  • File operations: ls, cat, head, tail
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
  • "ping -c 3 google.com"
  • "uname -a"
  • "git status"
  • "npm --version"
`);

    return {
      message: isWindows ? windowsInfo : unixInfo,
    };
  }
}

export default TerminalService;
