#!/usr/bin/env node

import dotenv from "dotenv";
dotenv.config();

import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import fs from "fs-extra";
import chalk from "chalk";
import gradient from "gradient-string";
import inquirer from "inquirer";
import ora from "ora";
import axios from "axios";
import SimpleChat from "../lib/simple-chat.mjs";
import FilesystemService from "../lib/filesystem-service.mjs";
import TerminalService from "../lib/terminal-service.mjs";
import SetupWizard from "../lib/setup-wizard.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function displayBanner() {
  const banner = gradient([
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
  ])(
    `
   ███████  ██████  ██████  ██   ██ ██  █████  
   ██      ██    ██ ██   ██ ██   ██ ██ ██   ██ 
   ███████ ██    ██ ██████  ███████ ██ ███████ 
        ██ ██    ██ ██      ██   ██ ██ ██   ██ 
   ███████  ██████  ██      ██   ██ ██ ██   ██ 
   `
  );
  console.log(banner);

  const subtitle = chalk.cyan("Your Interactive AI Assistant");
  const author = `${chalk.cyan("Created by")} ${chalk.italic.bold.blueBright(`\u001b]8;;https://github.com/samueldervishii\u0007Samuel\u001b]8;;\u0007`)}`;
  const version = chalk.underline.cyan("Version: 0.0.1-beta");

  const padding = "   ";
  console.log(
    padding +
      chalk.underline(subtitle) +
      "  " +
      chalk.underline(author) +
      "  " +
      version
  );
}

async function showVersion() {
  const packagePath = path.join(__dirname, "../package.json");
  const packageData = await fs.readJson(packagePath);

  displayBanner();
  console.log();
  console.log(chalk.cyan(`Version: ${packageData.version}`));
  console.log(chalk.gray(`Node.js: ${process.version}`));
  console.log(chalk.gray(`Platform: ${process.platform} ${process.arch}`));

  const buildInfo = await getBuildInfo();
  if (buildInfo) {
    console.log(chalk.gray(`Build: ${buildInfo.hash} (${buildInfo.date})`));
  }
}

async function getBuildInfo() {
  try {
    const { stdout } = await new Promise(resolve => {
      const child = spawn("git", ["rev-parse", "--short", "HEAD"], {
        cwd: __dirname + "/..",
        stdio: ["ignore", "pipe", "ignore"],
      });

      let output = "";
      child.stdout.on("data", data => (output += data.toString()));
      child.on("close", code => {
        if (code === 0) {
          resolve({ stdout: output.trim() });
        } else {
          resolve({ stdout: null });
        }
      });
      child.on("error", () => resolve({ stdout: null }));
    });

    if (stdout) {
      const { stdout: dateOutput } = await new Promise(resolve => {
        const child = spawn(
          "git",
          ["log", "-1", "--format=%cd", "--date=short"],
          {
            cwd: __dirname + "/..",
            stdio: ["ignore", "pipe", "ignore"],
          }
        );

        let output = "";
        child.stdout.on("data", data => (output += data.toString()));
        child.on("close", () => resolve({ stdout: output.trim() }));
        child.on("error", () => resolve({ stdout: null }));
      });

      return {
        hash: stdout,
        date: dateOutput || "unknown",
      };
    }
  } catch (error) {
    return null;
  }
  return null;
}

