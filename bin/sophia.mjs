#!/usr/bin/env node

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
   `
  );
  console.log(banner);

  const subtitle = chalk.cyan("Your Interactive AI Assistant");
  const author = `${chalk.cyan("Created by")} ${chalk.italic.bold.blueBright(`\u001b]8;;https://github.com/samueldervishii\u0007Samuel\u001b]8;;\u0007`)}`;
  const version = chalk.underline.cyan("Version: 1.1.0");

  const padding = "   ";
  console.log(
    padding +
      chalk.underline(subtitle) +
      "  " +
      chalk.underline(author) +
      "  " +
      version
  );
}

async function startInteractiveMode() {
  displayBanner();
  console.log();

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
      case "exit":
        console.log(
          chalk.magenta("\nThanks for using Sophia! See you next time!")
        );
        process.exit(0);
    }

    console.log();
  }
}

async function startConversationalChat() {
  console.log(chalk.blue("\nStarting Sophia Chat Mode..."));

  try {
    const chat = new SimpleChat();
    const result = await chat.startChat();
    
    // If user typed "menu", return to main menu instead of exiting
    if (result === "menu") {
      console.log(chalk.cyan("Returning to main menu...\n"));
      return; // Return to main menu loop
    } else {
      process.exit(0); // Exit if user typed "exit" or chat ended normally
    }
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

async function handleChat() {
  const { prompt } = await inquirer.prompt([
    {
      type: "input",
      name: "prompt",
      message: chalk.green("What would you like me to create?"),
      validate: input => (input.trim() ? true : "Please enter a prompt"),
    },
  ]);

  const spinner = ora({
    text: chalk.blue("Sophia is thinking..."),
    spinner: "dots12",
  }).start();

  await savePromptHistory(prompt);

  try {
    const generatorPath = path.join(__dirname, "../lib/generate.mjs");
    
    // Wrap child process in a Promise to properly await completion
    await new Promise((resolve, reject) => {
      const child = spawn("node", [generatorPath, prompt], { 
        stdio: ["pipe", "pipe", "pipe"],
        detached: false
      });

      let output = "";
      let hasOutput = false;
      
      child.stdout.on("data", data => {
        const text = data.toString();
        output += text;
        // Show real-time output
        if (!hasOutput) {
          spinner.stop();
          hasOutput = true;
        }
        process.stdout.write(text);
      });

      child.stderr.on("data", data => {
        const text = data.toString();
        output += text;
        if (!hasOutput) {
          spinner.stop();
          hasOutput = true;
        }
        process.stderr.write(chalk.red(text));
      });

      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        console.log(chalk.yellow("Generation is taking longer than expected..."));
        child.kill('SIGTERM');
        reject(new Error("Generation timeout"));
      }, 30000); // 30 second timeout
      
      child.on("close", code => {
        clearTimeout(timeout);
        if (!hasOutput) {
          spinner.stop();
        }
        if (code !== 0) {
          console.error(chalk.red("Generation failed with code:"), code);
          reject(new Error(`Generation failed with code ${code}`));
        } else {
          resolve(code);
        }
      });

      child.on("error", err => {
        clearTimeout(timeout);
        if (!hasOutput) {
          spinner.stop();
        }
        console.error(chalk.red("Failed to run generator:"), err.message);
        reject(err);
      });
    });
  } catch (error) {
    spinner.stop();
    console.error(chalk.red("Error:"), error.message);
  }
}

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
        validate: input => (input.trim() ? true : "Please enter a key"),
      },
      {
        type: "input",
        name: "value",
        message: "Config value:",
        validate: input => (input.trim() ? true : "Please enter a value"),
      },
    ]);

    const config = await fs.readJson(configPath).catch(() => ({}));
    config[key] = value;
    await fs.writeJson(configPath, config, { spaces: 2 });
    console.log(chalk.green(`Config updated: ${key} = ${value}`));
  }
}

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

async function testEndpoint() {
  const { endpoint } = await inquirer.prompt([
    {
      type: "input",
      name: "endpoint",
      message: "Enter endpoint to test (e.g., /api/health):",
      validate: input => (input.trim() ? true : "Please enter an endpoint"),
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



if (process.argv.length > 2) {
  const command = process.argv[2];

  switch (command) {
    case "chat":
      console.log(chalk.blue("Starting Sophia Chat Mode..."));
      const chat = new SimpleChat();
      await chat.startChat();
      break;
    case "history":
      await showHistory();
      process.exit(0);
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
    default:
      const prompt = process.argv.slice(2).join(" ").trim();
      if (prompt && !prompt.startsWith("--")) {
        await savePromptHistory(prompt);
        const generatorPath = path.join(__dirname, "../lib/generate.mjs");
        const child = spawn("node", [generatorPath, ...process.argv.slice(2)], {
          stdio: "inherit",
        });

        child.on("error", err => {
          console.error(chalk.red("Failed to run generator:"), err.message);
        });
        process.exit(0);
      }
  }

  startInteractiveMode().catch(console.error);
} else {
  startInteractiveMode().catch(console.error);
}
