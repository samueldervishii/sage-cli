import { fileURLToPath } from "url";
import path from "path";
import os from "os";
import fs from "fs-extra";
import chalk from "chalk";
import inquirer from "inquirer";
import dotenv from "dotenv";
import { PATHS } from "../constants/constants.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function reloadEnvVars() {
  const originalLog = console.log;
  console.log = () => {};

  dotenv.config({ override: true, debug: false });
  dotenv.config({
    path: path.join(os.homedir(), ".local", "bin", "sage-cli", ".env"),
    override: true,
    debug: false,
  });
  console.log = originalLog;
}

export async function handleConfig() {
  const configPath = path.join(__dirname, PATHS.CONFIG_FILE);

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
