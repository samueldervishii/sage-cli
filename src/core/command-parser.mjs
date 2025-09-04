import { fileURLToPath } from "url";
import { spawn } from "child_process";
import path from "path";
import chalk from "chalk";
import { displayBanner, showVersion, displayTips } from "./banner.mjs";
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
    case "--version":
    case "-v":
      await showVersion();
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

    case "--help":
    case "-h":
      await displayBanner();
      displayTips();
      console.log(
        chalk.cyan(`
Sage CLI Commands:

Interactive Mode:
  sage                    Start interactive mode (all features available here)

Configuration:
  sage setup              Run setup wizard for API keys

Version Control:
  sage update             Update to latest version
  sage --help             Show this help
      `)
      );
      process.exit(0);

    case "project":
    case "analyze":
    case "explain":
    case "suggest":
    case "security":
    case "structure":
    case "ask":
    case "chat":
    case "files":
    case "fs":
    case "history":
    case "clean":
    case "changelog":
      console.log(
        chalk.red(
          `Error: '${command}' command is not available as a standalone command.`
        )
      );
      console.log(
        chalk.cyan(
          "Please use 'sage' to enter interactive mode where all features are available."
        )
      );
      process.exit(1);

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
