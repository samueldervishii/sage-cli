import chalk from "chalk";
import inquirer from "inquirer";
import { displayBanner, showVersion, displayTips } from "./banner.mjs";
import {
  checkForUpdates,
  showChangelog,
  performUpdate,
} from "../utils/github-api.mjs";
import { handleConfig, reloadEnvVars } from "../config/config-handler.mjs";
import { handleTerminal } from "../terminal/terminal-handler.mjs";
import SetupWizard from "../config/setup-wizard.mjs";
import HistoryManager from "../utils/history-manager.mjs";

// ---- Patch Inquirer to remove "✔" and "?" ----
try {
  const basePrompt = await import("inquirer/lib/prompts/base.js");
  const Prompt = basePrompt.default || basePrompt.Prompt;
  if (Prompt && Prompt.prototype && Prompt.prototype.render) {
    const oldRender = Prompt.prototype.render;
    Prompt.prototype.render = function (...args) {
      oldRender.apply(this, args);
      if (this.screen && this.screen.render) {
        const origRender = this.screen.render;
        this.screen.render = function (content, bottomContent) {
          if (
            content &&
            typeof content === "string" &&
            content.includes("✔")
          ) {
            content = content.replace(/✔/g, "");
          }
          try {
            if (content && typeof content === "string") {
              // Strip default inquirer decorations on Windows/ANSI-limited terminals
              content = content.replace(/^\?\s+/gm, ""); // leading question mark
              content = content.replace(/^[✔✖✓]\s*/gm, ""); // ticks/crosses
              content = content.replace(/^[❯›»]\s*/gm, ""); // list pointers
            }
          } catch {}
          return origRender.call(this, content, bottomContent);
        };
      }
    };
  }
} catch (err) {
  if (process.env.DEBUG) console.log("Inquirer patch skipped:", err.message);
}

inquirer.Symbols = {
  ...inquirer.Symbols,
  check: "",
  prefix: "",
  pointer: "",
  radioOn: "",
  radioOff: "",
  // Remove the default question mark entirely
  questionMark: "",
};

const originalPrompt = inquirer.prompt;
inquirer.prompt = function (questions) {
  if (!Array.isArray(questions)) questions = [questions];
  questions = questions.map(q => ({ ...q, prefix: "" }));
  return originalPrompt.call(this, questions);
};

let globalChatInstance = null;
let historyManager = null;

const slashCommands = [
  { name: "/help", description: "Show Sage CLI help and information" },
  { name: "/terminal", description: "Terminal commands interface" },
  { name: "/history", description: "View command history" },
  { name: "/config", description: "Configuration settings" },
  { name: "/version", description: "Version control options" },
  { name: "/exit", description: "Exit Sage CLI" },
];

async function getClaudeCodeStyleInput() {
  try {
    // Use history manager for input with up/down arrow support
    const input = await historyManager.promptWithHistory("> ");

    if (input.trim() === "/") {
      const commandChoice = await inquirer.prompt([
        {
          type: "list",
          name: "command",
          message: "Select a command:",
          prefix: "",
          choices: slashCommands.map(cmd => ({
            name: `${chalk.yellow(cmd.name)} - ${chalk.gray(cmd.description)}`,
            value: cmd.name,
          })),
          pageSize: 12,
        },
      ]);
      return commandChoice.command;
    }

    return input;
  } catch (error) {
    if (error.message && error.message.includes("User force closed")) return "";
    if (error.message && error.message.includes("User interrupted")) return "";
    console.error(chalk.red("Input error:"), error.message);
    return "";
  }
}

export async function startInteractiveMode() {
  await displayBanner();
  displayTips();
  console.log();

  // Initialize history manager
  historyManager = new HistoryManager();
  await historyManager.loadHistory();

  const setupWizard = new SetupWizard();
  const hasKeys = await setupWizard.quickSetup();
  if (!hasKeys) return;

  await reloadEnvVars();

  try {
    const updateInfo = await checkForUpdates(true);
    if (updateInfo) {
      console.log(
        chalk.yellow("New version available!"),
        chalk.cyan(`v${updateInfo.latest}`)
      );
      console.log(
        chalk.gray(`Run 'sage update' to update from v${updateInfo.current}`)
      );
      console.log();
    }
  } catch (error) {
    if (process.env.DEBUG)
      console.error(
        chalk.gray(`Debug: Update check failed - ${error.message}`)
      );
  }

  try {
    const SimpleChat = (await import("../chat/simple-chat.mjs")).default;
    globalChatInstance = new SimpleChat();
    await globalChatInstance.initialize();
  } catch {
    console.log(
      chalk.yellow(
        "Chat functionality unavailable. Run 'sage setup' to configure API keys."
      )
    );
  }

  console.log();
  let continueSession = true;
  while (continueSession) {
    const input = await getClaudeCodeStyleInput();
    if (!input.trim()) continue;
    if (input.startsWith("/")) {
      // Only save slash commands to history, not chat prompts
      await historyManager.addCommand(input.trim());
      continueSession = await handleSlashCommand(input.trim());
      // Exit immediately if command returned false
      if (!continueSession) break;
    } else {
      // Don't save chat messages to history
      await handleChatMessage(input.trim());
    }
    console.log("\n");
  }
  process.exit(0);
}

async function handleSlashCommand(command) {
  const cmd = command.toLowerCase();
  switch (cmd) {
    case "/help":
      console.log(
        chalk.cyan(`
Sage CLI

Always review Sage's responses, especially when running commands. Sage can help with
development tasks through AI assistance.

Usage Modes:
• REPL: sage (interactive session)
• Commands: sage --help (show options)

Common Tasks:
• Ask questions directly - Chat with Sage AI
• Browse files securely > /files
• Run terminal commands > /terminal
• View command history > /history

Interactive Mode Commands:
  /help - Show this help information
  /terminal - Terminal commands interface
  /history - View command history
  /config - Configuration settings and API keys
  /version - Version control options and updates
  /exit - Exit Sage CLI
      `)
      );
      break;
    case "/terminal":
      await handleTerminal();
      break;
    case "/history":
      await historyManager.showHistory();
      break;
    case "/config":
      await handleConfig();
      break;
    case "/version":
      await handleVersionControl();
      break;
    case "/exit":
      console.log(chalk.magenta("\nThanks for using Sage! See you next time!"));
      return false;
    default:
      console.log(chalk.red(`Unknown command: ${command}`));
      console.log(chalk.gray("Type /help to see available commands"));
  }
  return true;
}

async function handleChatMessage(message) {
  try {
    if (!globalChatInstance) {
      console.log(
        chalk.red(
          "Chat functionality is not available. Run 'sage setup' to configure API keys."
        )
      );
      return;
    }
    await globalChatInstance.sendSingleMessage(message);
  } catch (error) {
    console.log(chalk.red("Error processing message:"), error.message);
    if (error.message.includes("GEMINI_API_KEY"))
      console.log(chalk.yellow("Run 'sage setup' to configure your API keys"));
  }
}

export async function handleVersionControl() {
  const { versionAction } = await inquirer.prompt([
    {
      type: "list",
      name: "versionAction",
      message: chalk.cyan("Version Control Options:"),
      prefix: "",
      choices: [
        { name: "Show Current Version", value: "version" },
        { name: "View Changelog", value: "changelog" },
        { name: "Update to Latest Version", value: "update" },
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
      await performUpdate();
      break;
    case "back":
      return;
  }
  console.log();
}
