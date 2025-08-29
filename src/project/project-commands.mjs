import chalk from "chalk";
import inquirer from "inquirer";
import ora from "ora";
import ProjectHandler from "./project-handler.mjs";
import ProjectAI from "./project-ai.mjs";

export class ProjectCommands {
  constructor() {
    this.projectHandler = new ProjectHandler();
    this.projectAI = new ProjectAI(this.projectHandler);
  }

  async initialize() {
    const accessInfo = await this.projectHandler.checkProjectAccess();

    if (!accessInfo.hasAccess) {
      console.log(chalk.yellow("Project access denied. Using basic mode."));
      return false;
    }

    if (accessInfo.isProject && accessInfo.trusted) {
      console.log(chalk.green("✓ Project access granted"));

      const spinner = ora("Analyzing project structure...").start();
      try {
        await this.projectHandler.analyzeProjectStructure();
        spinner.succeed("Project structure analyzed");
        return true;
      } catch (error) {
        spinner.fail("Failed to analyze project");
        console.error(chalk.red(error.message));
        return false;
      }
    }

    return accessInfo.isProject;
  }

  async handleAnalyzeCommand() {
    if (!this.projectHandler.projectContext) {
      console.log(
        chalk.red(
          "No project context available. Run this command in a project directory."
        )
      );
      return;
    }

    const spinner = ora("Analyzing project with AI...").start();

    try {
      const analysis = await this.projectAI.analyzeProject();
      spinner.stop();

      if (analysis) {
        console.log(chalk.cyan("\nProject Analysis\n"));
        console.log(analysis);
      } else {
        console.log(chalk.red("Failed to analyze project"));
      }
    } catch (error) {
      spinner.fail("Analysis failed");
      console.error(chalk.red(error.message));
    }
  }

  async handleExplainCommand(fileName) {
    if (!this.projectHandler.projectContext) {
      console.log(
        chalk.red(
          "No project context available. Run this command in a project directory."
        )
      );
      return;
    }

    if (!fileName) {
      // Prompt for file name
      const { selectedFile } = await inquirer.prompt([
        {
          type: "input",
          name: "selectedFile",
          message:
            "Enter the file name or path to explain (e.g., 'setup-wizard.js', 'components/setup-wizard.js'):",
          validate: input =>
            input.trim().length > 0 || "Please enter a file name",
        },
      ]);
      fileName = selectedFile.trim();
    }

    const spinner = ora(`Searching and analyzing ${fileName}...`).start();

    try {
      const explanation = await this.projectAI.explainFile(fileName);
      spinner.stop();

      if (explanation) {
        console.log(chalk.cyan(`\nFile Explanation: ${fileName}\n`));
        console.log(explanation);
      } else {
        console.log(chalk.red(`Failed to explain ${fileName}`));
      }
    } catch (error) {
      spinner.fail("Explanation failed");
      console.error(chalk.red(error.message));
    }
  }

  async handleSuggestCommand(scope = "project") {
    if (!this.projectHandler.projectContext) {
      console.log(
        chalk.red(
          "No project context available. Run this command in a project directory."
        )
      );
      return;
    }

    const spinner = ora("Generating suggestions...").start();

    try {
      const suggestions = await this.projectAI.suggestImprovements(scope);
      spinner.stop();

      if (suggestions) {
        console.log(chalk.cyan("\nImprovement Suggestions\n"));
        console.log(suggestions);
      } else {
        console.log(chalk.red("Failed to generate suggestions"));
      }
    } catch (error) {
      spinner.fail("Suggestions failed");
      console.error(chalk.red(error.message));
    }
  }

  async handleSecurityCommand() {
    if (!this.projectHandler.projectContext) {
      console.log(
        chalk.red(
          "No project context available. Run this command in a project directory."
        )
      );
      return;
    }

    const spinner = ora("Performing security analysis...").start();

    try {
      const analysis = await this.projectAI.securityAnalysis();
      spinner.stop();

      if (analysis) {
        console.log(chalk.cyan("\nSecurity Analysis\n"));
        console.log(analysis);
      } else {
        console.log(chalk.red("Failed to perform security analysis"));
      }
    } catch (error) {
      spinner.fail("Security analysis failed");
      console.error(chalk.red(error.message));
    }
  }

  async handleStructureCommand() {
    if (!this.projectHandler.projectContext) {
      console.log(
        chalk.red(
          "No project context available. Run this command in a project directory."
        )
      );
      return;
    }

    const context = this.projectHandler.projectContext;

    console.log(chalk.cyan("\nProject Structure\n"));
    console.log(chalk.white(`Project: ${context.name}`));
    console.log(chalk.gray(`Path: ${context.path}`));
    console.log(
      chalk.gray(
        `Type: ${context.type}${context.framework ? ` (${context.framework})` : ""}`
      )
    );
    console.log();

    if (context.mainFiles.length > 0) {
      console.log(chalk.yellow("Main Files:"));
      context.mainFiles.forEach(file => {
        console.log(`  • ${file}`);
      });
      console.log();
    }

    if (context.configFiles.length > 0) {
      console.log(chalk.yellow("Configuration Files:"));
      context.configFiles.forEach(file => {
        console.log(`  • ${file}`);
      });
      console.log();
    }

    console.log(chalk.yellow("Directory Structure:"));
    this.printStructure(context.structure, "  ");
  }

