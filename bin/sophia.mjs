#!/usr/bin/env node

// Load environment variables from .env
import dotenv from "dotenv";
dotenv.config();

import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import fs from "fs-extra";
import chalk from "chalk";
import gradient from "gradient-string";
import inquirer from "inquirer";
import ora from "ora";
import SimpleChat from "../lib/simple-chat.mjs";

// Resolve __dirname in ES module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cool Sophia banner
function displayBanner() {
  const banner = gradient([
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
  ])(
    `
   ███████  ██████  ██████  ██   ██ ██  █████  
   ██      ██    ██ ██   ██ ██   ██ ██ ██   ██ 
   ███████ ██    ██ ██████  ███████ ██ ███████ 
        ██ ██    ██ ██      ██   ██ ██ ██   ██ 
   ███████  ██████  ██      ██   ██ ██ ██   ██ 
   
   ${chalk.cyan("Sophia")} - ${chalk.magenta("Your Interactive AI Assistant")}
   ${chalk.gray("Created by Samuel")}
   `
  );
  console.log(banner);
}

// Interactive mode
async function startInteractiveMode() {
  displayBanner();
  console.log(
    chalk.blue(
      "Welcome to Sophia! I'm here to help you generate mock servers and more.\n"
    )
  );

  while (true) {
    const { action } = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: chalk.cyan("What would you like to do?"),
        choices: [
          { name: "Chat Mode", value: "conversational-chat" },
          { name: "Generate Mock Server (Quick Mode)", value: "chat" },
          { name: "View History", value: "history" },
          { name: "Configuration", value: "config" },
          { name: "Clean Generated Files", value: "clean" },
          { name: "Test Endpoint", value: "test" },
          { name: "Create Spring Boot Project", value: "spring" },
          { name: "Generate from Swagger", value: "swagger" },
          { name: "Exit", value: "exit" },
        ],
      },
    ]);

    switch (action) {
      case "conversational-chat":
        await startConversationalChat();
        break;
      case "chat":
        await handleChat();
        break;
      case "history":
        await showHistory();
        break;
      case "config":
        await handleConfig();
        break;
      case "clean":
        await cleanFiles();
        break;
      case "test":
        await testEndpoint();
        break;
      case "spring":
        await createSpringProject();
        break;
      case "swagger":
        await generateFromSwagger();
        break;
      case "exit":
        console.log(
          chalk.magenta("\nThanks for using Sophia! See you next time!")
        );
        process.exit(0);
        break;
    }

    console.log(); // Add spacing between operations
  }
}

// Start conversational chat mode (like Claude Code/Gemini CLI)
async function startConversationalChat() {
  console.log(chalk.blue("\nStarting Sophia Chat Mode..."));
  console.log(
    chalk.gray(
      "This works just like Claude Code or Gemini CLI - have a natural conversation!\n"
    )
  );

  try {
    const chat = new SimpleChat();
    await chat.startChat();
    // After chat ends, exit instead of returning to menu
    process.exit(0);
  } catch (error) {
    console.error(chalk.red("Error starting chat mode:"), error.message);
    if (error.message.includes("GEMINI_API_KEY")) {
      console.log(
        chalk.yellow("Make sure your GEMINI_API_KEY is set in the .env file")
      );
    }
    process.exit(1);
  }
}

// Handle chat/prompt input
async function handleChat() {
  const { prompt } = await inquirer.prompt([
    {
      type: "input",
      name: "prompt",
      message: chalk.green("What would you like me to create?"),
      validate: (input) => (input.trim() ? true : "Please enter a prompt"),
    },
  ]);

  // Call the generator with the prompt
  const spinner = ora({
    text: chalk.blue("Sophia is thinking..."),
    spinner: "dots12",
  }).start();

  // Save prompt to history
  await savePromptHistory(prompt);

  try {
    const generatorPath = path.join(__dirname, "../lib/generate.mjs");
    const child = spawn("node", [generatorPath, prompt], { stdio: "pipe" });

    let output = "";
    child.stdout.on("data", (data) => {
      output += data.toString();
    });

    child.stderr.on("data", (data) => {
      output += data.toString();
    });

    child.on("close", (code) => {
      spinner.stop();
      if (code === 0) {
        console.log(chalk.green("Mock server generated successfully!"));
        console.log(output);
      } else {
        console.log(chalk.red("Error generating mock server:"));
        console.log(output);
      }
    });

    child.on("error", (err) => {
      spinner.stop();
      console.error(chalk.red("Failed to run generator:"), err.message);
    });
  } catch (error) {
    spinner.stop();
    console.error(chalk.red("Error:"), error.message);
  }
}

