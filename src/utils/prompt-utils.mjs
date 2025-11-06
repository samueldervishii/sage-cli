import inquirer from "inquirer";
import chalk from "chalk";

/**
 * Show a confirmation prompt with custom styling
 * @param {string} message - The message to display
 * @param {string} operation - The operation being performed (e.g., "read", "write")
 * @param {string} target - The target of the operation (e.g., file path)
 * @returns {Promise<{confirmed: boolean, cancelled: boolean}>}
 */
export async function confirmAction(message, operation, target) {
  // Pause the main readline interface to prevent conflicts with inquirer
  const mainRl = global.mainReadline;
  if (mainRl) {
    mainRl.pause();
  }

  console.log();
  console.log(chalk.yellow("Confirmation Required"));
  console.log(chalk.gray(`Operation: ${operation}`));
  console.log(chalk.gray(`Target: ${target}`));
  console.log();

  try {
    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: message,
        choices: [
          {
            name: chalk.green("Yes - Proceed with operation"),
            value: "yes",
            short: "Yes",
          },
          {
            name: chalk.red("No - Cancel operation"),
            value: "no",
            short: "No",
          },
          {
            name: chalk.yellow("Other - Return to chat"),
            value: "other",
            short: "Other",
          },
        ],
      },
    ]);

    if (answer.action === "yes") {
      console.log(chalk.green("Confirmed - Proceeding..."));
      console.log();
      return { confirmed: true, cancelled: false };
    } else if (answer.action === "no") {
      console.log(chalk.red("Cancelled by user"));
      console.log();
      return { confirmed: false, cancelled: true };
    } else {
      console.log(chalk.yellow("Returning to normal chat..."));
      console.log();
      return { confirmed: false, cancelled: false };
    }
  } catch (_error) {
    // Handle Ctrl+C or other interruptions
    console.log(chalk.red("\nInterrupted by user"));
    console.log();
    return { confirmed: false, cancelled: true };
  } finally {
    // Resume the main readline interface
    if (mainRl && !mainRl.closed) {
      mainRl.resume();
    }
  }
}

/**
 * Prompt user for a file path
 * @param {string} message - The message to display
 * @param {string} defaultPath - Default file path
 * @returns {Promise<string|null>}
 */
export async function promptFilePath(message, defaultPath = "") {
  // Pause the main readline interface to prevent conflicts with inquirer
  const mainRl = global.mainReadline;
  if (mainRl) {
    mainRl.pause();
  }

  try {
    const answer = await inquirer.prompt([
      {
        type: "input",
        name: "filePath",
        message: message,
        default: defaultPath,
        validate: input => {
          if (!input || input.trim() === "") {
            return "Please enter a file path";
          }
          return true;
        },
      },
    ]);

    return answer.filePath.trim();
  } catch (_error) {
    // Handle Ctrl+C
    console.log(chalk.red("\nCancelled by user"));
    return null;
  } finally {
    // Resume the main readline interface
    if (mainRl && !mainRl.closed) {
      mainRl.resume();
    }
  }
}

/**
 * Show a selection menu
 * @param {string} message - The message to display
 * @param {Array<{name: string, value: any}>} choices - The choices to display
 * @returns {Promise<any|null>}
 */
export async function showMenu(message, choices) {
  // Pause the main readline interface to prevent conflicts with inquirer
  const mainRl = global.mainReadline;
  if (mainRl) {
    mainRl.pause();
  }

  try {
    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "selection",
        message: message,
        choices: choices,
      },
    ]);

    return answer.selection;
  } catch (_error) {
    // Handle Ctrl+C
    console.log(chalk.red("\nCancelled by user"));
    return null;
  } finally {
    // Resume the main readline interface
    if (mainRl && !mainRl.closed) {
      mainRl.resume();
    }
  }
}
