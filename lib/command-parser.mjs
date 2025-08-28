import { fileURLToPath } from "url";
import { spawn } from "child_process";
import path from "path";
import chalk from "chalk";
import { displayBanner, showVersion } from "./banner.mjs";
import { showChangelog, performUpdate } from "./github-api.mjs";
import { showHistory, savePromptHistory } from "./chat-handler.mjs";
import { handleFilesystem } from "./filesystem-handler.mjs";
import { cleanFiles } from "./cleanup-utils.mjs";
import { startInteractiveMode } from "./interactive-menu.mjs";
import { reloadEnvVars } from "./config-handler.mjs";
import SimpleChat from "./simple-chat.mjs";
import SetupWizard from "./setup-wizard.mjs";
import { PATHS } from "./constants.mjs";

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
      break;

    case "history":
      await showHistory();
      process.exit(0);
      break;

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
      break;

    case "changelog":
      await showChangelog();
      process.exit(0);
      break;

    case "update":
      await performUpdate();
      process.exit(0);
      break;

    case "setup": {
      const setupWizard = new SetupWizard();
      await setupWizard.run();
      reloadEnvVars();
      process.exit(0);
      break;
    }

    case "--help":
    case "-h":
      await displayBanner();
      console.log(
        chalk.cyan(`
Sage CLI Commands:

Interactive Mode:
  sage                    Start interactive mode (recommended)

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
  sage chat               # Conversational chat mode
  sage files              # Secure file explorer
  sage "create a REST API for user management"
  sage history
      `)
      );
      process.exit(0);
      break;

    default: {
      const prompt = args.join(" ").trim();
      if (prompt && !prompt.startsWith("--")) {
        await savePromptHistory(prompt);
        const generatorPath = path.join(__dirname, PATHS.GENERATOR_SCRIPT);
        const child = spawn("node", [generatorPath, ...args], {
          stdio: "inherit",
        });

        child.on("error", err => {
          console.error(chalk.red("Failed to run generator:"), err.message);
        });
        process.exit(0);
      }
      break;
    }
  }

  return await startInteractiveMode();
}