async function showChangelog() {
  console.log(chalk.cyan("\n Sophia CLI Changelog\n"));

  const changelogData = [
    {
      version: "1.3.0",
      date: "2025-08-08",
      changes: [
        "Added version control system",
        "Added changelog display",
        "Added update checking functionality",
        "Enhanced help system",
        "Improved documentation",
      ],
    },
    {
      version: "1.2.0",
      date: "2025-08-07",
      changes: [
        "Web search integration via MCP",
        "Secure filesystem access",
        "Improved chat mode stability",
        "Fixed generation timeout issues",
      ],
    },
    {
      version: "1.1.0",
      date: "2025-08-05",
      changes: [
        "Interactive chat mode",
        "Conversation persistence",
        "Enhanced UI with gradients",
        "Better error handling",
      ],
    },
    {
      version: "1.0.0",
      date: "2025-08-01",
      changes: [
        "Initial release",
        "AI-powered mock server generation",
        "Interactive terminal interface",
        "Configuration management",
      ],
    },
  ];

  changelogData.forEach(release => {
    console.log(
      chalk.green.bold(`v${release.version}`) + chalk.gray(` (${release.date})`)
    );
    release.changes.forEach(change => {
      console.log(`  ${change}`);
    });
    console.log();
  });
}

async function checkForUpdates() {
  const spinner = ora("Checking for updates...").start();

  try {
    const packagePath = path.join(__dirname, "../package.json");
    const packageData = await fs.readJson(packagePath);
    const currentVersion = packageData.version;

    // Check npm registry for latest version
    const response = await axios.get(
      `https://registry.npmjs.org/${packageData.name}/latest`
    );
    const latestVersion = response.data.version;

    spinner.stop();

    const comparison = compareVersions(currentVersion, latestVersion);

    if (comparison === 0) {
      console.log(chalk.green("You're running the latest version!"));
      console.log(chalk.gray(`Current version: ${currentVersion}`));
    } else if (comparison < 0) {
      console.log(chalk.yellow("A new version is available!"));
      console.log(chalk.gray(`Current: ${currentVersion}`));
      console.log(chalk.cyan(`Latest: ${latestVersion}`));
      console.log(chalk.white("\nTo update, run:"));
      console.log(chalk.cyan(`  npm update -g ${packageData.name}`));
    } else {
      console.log(chalk.blue("You're running a development version!"));
      console.log(chalk.gray(`Current: ${currentVersion} (dev)`));
      console.log(chalk.yellow("This is a local development build."));
    }
  } catch (error) {
    spinner.stop();

    if (error.code === "ENOTFOUND" || error.response?.status === 404) {
      console.log(chalk.yellow("Package not published to npm registry yet"));
      console.log(chalk.gray("This appears to be a local development version"));
    } else {
      console.log(chalk.red("Failed to check for updates"));
      console.log(chalk.gray("Please check your internet connection"));
    }
  }
}

function compareVersions(version1, version2) {
  const v1Parts = version1.split(".").map(Number);
  const v2Parts = version2.split(".").map(Number);

  const maxLength = Math.max(v1Parts.length, v2Parts.length);
  while (v1Parts.length < maxLength) v1Parts.push(0);
  while (v2Parts.length < maxLength) v2Parts.push(0);

  for (let i = 0; i < maxLength; i++) {
    if (v1Parts[i] > v2Parts[i]) return 1;
    if (v1Parts[i] < v2Parts[i]) return -1;
  }

  return 0;
}

async function startInteractiveMode() {
  displayBanner();
  console.log();

  // Check for API keys on startup
  const setupWizard = new SetupWizard();
  const hasKeys = await setupWizard.quickSetup();
  if (!hasKeys) {
    return; // Exit if user declined setup
  }

  while (true) {
    const { action } = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: chalk.cyan("What would you like to do?"),
        choices: [
          { name: "Chat Mode", value: "conversational-chat" },
          { name: "Generate Mock Server (Quick Mode)", value: "chat" },
          { name: "File Explorer (Filesystem)", value: "filesystem" },
          { name: "Terminal Commands", value: "terminal" },
          { name: "View History", value: "history" },
          { name: "Configuration", value: "config" },
          { name: "Version Control", value: "version-control" },
          { name: "Clean Generated Files", value: "clean" },
          { name: "Test Endpoint", value: "test" },
          { name: "Exit", value: "exit" },
        ],
      },
    ]);

    switch (action) {
      case "conversational-chat":
        await startConversationalChat();
        break;
      case "chat":
        await handleChat();
        break;
      case "filesystem":
        await handleFilesystem();
        break;
      case "terminal":
        await handleTerminal();
        break;
      case "history":
        await showHistory();
        break;
      case "config":
        await handleConfig();
        break;
      case "version-control":
        await handleVersionControl();
        break;
      case "clean":
        await cleanFiles();
        break;
      case "test":
        await testEndpoint();
        break;
      case "exit":
        console.log(
          chalk.magenta("\nThanks for using Sophia! See you next time!")
        );
        process.exit(0);
    }

    console.log();
  }
}

