import { fileURLToPath } from "url";
import { spawn } from "child_process";
import path from "path";
import fs from "fs-extra";
import chalk from "chalk";
import gradient from "gradient-string";
import {
  BANNER_GRADIENT,
  BANNER_ASCII,
  DEFAULTS,
  PATHS,
} from "../constants/constants.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function displayBanner() {
  const banner = gradient(BANNER_GRADIENT)(BANNER_ASCII);
  console.log(banner);

  const packagePath = path.join(__dirname, PATHS.PACKAGE);
  let currentVersion = DEFAULTS.VERSION;
  try {
    const packageData = await fs.readJson(packagePath);
    currentVersion = packageData.version;
  } catch (error) {
    console.log(chalk.yellow("Falling back to manual version..."));
    console.log("Something went wrong: ", error.message);
  }

  const subtitle = chalk.cyan("Your Interactive AI Assistant");
  const author = `${chalk.cyan("Created by")} ${chalk.italic.bold.blueBright(`\u001b]8;;https://github.com/samueldervishii\u0007Samuel\u001b]8;;\u0007`)}`;
  const version = chalk.underline.cyan(`Version: ${currentVersion}`);

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

export async function showVersion() {
  const packagePath = path.join(__dirname, PATHS.PACKAGE);
  const packageData = await fs.readJson(packagePath);

  console.log(chalk.cyan(`Version: ${packageData.version}`));
  console.log(chalk.gray(`Node.js: ${process.version}`));
  console.log(chalk.gray(`Platform: ${process.platform} ${process.arch}`));
}

export function displayTips() {
  const tips = [
    "Type your questions directly - Sage will respond with AI assistance",
    "Try '/files' for secure file exploration and management",
    "Run 'sage setup' first to configure your API keys",
  ];

  console.log(chalk.cyan("\n Tips for getting started:\n"));

  tips.forEach(tip => {
    console.log(`  ${chalk.green("✓")} ${tip}`);
  });
}

export async function getBuildInfo() {
  try {
    const { stdout } = await new Promise(resolve => {
      const child = spawn("git", ["rev-parse", "--short", "HEAD"], {
        cwd: __dirname + "/..",
        stdio: ["ignore", "pipe", "ignore"],
      });

      let output = "";
      child.stdout.on("data", data => (output += data.toString()));
      child.on("close", code => {
        if (code === 0) {
          resolve({ stdout: output.trim() });
        } else {
          resolve({ stdout: null });
        }
      });
      child.on("error", () => resolve({ stdout: null }));
    });

    if (stdout) {
      const { stdout: dateOutput } = await new Promise(resolve => {
        const child = spawn(
          "git",
          ["log", "-1", "--format=%cd", "--date=short"],
          {
            cwd: __dirname + "/..",
            stdio: ["ignore", "pipe", "ignore"],
          }
        );

        let output = "";
        child.stdout.on("data", data => (output += data.toString()));
        child.on("close", () => resolve({ stdout: output.trim() }));
        child.on("error", () => resolve({ stdout: null }));
      });

      return {
        hash: stdout,
        date: dateOutput || "unknown",
      };
    }
  } catch {
    return null;
  }
  return null;
}
