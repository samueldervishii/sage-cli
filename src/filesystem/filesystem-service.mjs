import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import chalk from "chalk";
import ora from "ora";
import path from "path";
import fs from "fs";

class FilesystemService {
  constructor() {
    this.client = null;
    this.transport = null;
    this.isConnected = false;

    this.restrictedPaths = [
      "/boot", // Boot loader files
      "/sys", // System kernel interface
      "/proc", // Process information
      "/dev", // Device files
      "/run", // Runtime data
      "/etc/passwd", // User accounts
      "/etc/shadow", // Password hashes
      "/etc/sudoers", // Sudo configuration
      "/etc/fstab", // Filesystem table
      "/etc/crontab", // Cron jobs
      "/var/log/auth.log", // Authentication logs
      "/root", // Root user directory
      "/lib/systemd", // Systemd files
      "/usr/bin/sudo", // Sudo binary
      "/usr/sbin", // System binaries
      "/snap/core", // Core snap system files
      "/etc/ssh/", // SSH configuration and keys
      "/etc/systemd/", // Systemd configuration
      "/etc/security/", // Security policies
      "/etc/pam.d/", // Authentication modules
      "/var/spool/cron/", // User cron jobs
      "/etc/init.d/", // System startup scripts
      "/etc/rc0.d/", // Runlevel scripts rc0.d
      "/etc/rc1.d/", // Runlevel scripts rc1.d
      "/etc/rc2.d/", // Runlevel scripts rc2.d
      "/etc/rc3.d/", // Runlevel scripts rc3.d
      "/etc/rc4.d/", // Runlevel scripts rc4.d
      "/etc/rc5.d/", // Runlevel scripts rc5.d
      "/etc/rc6.d/", // Runlevel scripts rc6.d
      "/etc/rcS.d/", // Runlevel scripts rcS.d
      "/lib/modules/", // Kernel modules
      "/usr/lib/systemd/", // Systemd libraries
      "/etc/hosts", // Network host mappings
      "/etc/resolv.conf", // DNS configuration
      "/var/lib/dpkg/", // Package management data
      "/etc/apt/", // Package sources (Debian/Ubuntu)
      "/etc/yum.repos.d/", // Package repos (RHEL/CentOS)
      "/boot/grub/", // GRUB bootloader
      "/sys/firmware/efi/", // EFI firmware interface
      "/root/.ssh/", // Root SSH keys specifically
      "/home/*/.ssh/", // User SSH keys
      "/home/*/.gnupg/", // GPG keys
      "/home/*/.config/autostart/", // User autostart programs
    ];

    this.allowedPaths = [
      "/home", // User home directories
      "/tmp", // Temporary files
      "/var/tmp", // Temporary files
      "/opt", // Optional software
      "/usr/local", // Local software
      "/var/www", // Web content
      "/etc/nginx", // Nginx config (if exists)
      "/etc/apache2", // Apache config (if exists)
      "/var/lib/docker", // Docker data (if exists)
    ];
  }