async function startConversationalChat() {
  console.log(chalk.blue("\nStarting Sophia Chat Mode..."));

  try {
    const chat = new SimpleChat();
    const result = await chat.startChat();

    if (result === "menu") {
      console.log(chalk.cyan("Returning to main menu...\n"));
      return;
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error(chalk.red("Error starting chat mode:"), error.message);
    if (error.message.includes("GEMINI_API_KEY")) {
      console.log(
        chalk.yellow("Make sure your GEMINI_API_KEY is set in the .env file")
      );
    }
    process.exit(1);
  }
}

async function handleChat() {
  const { prompt } = await inquirer.prompt([
    {
      type: "input",
      name: "prompt",
      message: chalk.green("What would you like me to create?"),
      validate: input => (input.trim() ? true : "Please enter a prompt"),
    },
  ]);

  const spinner = ora({
    text: chalk.blue("Sophia is thinking..."),
    spinner: "dots12",
  }).start();

  await savePromptHistory(prompt);

  try {
    const generatorPath = path.join(__dirname, "../lib/generate.mjs");

    await new Promise((resolve, reject) => {
      const child = spawn("node", [generatorPath, prompt], {
        stdio: ["pipe", "pipe", "pipe"],
        detached: false,
      });

      let output = "";
      let hasOutput = false;

      child.stdout.on("data", data => {
        const text = data.toString();
        output += text;
        if (!hasOutput) {
          spinner.stop();
          hasOutput = true;
        }
        process.stdout.write(text);
      });

      child.stderr.on("data", data => {
        const text = data.toString();
        output += text;
        if (!hasOutput) {
          spinner.stop();
          hasOutput = true;
        }
        process.stderr.write(chalk.red(text));
      });

      const timeout = setTimeout(() => {
        console.log(
          chalk.yellow("Generation is taking longer than expected...")
        );
        child.kill("SIGTERM");
        reject(new Error("Generation timeout"));
      }, 30000);

      child.on("close", code => {
        clearTimeout(timeout);
        if (!hasOutput) {
          spinner.stop();
        }
        if (code !== 0) {
          console.error(chalk.red("Generation failed with code:"), code);
          reject(new Error(`Generation failed with code ${code}`));
        } else {
          resolve(code);
        }
      });

      child.on("error", err => {
        clearTimeout(timeout);
        if (!hasOutput) {
          spinner.stop();
        }
        console.error(chalk.red("Failed to run generator:"), err.message);
        reject(err);
      });
    });
  } catch (error) {
    spinner.stop();
    console.error(chalk.red("Error:"), error.message);
  }
}

async function savePromptHistory(prompt) {
  const logsDir = path.join(__dirname, "../logs");
  const historyPath = path.join(logsDir, "history.json");

  await fs.ensureDir(logsDir);
  const entry = { prompt, timestamp: new Date().toISOString() };

  let history = [];
  if (await fs.pathExists(historyPath)) {
    history = await fs.readJson(historyPath);
  }
  history.push(entry);
  await fs.writeJson(historyPath, history, { spaces: 2 });
}

async function showHistory() {
  const historyPath = path.join(__dirname, "../logs/history.json");

  if (!fs.existsSync(historyPath)) {
    console.log(chalk.yellow("No history found."));
    return;
  }

  const history = await fs.readJson(historyPath);
  console.log(chalk.cyan(`\nPrompt History (${history.length} entries):\n`));

  history.slice(-10).forEach((entry, index) => {
    const date = new Date(entry.timestamp).toLocaleString();
    console.log(
      chalk.gray(`${history.length - 9 + index}.`),
      chalk.white(`"${entry.prompt}"`),
      chalk.gray(`- ${date}`)
    );
  });

  if (history.length > 10) {
    console.log(chalk.gray(`\n... and ${history.length - 10} more entries`));
  }
}

async function handleConfig() {
  const configPath = path.join(__dirname, "../.sophiarc.json");

  const { configAction } = await inquirer.prompt([
    {
      type: "list",
      name: "configAction",
      message: "Configuration options:",
      choices: [
        { name: "Show current config", value: "show" },
        { name: "Edit config", value: "edit" },
        { name: "Back to main menu", value: "back" },
      ],
    },
  ]);

  if (configAction === "show") {
    const config = await fs.readJson(configPath).catch(() => ({}));
    console.log(chalk.cyan("\nCurrent Configuration:"));
    console.log(JSON.stringify(config, null, 2));
  } else if (configAction === "edit") {
    const { key, value } = await inquirer.prompt([
      {
        type: "input",
        name: "key",
        message: "Config key:",
        validate: input => (input.trim() ? true : "Please enter a key"),
      },
      {
        type: "input",
        name: "value",
        message: "Config value:",
        validate: input => (input.trim() ? true : "Please enter a value"),
      },
    ]);

    const config = await fs.readJson(configPath).catch(() => ({}));
    config[key] = value;
    await fs.writeJson(configPath, config, { spaces: 2 });
    console.log(chalk.green(`Config updated: ${key} = ${value}`));
  }
}

async function handleVersionControl() {
  const { versionAction } = await inquirer.prompt([
    {
      type: "list",
      name: "versionAction",
      message: chalk.cyan("Version Control Options:"),
      choices: [
        { name: "Show Current Version", value: "version" },
        { name: "View Changelog", value: "changelog" },
        { name: "Check for Updates", value: "update" },
        { name: "Back to Main Menu", value: "back" },
      ],
    },
  ]);

  switch (versionAction) {
    case "version":
      await showVersion();
      break;
    case "changelog":
      await showChangelog();
      break;
    case "update":
      await checkForUpdates();
      break;
    case "back":
      return;
  }

  console.log();
}

async function handleTerminal() {
  console.log(chalk.blue("\n⚡ Sophia Terminal - Safe Command Execution"));

  const terminalService = new TerminalService();

  while (true) {
    const { action } = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: chalk.cyan("What would you like to do?"),
        choices: [
          { name: "Execute Command", value: "execute" },
          { name: "View Safe Commands Info", value: "info" },
          { name: "Quick Commands", value: "quick" },
          { name: "Back to Main Menu", value: "back" },
        ],
      },
    ]);

    switch (action) {
      case "execute":
        await executeCustomCommand(terminalService);
        break;
      case "info":
        const info = TerminalService.getSafeCommandsInfo();
        console.log(info.message);
        break;
      case "quick":
        await executeQuickCommand(terminalService);
        break;
      case "back":
        await terminalService.disconnect();
        console.log(chalk.cyan("\nReturning to main menu...\n"));
        return;
    }

    console.log();
  }
}

