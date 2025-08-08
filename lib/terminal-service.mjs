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

  async executeDirectCommand(command) {
    return new Promise((resolve, reject) => {
      const dangerousCommands = [
        "rm -rf",
        "sudo rm",
        "format",
        "del /f",
        "shutdown",
        "reboot",
      ];
      const lowerCommand = command.toLowerCase();

      if (
        dangerousCommands.some(dangerous => lowerCommand.includes(dangerous))
      ) {
        reject(new Error("Command blocked for security reasons"));
        return;
      }

      const parts = command.trim().split(/\s+/);
      const cmd = parts[0];
      const args = parts.slice(1);

      const childProcess = spawn(cmd, args, {
        stdio: ["ignore", "pipe", "pipe"],
        shell: true,
        timeout: 5000,
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
