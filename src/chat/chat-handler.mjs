import { fileURLToPath } from "url";
import { spawn } from "child_process";
import path from "path";
import fs from "fs-extra";
import chalk from "chalk";
import inquirer from "inquirer";
import ora from "ora";
import SimpleChat from "./simple-chat.mjs";
import { PATHS, TIMEOUTS } from "../constants/constants.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function startConversationalChat() {
  console.log(chalk.blue("\nStarting Sage Chat Mode..."));

  try {
    const chat = new SimpleChat();
    await chat.initialize();
    const result = await chat.startChat();

    if (result === "menu") {
      console.log(chalk.cyan("Returning to main menu...\n"));
      return;
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error(chalk.red("Error starting chat mode:"), error.message);
    if (error.message.includes("GEMINI_API_KEY not found in configuration")) {
      console.log(chalk.yellow("Run 'sage setup' to configure your API keys"));
    }
    process.exit(1);
  }
}

export async function handleChat() {
  const { prompt } = await inquirer.prompt([
    {
      type: "input",
      name: "prompt",
      message: chalk.green("What would you like me to create?"),
      validate: input => (input.trim() ? true : "Please enter a prompt"),
    },
  ]);

  const spinner = ora({
    text: chalk.blue("Sage is thinking..."),
    spinner: "dots12",
  }).start();

  await savePromptHistory(prompt);

  try {
    const generatorPath = path.join(__dirname, PATHS.GENERATOR_SCRIPT);

    await new Promise((resolve, reject) => {
      const child = spawn("node", [generatorPath, prompt], {
        stdio: ["pipe", "pipe", "pipe"],
        detached: false,
      });

      let _output = "";
      let hasOutput = false;

      child.stdout.on("data", data => {
        const text = data.toString();
        _output += text;
        if (!hasOutput) {
          spinner.stop();
          hasOutput = true;
        }
        process.stdout.write(text);
      });

      child.stderr.on("data", data => {
        const text = data.toString();
        _output += text;
        if (!hasOutput) {
          spinner.stop();
          hasOutput = true;
        }
        process.stderr.write(chalk.red(text));
      });

      const timeout = setTimeout(() => {
        console.log(
          chalk.yellow("Generation is taking longer than expected...")
        );
        child.kill("SIGTERM");
        reject(new Error("Generation timeout"));
      }, TIMEOUTS.GENERATION);

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

export async function savePromptHistory(prompt) {
  const logsDir = path.join(__dirname, PATHS.LOGS_DIR);
  const historyPath = path.join(__dirname, PATHS.HISTORY_FILE);

  await fs.ensureDir(logsDir);
  const entry = { prompt, timestamp: new Date().toISOString() };

  let history = [];
  if (await fs.pathExists(historyPath)) {
    history = await fs.readJson(historyPath);
  }
  history.push(entry);
  await fs.writeJson(historyPath, history, { spaces: 2 });
}

export async function showHistory() {
  const historyPath = path.join(__dirname, PATHS.HISTORY_FILE);

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