async function executeCustomCommand(terminalService) {
  const { command } = await inquirer.prompt([
    {
      type: "input",
      name: "command",
      message: chalk.green("Enter command to execute:"),
      validate: input => (input.trim() ? true : "Please enter a command"),
    },
  ]);

  const spinner = ora(`Executing: ${command}`).start();

  try {
    // Connect if not already connected
    if (!terminalService.isConnected) {
      await terminalService.connect();
    }

    const result = await terminalService.executeCommand(command.trim());
    spinner.stop();

    const formatted = TerminalService.formatCommandResult(result);
    console.log(formatted);

    if (result.success) {
      console.log(chalk.green("Command completed successfully"));
    } else {
      console.log(chalk.yellow(`Command exited with code: ${result.exitCode}`));
    }
  } catch (error) {
    spinner.stop();
    console.error(chalk.red("Command failed:"), error.message);
  }
}

async function executeQuickCommand(terminalService) {
  const { quickCmd } = await inquirer.prompt([
    {
      type: "list",
      name: "quickCmd",
      message: chalk.cyan("Select a quick command:"),
      choices: [
        { name: "System Info (uname -a)", value: "uname -a" },
        { name: "Current Directory (pwd)", value: "pwd" },
        { name: "Date and Time (date)", value: "date" },
        { name: "Who Am I (whoami)", value: "whoami" },
        { name: "Disk Usage (df -h)", value: "df -h" },
        { name: "Memory Info (free -h)", value: "free -h" },
        {
          name: "Network Test (ping -c 3 google.com)",
          value: "ping -c 3 google.com",
        },
        { name: "Git Status", value: "git status" },
        { name: "Node Version", value: "node --version" },
        { name: "NPM Version", value: "npm --version" },
        { name: "Back to Terminal Menu", value: "back" },
      ],
    },
  ]);

  if (quickCmd === "back") return;

  const spinner = ora(`Executing: ${quickCmd}`).start();

  try {
    // Connect if not already connected
    if (!terminalService.isConnected) {
      await terminalService.connect();
    }

    const result = await terminalService.executeCommand(quickCmd);
    spinner.stop();

    const formatted = TerminalService.formatCommandResult(result);
    console.log(formatted);

    if (result.success) {
      console.log(chalk.green("Command completed successfully"));
    } else {
      console.log(chalk.yellow(`Command exited with code: ${result.exitCode}`));
    }
  } catch (error) {
    spinner.stop();
    console.error(chalk.red("Command failed:"), error.message);
  }
}

