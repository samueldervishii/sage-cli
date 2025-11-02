import chalk from "chalk";
import { displayBanner, showVersion } from "./banner.mjs";
import { performUpdate } from "../utils/github-api.mjs";
import { startInteractiveMode } from "./interactive-menu.mjs";
import { reloadEnvVars } from "../config/config-handler.mjs";
import SetupWizard from "../config/setup-wizard.mjs";

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
      break;

    case "update":
      await performUpdate();
      process.exit(0);
      break;

    case "setup": {
      const setupWizard = new SetupWizard();
      await setupWizard.run();
      await reloadEnvVars();
      process.exit(0);
    }
    // fallthrough is intentional - setup exits before reaching here
    default:
      console.log(chalk.yellow(`Unknown command: '${command}'`));
      process.exit(1);
  }
}
