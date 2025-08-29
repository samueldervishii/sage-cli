import { fileURLToPath } from "url";
import path from "path";
import fs from "fs-extra";
import chalk from "chalk";
import inquirer from "inquirer";
import ora from "ora";
import axios from "axios";
import { PATHS, DEFAULTS } from "../constants/constants.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function cleanFiles() {
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

  const genDir = path.join(__dirname, PATHS.GENERATED_DIR);
  const logsDir = path.join(__dirname, PATHS.HISTORY_FILE);

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

export async function testEndpoint() {
  const { endpoint } = await inquirer.prompt([
    {
      type: "input",
      name: "endpoint",
      message: "Enter endpoint to test (e.g., /api/health):",
      validate: input => (input.trim() ? true : "Please enter an endpoint"),
    },
  ]);

  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${DEFAULTS.TEST_HOST}${cleanEndpoint}`;

  const spinner = ora(`Testing ${url}...`).start();

  try {
    const res = await axios.get(url);
    spinner.stop();
    console.log(chalk.green(`Response (${res.status}):`), res.data);
  } catch (err) {
    spinner.stop();
    console.log(chalk.red("Request failed:"), err.message);
  }
}
