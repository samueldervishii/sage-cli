import { fileURLToPath } from "url";
import { spawn } from "child_process";
import path from "path";
import fs from "fs-extra";
import chalk from "chalk";
import gradient from "gradient-string";
import {
  BANNER_GRADIENT,
  BANNER_ASCII,
  PATHS,
} from "../constants/constants.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function displayBanner(modelName = null) {
  // Get version
  const packagePath = path.join(__dirname, PATHS.PACKAGE);
  let version = "1.0.0";
  try {
    const packageData = await fs.readJson(packagePath);
    version = packageData.version;
  } catch {
    // Use default version
  }

  // Format model name for display
  const modelDisplay = modelName
    ? modelName
        .replace("gemini-", "Gemini ")
        .replace("-exp", " Exp")
        .replace("-", " ")
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    : "Gemini 2.0 Flash Exp";

  // Get current directory and username
  const currentDir = process.cwd();
  const username = process.env.USER || process.env.USERNAME || "";

  // Create welcome message
  const welcomeMessage = username
    ? `Welcome back ${username}!`
    : "Welcome back!";

  // ASCII art with gradient (horizontal display from constants)
  const asciiHorizontal = gradient(BANNER_GRADIENT)(BANNER_ASCII);

  // Box drawing
  const leftColWidth = 44;
  const rightColWidth = 66;

  // Helper to pad text
  const pad = (text, width, align = "left") => {
    // Strip ANSI codes to get actual length
    // eslint-disable-next-line no-control-regex -- ANSI escape codes are intentional
    const stripped = text
      .replace(/\u001b\[[0-9;]*m/g, "")
      // eslint-disable-next-line no-control-regex -- ANSI escape codes are intentional
      .replace(/\u001b]8;;[^\u0007]*\u0007/g, "")
      // eslint-disable-next-line no-control-regex -- ANSI escape codes are intentional
      .replace(/\u001b]8;;\u0007/g, "");
    const padding = width - stripped.length;
    if (align === "center") {
      const leftPad = Math.floor(padding / 2);
      const rightPad = padding - leftPad;
      return " ".repeat(leftPad) + text + " ".repeat(rightPad);
    }
    return text + " ".repeat(Math.max(0, padding));
  };

  // Create version text for top border
  const versionText = ` Sage CLI v${version} `;
  const versionTextLength = versionText.length;
  const leftDashes = Math.floor((leftColWidth - versionTextLength) / 2);
  const rightDashes = leftColWidth - leftDashes - versionTextLength;

  // Create left column content (centered)
  const leftContent = [
    "",
    welcomeMessage,
    "",
    asciiHorizontal,
    "",
    chalk.cyan(modelDisplay),
    chalk.gray(currentDir),
  ];

  // Create right column content with bold "Tips"
  const rightContent = [
    { text: chalk.bold("Tips for getting started"), align: "center" },
    { text: "", align: "left" },
    { text: chalk.gray("  -> Type .exit to quit"), align: "left" },
    {
      text: chalk.gray("  -> sage --resume - Continue previous chat"),
      align: "left",
    },
    {
      text: chalk.gray("  -> sage memory - Manage memories about you"),
      align: "left",
    },
    {
      text: chalk.gray("  -> Ask me to remember things you tell me"),
      align: "left",
    },
    {
      text: chalk.gray("  -> I can search the web for current info"),
      align: "left",
    },
  ];

  // Build the box
  console.log();
  console.log(
    chalk.gray("╭") +
      chalk.gray("─".repeat(leftDashes)) +
      chalk.white(versionText) +
      chalk.gray("─".repeat(rightDashes)) +
      chalk.gray("┬") +
      chalk.gray("─".repeat(rightColWidth)) +
      chalk.gray("╮")
  );

  // Process lines
  const maxLines = Math.max(leftContent.length, rightContent.length);
  for (let i = 0; i < maxLines; i++) {
    const left = leftContent[i] || "";
    const right = rightContent[i] || { text: "", align: "left" };

    const leftCell = pad(left, leftColWidth, "center");
    const rightCell =
      typeof right === "string"
        ? pad(right, rightColWidth)
        : pad(right.text, rightColWidth, right.align);

    console.log(
      chalk.gray("│") + leftCell + chalk.gray("│") + rightCell + chalk.gray("│")
    );
  }

  console.log(
    chalk.gray("╰") +
      chalk.gray("─".repeat(leftColWidth)) +
      chalk.gray("┴") +
      chalk.gray("─".repeat(rightColWidth)) +
      chalk.gray("╯")
  );
  console.log();
}

export async function showVersion() {
  const packagePath = path.join(__dirname, PATHS.PACKAGE);
  const packageData = await fs.readJson(packagePath);

  console.log(chalk.cyan(`Version: ${packageData.version}`));
  console.log(chalk.gray(`Node.js: ${process.version}`));
  console.log(chalk.gray(`Platform: ${process.platform} ${process.arch}`));
}

export async function getBuildInfo() {
  try {
    const { stdout } = await Promise.race([
      new Promise(resolve => {
        const child = spawn("git", ["rev-parse", "--short", "HEAD"], {
          cwd: path.join(__dirname, ".."),
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
      }),
      new Promise(resolve => setTimeout(() => resolve({ stdout: null }), 5000)),
    ]);

    if (stdout) {
      const { stdout: dateOutput } = await Promise.race([
        new Promise(resolve => {
          const child = spawn(
            "git",
            ["log", "-1", "--format=%cd", "--date=short"],
            {
              cwd: path.join(__dirname, ".."),
              stdio: ["ignore", "pipe", "ignore"],
            }
          );

          let output = "";
          child.stdout.on("data", data => (output += data.toString()));
          child.on("close", () => resolve({ stdout: output.trim() }));
          child.on("error", () => resolve({ stdout: null }));
        }),
        new Promise(resolve =>
          setTimeout(() => resolve({ stdout: null }), 5000)
        ),
      ]);

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