async function cleanFiles() {
  const { confirmClean } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirmClean",
      message: chalk.red(
        "Are you sure you want to clean all generated mocks and history?"
      ),
      default: false,
    },
  ]);

  if (!confirmClean) {
    console.log(chalk.yellow("Clean operation cancelled."));
    return;
  }

  const genDir = path.join(__dirname, "../generated");
  const logsDir = path.join(__dirname, "../logs/history.json");

  const spinner = ora("Cleaning files...").start();

  try {
    if (await fs.pathExists(genDir)) {
      await fs.emptyDir(genDir);
    }
    if (await fs.pathExists(logsDir)) {
      await fs.remove(logsDir);
    }

    spinner.stop();
    console.log(chalk.green("All generated mocks and history cleaned."));
  } catch (error) {
    spinner.stop();
    console.log(chalk.red("Error cleaning files:"), error.message);
  }
}

async function testEndpoint() {
  const { endpoint } = await inquirer.prompt([
    {
      type: "input",
      name: "endpoint",
      message: "Enter endpoint to test (e.g., /api/health):",
      validate: input => (input.trim() ? true : "Please enter an endpoint"),
    },
  ]);

  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `http://localhost:3000${cleanEndpoint}`;

  const spinner = ora(`Testing ${url}...`).start();

  try {
    const axios = (await import("axios")).default;
    const res = await axios.get(url);
    spinner.stop();
    console.log(chalk.green(`Response (${res.status}):`), res.data);
  } catch (err) {
    spinner.stop();
    console.log(chalk.red("Request failed:"), err.message);
  }
}

async function handleFilesystem() {
  console.log(chalk.blue("\n Sophia File Explorer - Secure Filesystem Access"));

  const filesystemService = new FilesystemService();

  while (true) {
    const { action } = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: chalk.cyan("What would you like to do?"),
        choices: [
          { name: "Browse Directory", value: "browse" },
          { name: "Read File", value: "read" },
          { name: "View Security Information", value: "security" },
          { name: "Back to Main Menu", value: "back" },
        ],
      },
    ]);

    switch (action) {
      case "browse":
        await browseDirectory(filesystemService);
        break;
      case "read":
        await readFileContent(filesystemService);
        break;
      case "security":
        const fsInfo = filesystemService.getSafePathsInfo();
        console.log(fsInfo.message);
        break;
      case "back":
        await filesystemService.disconnect();
        console.log(chalk.cyan("\nReturning to main menu...\n"));
        return;
    }

    console.log();
  }
}

