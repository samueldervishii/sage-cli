import chalk from "chalk";
import inquirer from "inquirer";
import { displayBanner, showVersion } from "./banner.mjs";
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

export async function startInteractiveMode() {
  await displayBanner();
  console.log();

  const setupWizard = new SetupWizard();
  const hasKeys = await setupWizard.quickSetup();
  if (!hasKeys) {
    return;
  }

  reloadEnvVars();

  const projectCommands = new ProjectCommands();
  const projectInitialized = await projectCommands.initialize();

  if (projectInitialized) {
    const context = projectCommands.getProjectContext();
    if (context) {
      console.log(
        chalk.green(`Project detected: ${context.name} (${context.type})`)
      );
      console.log();
    }
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
  } catch (error) {}

  let continueMenu = true;
  while (continueMenu) {
    const choices = [];

    if (projectInitialized && projectCommands.getProjectContext()) {
      choices.push({ name: "Project Analysis (AI-Powered)", value: "project" });
    }

    choices.push(
      { name: "Chat Mode", value: "conversational-chat" },
      { name: "Generate Mock Server (Quick Mode)", value: "chat" },
      { name: "File Explorer (Filesystem)", value: "filesystem" },
      { name: "Terminal Commands", value: "terminal" },
      { name: "View History", value: "history" },
      { name: "Configuration", value: "config" },
      { name: "Version Control", value: "version-control" },
      { name: "Clean Generated Files", value: "clean" },
      { name: "Test Endpoint", value: "test" },
      { name: "Exit", value: "exit" }
    );

    const { action } = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: chalk.cyan("What would you like to do?"),
        choices: choices,
      },
    ]);

    switch (action) {
      case "project":
        if (projectInitialized) {
          await projectCommands.handleProjectMenu();
        }
        break;
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
          chalk.magenta("\nThanks for using Sage! See you next time!")
        );
        continueMenu = false;
        break;
    }

    console.log();
  }
  process.exit(0);
}

export async function handleVersionControl() {
  const { versionAction } = await inquirer.prompt([
    {
      type: "list",
      name: "versionAction",
      message: chalk.cyan("Version Control Options:"),
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