// Save prompt to history
async function savePromptHistory(prompt) {
  const logsDir = path.join(__dirname, "../logs");
  const historyPath = path.join(logsDir, "history.json");

  await fs.ensureDir(logsDir);
  const entry = { prompt, timestamp: new Date().toISOString() };

  let history = [];
  if (await fs.pathExists(historyPath)) {
    history = await fs.readJson(historyPath);
  }
  history.push(entry);
  await fs.writeJson(historyPath, history, { spaces: 2 });
}

// Show command history
async function showHistory() {
  const historyPath = path.join(__dirname, "../logs/history.json");

  if (!fs.existsSync(historyPath)) {
    console.log(chalk.yellow("No history found."));
    return;
  }

  const history = await fs.readJson(historyPath);
  console.log(chalk.cyan(`\nPrompt History (${history.length} entries):\n`));

  history.slice(-10).forEach((entry, index) => {
    const date = new Date(entry.timestamp).toLocaleString();
    console.log(
      chalk.gray(`${history.length - 9 + index}.`),
      chalk.white(`"${entry.prompt}"`),
      chalk.gray(`- ${date}`)
    );
  });

  if (history.length > 10) {
    console.log(chalk.gray(`\n... and ${history.length - 10} more entries`));
  }
}

// Handle configuration
async function handleConfig() {
  const configPath = path.join(__dirname, "../.sophiarc.json");

  const { configAction } = await inquirer.prompt([
    {
      type: "list",
      name: "configAction",
      message: "Configuration options:",
      choices: [
        { name: "Show current config", value: "show" },
        { name: "Edit config", value: "edit" },
        { name: "Back to main menu", value: "back" },
      ],
    },
  ]);

  if (configAction === "show") {
    const config = await fs.readJson(configPath).catch(() => ({}));
    console.log(chalk.cyan("\nCurrent Configuration:"));
    console.log(JSON.stringify(config, null, 2));
  } else if (configAction === "edit") {
    const { key, value } = await inquirer.prompt([
      {
        type: "input",
        name: "key",
        message: "Config key:",
        validate: (input) => (input.trim() ? true : "Please enter a key"),
      },
      {
        type: "input",
        name: "value",
        message: "Config value:",
        validate: (input) => (input.trim() ? true : "Please enter a value"),
      },
    ]);

    const config = await fs.readJson(configPath).catch(() => ({}));
    config[key] = value;
    await fs.writeJson(configPath, config, { spaces: 2 });
    console.log(chalk.green(`Config updated: ${key} = ${value}`));
  }
}

// Clean generated files
async function cleanFiles() {
  const { confirmClean } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirmClean",
      message: chalk.red(
        "Are you sure you want to clean all generated mocks and history?"
      ),
      default: false,
    },
  ]);

  if (!confirmClean) {
    console.log(chalk.yellow("Clean operation cancelled."));
    return;
  }

  const genDir = path.join(__dirname, "../generated");
  const logsDir = path.join(__dirname, "../logs/history.json");

  const spinner = ora("Cleaning files...").start();

  try {
    if (await fs.pathExists(genDir)) {
      await fs.emptyDir(genDir);
    }
    if (await fs.pathExists(logsDir)) {
      await fs.remove(logsDir);
    }

    spinner.stop();
    console.log(chalk.green("All generated mocks and history cleaned."));
  } catch (error) {
    spinner.stop();
    console.log(chalk.red("Error cleaning files:"), error.message);
  }
}

// Test endpoint
async function testEndpoint() {
  const { endpoint } = await inquirer.prompt([
    {
      type: "input",
      name: "endpoint",
      message: "Enter endpoint to test (e.g., /api/health):",
      validate: (input) => (input.trim() ? true : "Please enter an endpoint"),
    },
  ]);

  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `http://localhost:3000${cleanEndpoint}`;

  const spinner = ora(`Testing ${url}...`).start();

  try {
    const axios = (await import("axios")).default;
    const res = await axios.get(url);
    spinner.stop();
    console.log(chalk.green(`Response (${res.status}):`), res.data);
  } catch (err) {
    spinner.stop();
    console.log(chalk.red("Request failed:"), err.message);
  }
}