  isPathSafe(targetPath) {
    try {
      if (!targetPath || typeof targetPath !== "string") {
        return {
          safe: false,
          reason: "Invalid path: path must be a non-empty string",
        };
      }
      if (targetPath.includes("\x00") || targetPath.includes("\0")) {
        return { safe: false, reason: "Invalid path: null bytes detected" };
      }
      if (targetPath.length > 4096) {
        return { safe: false, reason: "Invalid path: path too long" };
      }

      const normalizedPath = path.normalize(targetPath);
      const resolvedPath = path.resolve(normalizedPath);

      const traversalPatterns = [
        "../",
        "..\\",
        "%2e%2e",
        "%252e%252e", // existing patterns
        ".\\../",
        "./\\../", // Windows variations
        "..%2f",
        "..%5c", // URL encoded variations
        "..\\u002f",
        "..\\u005c", // Unicode encoded
        "%2e%2e%2f",
        "%2e%2e%5c", // double URL encoded
        "\\../",
        "/\\../", // mixed separator attempts
        "....//",
        "..../\\", // multiple dots
        "%c0%af",
        "%c1%9c", // overlong UTF-8 sequences
      ];

      const lowerPath = normalizedPath.toLowerCase();
      for (const pattern of traversalPatterns) {
        if (lowerPath.includes(pattern.toLowerCase())) {
          return { safe: false, reason: "Path traversal attempt detected" };
        }
      }

      const dangerousPatterns = [
        /\.\.(\\|\/)/g,
        /\.(bat|cmd|com|exe|scr|pif|reg|vbs|vbe|js|jar|wsf|wsh)$/i,
        /^\\\\/,
        /(aux|con|prn|nul|lpt[1-9]|com[1-9])$/i,
        /[<>:"|?*]/g,
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(targetPath)) {
          return {
            safe: false,
            reason: "Invalid path: dangerous pattern detected",
          };
        }
      }
      const isRestricted = this.restrictedPaths.some(restricted => {
        if (restricted.includes("*")) {
          const pattern = restricted.replace(/\*/g, "[^/]+");
          const regex = new RegExp(`^${pattern.replace(/\//g, "\\/")}`);
          return regex.test(resolvedPath);
        } else {
          const restrictedResolved = path.resolve(restricted);
          return resolvedPath.startsWith(restrictedResolved);
        }
      });

      if (isRestricted) {
        return { safe: false, reason: "Path is in restricted system area" };
      }

      const sensitiveUserPaths = ["/.ssh/", "/.gnupg/", "/.config/autostart/"];
      const hasSensitiveUserPath = sensitiveUserPaths.some(sensitive =>
        resolvedPath.includes(sensitive)
      );

      if (hasSensitiveUserPath) {
        return {
          safe: false,
          reason: "Access to sensitive user directories restricted",
        };
      }

      const pathDepth = resolvedPath
        .split("/")
        .filter(segment => segment).length;
      if (pathDepth <= 2 && resolvedPath !== "/home") {
        const isExplicitlyAllowed = this.allowedPaths.some(allowed => {
          const allowedResolved = path.resolve(allowed);
          return resolvedPath.startsWith(allowedResolved);
        });

        if (!isExplicitlyAllowed) {
          return {
            safe: false,
            reason: "Root-level access restricted to safe directories",
          };
        }
      }

      const executableExtensions =
        /\.(sh|bat|exe|com|cmd|ps1|py|pl|rb|bin|run|app|deb|rpm|msi|dmg|pkg|so|dll|dylib)$/i;
      if (executableExtensions.test(resolvedPath)) {
        const projectRoot = path.resolve(process.cwd());
        if (!resolvedPath.startsWith(projectRoot)) {
          return {
            safe: false,
            reason:
              "Access to executable files outside project directory restricted",
          };
        }

        const systemExecDirs = [
          "/bin",
          "/sbin",
          "/usr/bin",
          "/usr/sbin",
          "/usr/local/bin",
        ];
        for (const execDir of systemExecDirs) {
          if (resolvedPath.startsWith(path.resolve(execDir))) {
            return {
              safe: false,
              reason: "Access to system executable directories restricted",
            };
          }
        }
      }

      try {
        const stats = fs.lstatSync(resolvedPath);
        if (stats.isSymbolicLink()) {
          const linkTarget = fs.readlinkSync(resolvedPath);
          const linkResolved = path.resolve(
            path.dirname(resolvedPath),
            linkTarget
          );

          const linkSafety = this.isPathSafe(linkResolved);
          if (!linkSafety.safe) {
            return {
              safe: false,
              reason: `Symlink target unsafe: ${linkSafety.reason}`,
            };
          }
        }
      } catch (error) {}

      return { safe: true };
    } catch (error) {
      return { safe: false, reason: "Invalid path format" };
    }
  }

  async connect() {
    if (this.isConnected) {
      return true;
    }

    const spinner = ora("Connecting to filesystem service...").start();

    try {
      const fs = await import("fs");
      const potentialDirs = [
        "/home",
        "/tmp",
        "/var/tmp",
        "/opt",
        "/usr/local",
        "/var/www",
        "/etc/nginx",
        "/etc/apache2",
        "/var/lib/docker",
        process.cwd(),
      ];

      const allowedDirs = [];
      for (const dir of potentialDirs) {
        try {
          await fs.promises.access(dir, fs.constants.F_OK);
          allowedDirs.push(dir);
        } catch (error) {
          continue;
        }
      }

      if (!allowedDirs.includes("/home")) allowedDirs.push("/home");
      if (!allowedDirs.includes(process.cwd())) allowedDirs.push(process.cwd());

      this.transport = new StdioClientTransport({
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-filesystem", ...allowedDirs],
        env: {
          ...process.env,
          MCP_LOG_LEVEL: "error",
          NODE_ENV: "production",
        },
      });

      this.client = new Client({
        name: "sage-filesystem-client",
        version: "1.1.0",
      });

      await this.client.connect(this.transport);
      this.isConnected = true;

      spinner.succeed("Connected to filesystem service");
      return true;
    } catch (error) {
      spinner.fail("Failed to connect to filesystem service");
      console.error(chalk.red("Filesystem service error:"), error.message);
      console.log(chalk.yellow("Installing filesystem MCP server..."));

      try {
        const { spawn } = await import("child_process");
        await new Promise((resolve, reject) => {
          const install = spawn(
            "npm",
            ["install", "-g", "@modelcontextprotocol/server-filesystem"],
            {
              stdio: "inherit",
            }
          );
          install.on("close", code => {
            if (code === 0) resolve();
            else reject(new Error(`Installation failed with code ${code}`));
          });
        });

        console.log(
          chalk.green("Filesystem MCP server installed successfully")
        );
        return await this.connect();
      } catch (installError) {
        console.error(
          chalk.red("Failed to install filesystem MCP server:"),
          installError.message
        );
        return false;
      }
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      try {
        await this.client.close();
        this.isConnected = false;
      } catch (error) {
        console.error(
          chalk.red("Error disconnecting filesystem service:"),
          error.message
        );
      }
    }
  }

