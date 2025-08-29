import chalk from "chalk";
import inquirer from "inquirer";
import FilesystemService from "./filesystem-service.mjs";

export async function handleFilesystem() {
  console.log(chalk.blue("\n Sage File Explorer - Secure Filesystem Access"));

  const filesystemService = new FilesystemService();

  let continueLoop = true;
  while (continueLoop) {
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
      case "security": {
        const fsInfo = filesystemService.getSafePathsInfo();
        console.log(fsInfo.message);
        break;
      }
      case "back":
        await filesystemService.disconnect();
        console.log(chalk.cyan("\nReturning to main menu...\n"));
        continueLoop = false;
        break;
    }

    console.log();
  }
}

export async function browseDirectory(filesystemService) {
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

export async function readFileContent(filesystemService) {
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
