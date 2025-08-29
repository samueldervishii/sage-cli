import chalk from "chalk";
import inquirer from "inquirer";
import ora from "ora";
import TerminalService from "./terminal-service.mjs";
import { QUICK_COMMANDS } from "../constants/constants.mjs";

export async function handleTerminal() {
  console.log(chalk.blue("\n⚡ Sage Terminal - Safe Command Execution"));

  const terminalService = new TerminalService();

  let continueTerminal = true;
  while (continueTerminal) {
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
      case "info": {
        const info = TerminalService.getSafeCommandsInfo();
        console.log(info.message);
        break;
      }
      case "quick":
        await executeQuickCommand(terminalService);
        break;
      case "back":
        await terminalService.disconnect();
        console.log(chalk.cyan("\nReturning to main menu...\n"));
        continueTerminal = false;
        break;
    }

    console.log();
  }
}

export async function executeCustomCommand(terminalService) {
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

export async function executeQuickCommand(terminalService) {
  const { quickCmd } = await inquirer.prompt([
    {
      type: "list",
      name: "quickCmd",
      message: chalk.cyan("Select a quick command:"),
      choices: QUICK_COMMANDS,
    },
  ]);

  if (quickCmd === "back") return;

  const spinner = ora(`Executing: ${quickCmd}`).start();

  try {
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