  async readFile(filePath, options = {}) {
    const safety = this.isPathSafe(filePath);
    if (!safety.safe) {
      throw new Error(`Access denied: ${safety.reason}`);
    }

    if (!this.isConnected) {
      const connected = await this.connect();
      if (!connected) {
        throw new Error("Failed to connect to filesystem service");
      }
    }

    const spinner = ora(`Reading file: ${filePath}`).start();

    try {
      const tools = await this.client.listTools();

      let readTool = tools.tools.find(
        tool => tool.name === "read_file" || tool.name === "readFile"
      );

      if (!readTool && tools.tools.length > 0) {
        readTool = tools.tools.find(tool => tool.name.includes("read"));
      }

      if (!readTool) {
        throw new Error("No file read tool found in MCP server");
      }

      const result = await this.client.callTool({
        name: readTool.name,
        arguments: {
          path: filePath,
          ...options,
        },
      });

      spinner.succeed(`File read: ${filePath}`);

      return {
        path: filePath,
        content: result.content || [],
        tool_used: readTool.name,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      spinner.fail(`Failed to read file: ${error.message}`);
      throw error;
    }
  }

  async writeFile(filePath, content, options = {}) {
    const safety = this.isPathSafe(filePath);
    if (!safety.safe) {
      throw new Error(`Access denied: ${safety.reason}`);
    }

    if (!this.isConnected) {
      const connected = await this.connect();
      if (!connected) {
        throw new Error("Failed to connect to filesystem service");
      }
    }

    const spinner = ora(`Writing file: ${filePath}`).start();

    try {
      const tools = await this.client.listTools();

      let writeTool = tools.tools.find(
        tool => tool.name === "write_file" || tool.name === "writeFile"
      );

      if (!writeTool && tools.tools.length > 0) {
        writeTool = tools.tools.find(tool => tool.name.includes("write"));
      }

      if (!writeTool) {
        throw new Error("No file write tool found in MCP server");
      }

      const result = await this.client.callTool({
        name: writeTool.name,
        arguments: {
          path: filePath,
          contents: content,
          ...options,
        },
      });

      spinner.succeed(`File written: ${filePath}`);

      return {
        path: filePath,
        result: result.content || [],
        tool_used: writeTool.name,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      spinner.fail(`Failed to write file: ${error.message}`);
      throw error;
    }
  }

  async listDirectory(dirPath, options = {}) {
    const safety = this.isPathSafe(dirPath);
    if (!safety.safe) {
      throw new Error(`Access denied: ${safety.reason}`);
    }

    if (!this.isConnected) {
      const connected = await this.connect();
      if (!connected) {
        throw new Error("Failed to connect to filesystem service");
      }
    }

    try {
      const tools = await this.client.listTools();

      let listTool = tools.tools.find(
        tool =>
          tool.name === "list_directory" ||
          tool.name === "listDirectory" ||
          tool.name === "list"
      );

      if (!listTool && tools.tools.length > 0) {
        listTool = tools.tools.find(tool => tool.name.includes("list"));
      }

      if (!listTool) {
        throw new Error("No directory list tool found in MCP server");
      }

      const result = await this.client.callTool({
        name: listTool.name,
        arguments: {
          path: dirPath,
          ...options,
        },
      });

      return {
        path: dirPath,
        contents: result.content || [],
        tool_used: listTool.name,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      ora().fail(`Failed to list directory: ${error.message}`);
      throw error;
    }
  }

  static detectFileIntent(message) {
    const fileKeywords = [
      "read file",
      "open file",
      "show file",
      "display file",
      "cat ",
      "list files",
      "list directory",
      "show directory",
      "ls ",
      "dir ",
      "write file",
      "create file",
      "save file",
      "edit file",
      "modify file",
      "show me the",
      "what's in",
      "contents of",
      "browse",
      "explore",
      "file system",
      "filesystem",
      "directory structure",
      "folder",
    ];

    const lowerMessage = message.toLowerCase();
    return fileKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  static extractFileOperation(message) {
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes("read") ||
      lowerMessage.includes("show") ||
      lowerMessage.includes("display") ||
      lowerMessage.includes("cat")
    ) {
      return { operation: "read", message };
    }

    if (
      lowerMessage.includes("list") ||
      lowerMessage.includes("ls") ||
      lowerMessage.includes("dir") ||
      lowerMessage.includes("browse")
    ) {
      return { operation: "list", message };
    }

    if (
      lowerMessage.includes("write") ||
      lowerMessage.includes("create") ||
      lowerMessage.includes("save") ||
      lowerMessage.includes("edit")
    ) {
      return { operation: "write", message };
    }

    return { operation: "list", message };
  }

  static formatFileResult(fileResponse) {
    if (!fileResponse || !fileResponse.content) {
      return "No file content available.";
    }

    let formatted = `\n${chalk.cyan("File:")} ${chalk.gray(fileResponse.path)}\n\n`;

    if (Array.isArray(fileResponse.content)) {
      fileResponse.content.forEach(item => {
        if (item.type === "text" && item.text) {
          formatted += item.text;
        } else if (typeof item === "string") {
          formatted += item;
        } else {
          formatted += JSON.stringify(item, null, 2);
        }
      });
    } else if (typeof fileResponse.content === "string") {
      formatted += fileResponse.content;
    } else {
      formatted += JSON.stringify(fileResponse.content, null, 2);
    }

    formatted += `\n${chalk.gray("---")}\n`;
    return formatted;
  }

  static formatDirectoryResult(dirResponse) {
    if (!dirResponse || !dirResponse.contents) {
      return "No directory contents available.";
    }

    let formatted = `\n${chalk.cyan("Directory:")} ${chalk.gray(dirResponse.path)}\n\n`;

    if (Array.isArray(dirResponse.contents)) {
      dirResponse.contents.forEach(item => {
        if (item.type === "text" && item.text) {
          const lines = item.text.split("\n");
          lines.forEach(line => {
            if (line.trim()) {
              formatted += `${chalk.blue("•")} ${line.trim()}\n`;
            }
          });
        } else if (typeof item === "string") {
          formatted += `${chalk.blue("•")} ${item}\n`;
        } else if (item.name) {
          const icon = item.type === "directory" ? "📁" : "📄";
          formatted += `${icon} ${item.name}\n`;
        }
      });
    }

    formatted += `\n${chalk.gray("---")}\n`;
    return formatted;
  }

  getSafePathsInfo() {
    return {
      message: `
${chalk.cyan("Filesystem Access Information:")}

${chalk.green("Accessible Areas:")}
${this.allowedPaths.map(p => `  • ${p}`).join("\n")}
  • Project directories and development files
  • Temporary directories

${chalk.red("Restricted Areas (Security Protected):")}
  • SSH keys and configurations (/etc/ssh/, ~/.ssh/)
  • GPG keys (~/.gnupg/)
  • System authentication (/etc/passwd, /etc/shadow, /etc/pam.d/)
  • Boot and kernel files (/boot, /sys, /proc, /lib/modules/)
  • System services (/etc/systemd/, /etc/init.d/, /usr/lib/systemd/)
  • Package management (/etc/apt/, /var/lib/dpkg/)
  • Network configuration (/etc/hosts, /etc/resolv.conf)
  • User autostart programs (~/.config/autostart/)
  • Cron and scheduled tasks (/etc/crontab, /var/spool/cron/)
  • Root user directory (/root)
  • Device files (/dev)
  • And other critical system areas...

${chalk.yellow("Security Note:")} 
This comprehensive protection prevents accidental system damage
while allowing full development and project file access.

${chalk.cyan("Usage Examples:")}
  • "show me package.json" - Works
  • "list files in /home/samuel/Documents" - Works  
  • "read ~/.ssh/id_rsa" - Blocked (SSH key protection)
  • "show /etc/passwd" - Blocked (system protection)
      `,
      allowedPaths: this.allowedPaths,
      restrictedPaths: this.restrictedPaths,
    };
  }
}

export default FilesystemService;