async function browseDirectory(filesystemService) {
  const { dirPath } = await inquirer.prompt([
    {
      type: "input",
      name: "dirPath",
      message: chalk.green("Enter directory path to browse:"),
      default: ".",
      validate: input =>
        input.trim() ? true : "Please enter a directory path",
    },
  ]);

  try {
    const result = await filesystemService.listDirectory(dirPath.trim());
    const formatted = FilesystemService.formatDirectoryResult(result);
    console.log(formatted);
  } catch (error) {
    console.error(chalk.red("Error browsing directory:"), error.message);
  }
}

async function readFileContent(filesystemService) {
  const { filePath } = await inquirer.prompt([
    {
      type: "input",
      name: "filePath",
      message: chalk.green("Enter file path to read:"),
      validate: input => (input.trim() ? true : "Please enter a file path"),
    },
  ]);

  try {
    const result = await filesystemService.readFile(filePath.trim());
    const formatted = FilesystemService.formatFileResult(result);
    console.log(formatted);
  } catch (error) {
    console.error(chalk.red("Error reading file:"), error.message);
  }
}

if (process.argv.length > 2) {
  const command = process.argv[2];

  switch (command) {
    case "chat":
      console.log(chalk.blue("Starting Sophia Chat Mode..."));
      const chat = new SimpleChat();
      await chat.startChat();
      break;
    case "files":
    case "fs":
      await handleFilesystem();
      process.exit(0);
    case "history":
      await showHistory();
      process.exit(0);
    case "clean":
      if (process.argv[3] === "--all") {
        await cleanFiles();
        process.exit(0);
      }
      break;
    case "--version":
    case "-v":
      await showVersion();
      process.exit(0);
    case "changelog":
      await showChangelog();
      process.exit(0);
    case "update":
      await checkForUpdates();
      process.exit(0);
    case "setup":
      const setupWizard = new SetupWizard();
      await setupWizard.run();
      process.exit(0);
    case "--help":
    case "-h":
      displayBanner();
      console.log(
        chalk.cyan(`
Sophia CLI Commands:

Interactive Mode:
  sophia                    Start interactive mode (recommended)

Chat Mode:
  sophia chat               Start conversational chat mode

Filesystem Mode:
  sophia files              Start secure file explorer
  sophia fs                 Start secure file explorer (short)

Configuration:
  sophia setup              Run setup wizard for API keys
  
Version Control:
  sophia --version, -v      Show current version
  sophia changelog          Show version history
  sophia update             Check for updates

Legacy Commands:
  sophia "prompt"           Generate mock server from prompt
  sophia history            Show command history
  sophia clean --all        Clean all generated files
  sophia --help             Show this help

Examples:
  sophia                    # Interactive menu
  sophia chat               # Conversational chat mode
  sophia files              # Secure file explorer
  sophia "create a REST API for user management"
  sophia history
      `)
      );
      process.exit(0);
    default:
      const prompt = process.argv.slice(2).join(" ").trim();
      if (prompt && !prompt.startsWith("--")) {
        await savePromptHistory(prompt);
        const generatorPath = path.join(__dirname, "../lib/generate.mjs");
        const child = spawn("node", [generatorPath, ...process.argv.slice(2)], {
          stdio: "inherit",
        });

        child.on("error", err => {
          console.error(chalk.red("Failed to run generator:"), err.message);
        });
        process.exit(0);
      }
  }

  startInteractiveMode().catch(console.error);
} else {
  startInteractiveMode().catch(console.error);
}
