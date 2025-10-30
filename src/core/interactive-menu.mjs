import chalk from "chalk";
import inquirer from "inquirer";
import { displayBanner, showVersion, displayTips } from "./banner.mjs";
import {
  checkForUpdates,
  showChangelog,
  performUpdate,
} from "../utils/github-api.mjs";
import {
  startConversationalChat,
  handleChat,
  showHistory,
} from "../chat/chat-handler.mjs";
import { handleConfig, reloadEnvVars } from "../config/config-handler.mjs";
import { cleanFiles, testEndpoint } from "../utils/cleanup-utils.mjs";
import { handleFilesystem } from "../filesystem/filesystem-handler.mjs";
import { handleTerminal } from "../terminal/terminal-handler.mjs";
import SetupWizard from "../config/setup-wizard.mjs";
import ProjectCommands from "../project/project-commands.mjs";

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

const slashCommands = [
  { name: "/help", description: "Show Sage CLI help and information" },
  { name: "/project", description: "AI-powered project analysis" },
  { name: "/chat", description: "Start conversational chat mode" },
  { name: "/generate", description: "Generate mock server from prompt" },
  { name: "/files", description: "Secure file explorer" },
  { name: "/terminal", description: "Terminal commands interface" },
  { name: "/history", description: "View command history" },
  { name: "/config", description: "Configuration settings" },
  { name: "/clean", description: "Clean generated files" },
  { name: "/version", description: "Version control options" },
  { name: "/test", description: "Test endpoint functionality" },
  { name: "/exit", description: "Exit Sage CLI" },
];

async function getClaudeCodeStyleInput() {
  try {
    const result = await inquirer.prompt([
      {
        type: "input",
        name: "input",
        message: "> ",
        prefix: "",
      },
    ]);

    if (result.input.trim() === "/") {
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

    return result.input;
  } catch (error) {
    if (error.message && error.message.includes("User force closed")) return "";
    console.error(chalk.red("Input error:"), error.message);
    return "";
  }
}

export async function startInteractiveMode() {
  await displayBanner();
  displayTips();
  console.log();

  const setupWizard = new SetupWizard();
  const hasKeys = await setupWizard.quickSetup();
  if (!hasKeys) return;

  await reloadEnvVars();
  const projectCommands = new ProjectCommands();
  let projectInitialized = false;

  try {
    const projectHandler = projectCommands.projectHandler;
    if (projectHandler.isProjectTrusted(process.cwd())) {
      projectInitialized = await projectCommands.initialize();
      if (projectInitialized) {
        const context = projectCommands.getProjectContext();
        if (context) {
          console.log(
            chalk.green(`Project detected: ${context.name} (${context.type})`)
          );
          console.log();
        }
      }
    }
  } catch {
    console.log(
      chalk.gray(
        "Note: Project features will require trust approval when first used."
      )
    );
  }

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

  console.log(
    chalk.gray("  Type '/' and press enter for command menu or chat directly\n")
  );

  let continueSession = true;
  while (continueSession) {
    const input = await getClaudeCodeStyleInput();
    if (!input.trim()) continue;
    if (input.startsWith("/")) {
      continueSession = await handleSlashCommand(
        input.trim(),
        projectCommands,
        projectInitialized
      );
    } else {
      await handleChatMessage(input.trim());
    }
    console.log("\n");
  }
  process.exit(0);
}

async function handleSlashCommand(
  command,
  projectCommands,
  projectInitialized
) {
  const cmd = command.toLowerCase();
  switch (cmd) {
    case "/help":
      console.log(
        chalk.cyan(`
Sage CLI v0.10.0-beta

Always review Sage's responses, especially when running commands. Sage can analyze your code, 
generate content, and help with development tasks through AI assistance.

Usage Modes:
• REPL: sage (interactive session)
• Commands: sage --help (show options)

Common Tasks:
• Ask questions about your code > How does this function work?
• Generate mock servers > /generate "REST API for users"
• Explore project structure > /project
• Browse files securely > /files
• Run terminal commands > /terminal

Interactive Mode Commands:
  /help - Show this help information
  /project - AI-powered project analysis and insights
  /chat - Start conversational chat mode with context
  /generate - Generate mock servers from prompts
  /files - Secure file explorer with permissions
  /terminal - Terminal commands interface
  /history - View command and conversation history
  /config - Configuration settings and API keys
  /clean - Clean generated files and temporary data
  /version - Version control options and updates
  /test - Test endpoint functionality
  /exit - Exit Sage CLI
      `)
      );
      break;
    case "/project":
      if (projectInitialized) await projectCommands.handleProjectMenu();
      else
        console.log(chalk.yellow("No project detected in current directory"));
      break;
    case "/chat":
      await startConversationalChat();
      break;
    case "/generate":
      await handleChat();
      break;
    case "/files":
      await handleFilesystem();
      break;
    case "/terminal":
      await handleTerminal();
      break;
    case "/history":
      await showHistory();
      break;
    case "/config":
      await handleConfig();
      break;
    case "/clean":
      await cleanFiles();
      break;
    case "/version":
      await handleVersionControl();
      break;
    case "/test":
      await testEndpoint();
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