// Create Spring Boot project
async function createSpringProject() {
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "projectName",
      message: "Project name:",
      validate: (input) =>
        input.trim() ? true : "Please enter a project name",
    },
    {
      type: "input",
      name: "dependencies",
      message: "Dependencies (comma-separated, default: web):",
      default: "web",
    },
  ]);

  const spinner = ora("Creating Spring Boot project...").start();

  try {
    // Implementation similar to original but with better UX
    const axios = (await import("axios")).default;
    const depsList = answers.dependencies.split(",").map((d) => d.trim());

    const params = new URLSearchParams({
      type: "maven-project",
      language: "java",
      bootVersion: "3.3.0",
      baseDir: answers.projectName,
      groupId: "com.sophia",
      artifactId: answers.projectName,
      name: answers.projectName,
      packageName: `com.sophia.${answers.projectName}`,
      packaging: "jar",
      javaVersion: "17",
    });

    for (const dep of depsList) {
      params.append("dependencies", dep);
    }

    const zipUrl = `https://start.spring.io/starter.zip?${params.toString()}`;
    const zipPath = path.join(process.cwd(), `${answers.projectName}.zip`);
    const targetPath = path.join(process.cwd(), answers.projectName);

    const res = await axios.get(zipUrl, { responseType: "arraybuffer" });
    await fs.writeFile(zipPath, res.data);

    const unzipper = await import("unzipper");
    await fs
      .createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: targetPath }))
      .promise();

    await fs.remove(zipPath);

    spinner.stop();
    console.log(
      chalk.green(`Spring Boot project '${answers.projectName}' created!`)
    );
    console.log(chalk.blue(`Location: ${targetPath}`));
    console.log(
      chalk.gray(`To run: cd ${answers.projectName} && ./mvnw spring-boot:run`)
    );
  } catch (err) {
    spinner.stop();
    console.log(chalk.red("Failed to create Spring Boot project:"));
    console.log(err.response?.data?.message || err.message);
  }
}

// Generate from Swagger
async function generateFromSwagger() {
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "yamlPath",
      message: "Path to Swagger YAML file:",
      validate: (input) =>
        input.trim() ? true : "Please enter a YAML file path",
    },
    {
      type: "input",
      name: "projectName",
      message: "Project name:",
      validate: (input) =>
        input.trim() ? true : "Please enter a project name",
    },
  ]);

  const spinner = ora("Generating project from Swagger...").start();

  // Implementation similar to original but with better UX
  const codegenRoot = "/home/samuel/Downloads/swagger-codegen-3.0.67";
  const codegenPath = `${codegenRoot}/modules/swagger-codegen-cli/target/swagger-codegen-cli.jar`;
  const outPath = `/home/samuel/Videos/${answers.projectName}`;

  if (!(await fs.pathExists(codegenPath))) {
    spinner.text = "Building swagger-codegen-cli.jar...";
    const build = spawn("mvn", ["clean", "install"], {
      cwd: codegenRoot,
      stdio: "pipe",
    });

    await new Promise((resolve, reject) => {
      build.on("exit", (code) =>
        code === 0 ? resolve() : reject(new Error("Maven build failed"))
      );
    });
  }

  const args = [
    "-jar",
    codegenPath,
    "generate",
    "-i",
    answers.yamlPath,
    "-l",
    "spring",
    "-o",
    outPath,
    "--additional-properties",
    "java8=true,javaVersion=17,dateLibrary=java8",
  ];

  const runCodegen = spawn("java", args, { stdio: "pipe" });

  runCodegen.on("exit", (code) => {
    spinner.stop();
    if (code === 0) {
      console.log(
        chalk.green(
          `Spring Boot project '${answers.projectName}' created from Swagger!`
        )
      );
      console.log(chalk.blue(`Location: ${outPath}`));
    } else {
      console.log(chalk.red("Swagger codegen failed."));
    }
  });
}

// Handle command line arguments (legacy support)
if (process.argv.length > 2) {
  const command = process.argv[2];

  // Legacy command handling for backward compatibility
  switch (command) {
    case "chat":
      console.log(chalk.blue("Starting Sophia Chat Mode..."));
      const chat = new SimpleChat();
      await chat.startChat();
      break;
    case "history":
      await showHistory();
      process.exit(0);
      break;
    case "clean":
      if (process.argv[3] === "--all") {
        await cleanFiles();
        process.exit(0);
      }
      break;
    case "--help":
    case "-h":
      displayBanner();
      console.log(
        chalk.cyan(`
Sophia CLI Commands:

Interactive Mode:
  sophia                    Start interactive mode (recommended)

Chat Mode (Like Claude Code/Gemini CLI):
  sophia chat               Start conversational chat mode

Legacy Commands:
  sophia "prompt"           Generate mock server from prompt
  sophia history            Show command history
  sophia clean --all        Clean all generated files
  sophia --help             Show this help

Examples:
  sophia                    # Interactive menu
  sophia chat               # Conversational chat mode
  sophia "create a REST API for user management"
  sophia history
      `)
      );
      process.exit(0);
      break;
    default:
      // Handle direct prompt
      const prompt = process.argv.slice(2).join(" ").trim();
      if (prompt && !prompt.startsWith("--")) {
        await savePromptHistory(prompt);
        const generatorPath = path.join(__dirname, "../lib/generate.mjs");
        const child = spawn("node", [generatorPath, ...process.argv.slice(2)], {
          stdio: "inherit",
        });

        child.on("error", (err) => {
          console.error(chalk.red("Failed to run generator:"), err.message);
        });
        process.exit(0);
      }
  }

  // If no valid command was found, start interactive mode
  startInteractiveMode().catch(console.error);
} else {
  // Start interactive mode by default
  startInteractiveMode().catch(console.error);
}