  async handleAskCommand(question) {
    if (!this.projectHandler.projectContext) {
      console.log(
        chalk.red(
          "No project context available. Run this command in a project directory."
        )
      );
      return;
    }

    if (!question) {
      const { userQuestion } = await inquirer.prompt([
        {
          type: "input",
          name: "userQuestion",
          message: "What would you like to know about this project?",
        },
      ]);
      question = userQuestion;
    }

    if (!question.trim()) {
      console.log(chalk.yellow("Please provide a question."));
      return;
    }

    const spinner = ora("Thinking...").start();

    try {
      const answer = await this.projectAI.answerProjectQuestion(question);
      spinner.stop();

      if (answer) {
        console.log(chalk.cyan("\nAnswer\n"));
        console.log(answer);
      } else {
        console.log(chalk.red("Failed to answer question"));
      }
    } catch (error) {
      spinner.fail("Question failed");
      console.error(chalk.red(error.message));
    }
  }

  async showAvailableFiles() {
    if (!this.projectHandler.projectContext) return;

    const context = this.projectHandler.projectContext;
    console.log(chalk.cyan("\nAvailable Files to Explain:\n"));

    if (context.mainFiles.length > 0) {
      console.log(chalk.yellow("Main Files:"));
      context.mainFiles.forEach(file => {
        console.log(`  sage explain "${file}"`);
      });
      console.log();
    }

    if (context.configFiles.length > 0) {
      console.log(chalk.yellow("Config Files:"));
      context.configFiles.forEach(file => {
        console.log(`  sage explain "${file}"`);
      });
      console.log();
    }

    console.log(chalk.gray("You can also use: sage explain <filename>"));
  }

  printStructure(structure, indent = "", maxItems = 15) {
    let count = 0;

    for (const [name, value] of Object.entries(structure)) {
      if (count >= maxItems) {
        console.log(
          `${indent}... (${Object.keys(structure).length - maxItems} more items)`
        );
        break;
      }

      if (value === "file") {
        console.log(`${indent}${name}`);
      } else if (typeof value === "object") {
        console.log(`${indent}${name}/`);
        if (Object.keys(value).length > 0) {
          this.printStructure(value, indent + "  ", 5);
        }
      }

      count++;
    }
  }

  async handleProjectMenu() {
    if (!this.projectHandler.projectContext) {
      console.log(chalk.red("No project context available."));
      return;
    }

    const context = this.projectHandler.projectContext;
    console.log(chalk.cyan(`\nProject: ${context.name} (${context.type})\n`));

    const { action } = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: "What would you like to do?",
        choices: [
          { name: "Analyze entire project", value: "analyze" },
          { name: "Explain a file", value: "explain" },
          { name: "Get improvement suggestions", value: "suggest" },
          { name: "Security analysis", value: "security" },
          { name: "Show project structure", value: "structure" },
          { name: "Ask question about project", value: "ask" },
          { name: "Manage trusted projects", value: "manage" },
          { name: "Back to main menu", value: "back" },
        ],
      },
    ]);

    switch (action) {
      case "analyze":
        await this.handleAnalyzeCommand();
        break;
      case "explain":
        await this.handleExplainCommand();
        break;
      case "suggest":
        await this.handleSuggestCommand();
        break;
      case "security":
        await this.handleSecurityCommand();
        break;
      case "structure":
        await this.handleStructureCommand();
        break;
      case "ask":
        await this.handleAskCommand();
        break;
      case "manage":
        await this.manageTrustedProjects();
        break;
      case "back":
        return;
    }

    if (action !== "back") {
      console.log();
      await this.handleProjectMenu();
    }
  }

  async manageTrustedProjects() {
    const trustedProjects = this.projectHandler.listTrustedProjects();

    if (trustedProjects.length === 0) {
      console.log(chalk.yellow("No trusted projects found."));
      return;
    }

    console.log(chalk.cyan("\nTrusted Projects:\n"));
    trustedProjects.forEach((project, index) => {
      console.log(`${index + 1}. ${project.name}`);
      console.log(`   Path: ${project.path}`);
      console.log(`   Trusted: ${project.trusted_at}`);
      console.log();
    });

    const { action } = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: "What would you like to do?",
        choices: [
          { name: "Remove a trusted project", value: "remove" },
          { name: "Back", value: "back" },
        ],
      },
    ]);

    if (action === "remove") {
      const { projectToRemove } = await inquirer.prompt([
        {
          type: "list",
          name: "projectToRemove",
          message: "Which project to remove?",
          choices: trustedProjects.map(project => ({
            name: `${project.name} (${project.path})`,
            value: project.path,
          })),
        },
      ]);

      await this.projectHandler.removeTrustedProject(projectToRemove);
      console.log(chalk.green("✓ Project removed from trusted list"));
    }
  }

  getProjectContext() {
    return this.projectHandler.projectContext;
  }
}

export default ProjectCommands;
