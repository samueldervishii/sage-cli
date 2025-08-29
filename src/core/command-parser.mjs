import { fileURLToPath } from "url";
import { spawn } from "child_process";
import path from "path";
import chalk from "chalk";
import { displayBanner, showVersion } from "./banner.mjs";
import { showChangelog, performUpdate } from "../utils/github-api.mjs";
import { showHistory, savePromptHistory } from "../chat/chat-handler.mjs";
import { handleFilesystem } from "../filesystem/filesystem-handler.mjs";
import { cleanFiles } from "../utils/cleanup-utils.mjs";
import { startInteractiveMode } from "./interactive-menu.mjs";
import { reloadEnvVars } from "../config/config-handler.mjs";
import SimpleChat from "../chat/simple-chat.mjs";
import SetupWizard from "../config/setup-wizard.mjs";
import ProjectCommands from "../project/project-commands.mjs";
import { PATHS } from "../constants/constants.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function parseAndExecuteCommand(args) {
  if (args.length === 0) {
    return await startInteractiveMode();
  }

  const command = args[0];

  switch (command) {
    case "chat": {
      console.log(chalk.blue("Starting Sage Chat Mode..."));
      const chat = new SimpleChat();
      await chat.initialize();
      await chat.startChat();
      break;
    }

    case "files":
    case "fs":
      await handleFilesystem();
      process.exit(0);

    case "history":
      await showHistory();
      process.exit(0);

    case "clean":
      if (args[1] === "--all") {
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
      await performUpdate();
      process.exit(0);

    case "setup": {
      const setupWizard = new SetupWizard();
      await setupWizard.run();
      reloadEnvVars();
      process.exit(0);
    }

    case "analyze": {
      const projectCommands = new ProjectCommands();
      const initialized = await projectCommands.initialize();
      if (initialized) {
        await projectCommands.handleAnalyzeCommand();
      }
      process.exit(0);
    }

    case "explain": {
      const projectCommands = new ProjectCommands();
      const initialized = await projectCommands.initialize();
      if (initialized) {
        const fileName = args[1];
        await projectCommands.handleExplainCommand(fileName);
      }
      process.exit(0);
    }

    case "suggest": {
      const projectCommands = new ProjectCommands();
      const initialized = await projectCommands.initialize();
      if (initialized) {
        const scope = args[1] || "project";
        await projectCommands.handleSuggestCommand(scope);
      }
      process.exit(0);
    }

    case "security": {
      const projectCommands = new ProjectCommands();
      const initialized = await projectCommands.initialize();
      if (initialized) {
        await projectCommands.handleSecurityCommand();
      }
      process.exit(0);
    }

    case "structure": {
      const projectCommands = new ProjectCommands();
      const initialized = await projectCommands.initialize();
      if (initialized) {
        await projectCommands.handleStructureCommand();
      }
      process.exit(0);
    }

    case "ask": {
      const projectCommands = new ProjectCommands();
      const initialized = await projectCommands.initialize();
      if (initialized) {
        const question = args.slice(1).join(" ");
        await projectCommands.handleAskCommand(question);
      }
      process.exit(0);
    }

    case "project": {
      const projectCommands = new ProjectCommands();
      const initialized = await projectCommands.initialize();
      if (initialized) {
        await projectCommands.handleProjectMenu();
      }
      process.exit(0);
    }

    case "--help":
    case "-h":
      await displayBanner();
      console.log(
        chalk.cyan(`
Sage CLI Commands:

Interactive Mode:
  sage                    Start interactive mode (recommended)

Project Analysis (AI-Powered):
  sage project            Interactive project menu
  sage analyze            Analyze entire project with AI
  sage explain <file>     Explain a specific file
  sage suggest [file]     Get improvement suggestions
  sage security           Perform security analysis
  sage structure          Show project structure
  sage ask "question"     Ask questions about your project

Chat Mode:
  sage chat               Start conversational chat mode

Filesystem Mode:
  sage files              Start secure file explorer
  sage fs                 Start secure file explorer (short)

Configuration:
  sage setup              Run setup wizard for API keys
  
Version Control:
  sage --version, -v      Show current version
  sage changelog          Show version history
  sage update             Update to latest version

Legacy Commands:
  sage "prompt"           Generate mock server from prompt
  sage history            Show command history
  sage clean --all        Clean all generated files
  sage --help             Show this help

Examples:
  sage                    # Interactive menu
  sage project            # Project analysis menu
  sage analyze            # AI project analysis
  sage explain "main.py"  # Explain specific file
  sage ask "how does authentication work?"
  sage chat               # Conversational chat mode
  sage files              # Secure file explorer
      `)
      );
      process.exit(0);

    default: {
      const prompt = args.join(" ").trim();
      if (prompt && !prompt.startsWith("--")) {
        await savePromptHistory(prompt);
        const generatorPath = path.join(
          __dirname,
          "../../",
          PATHS.GENERATOR_SCRIPT
        );
        const child = spawn("node", [generatorPath, ...args], {
          stdio: "inherit",
        });

        child.on("error", err => {
          console.error(chalk.red("Failed to run generator:"), err.message);
        });
        process.exit(0);
      }
    }
  }

  return await startInteractiveMode();
}
