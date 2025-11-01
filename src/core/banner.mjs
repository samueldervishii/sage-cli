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
  const bannerLines = banner.split("\n").filter(line => line.trim());

  const packagePath = path.join(__dirname, PATHS.PACKAGE);
  let currentVersion = DEFAULTS.VERSION;
  try {
    const packageData = await fs.readJson(packagePath);
    currentVersion = packageData.version;
  } catch (error) {
    console.log(chalk.yellow("Falling back to manual version..."));
    console.log("Something went wrong: ", error.message);
  }

  // Get current directory
  const currentDir = process.cwd();

  // Create clickable GitHub link for author with underline
  const authorLink = `\u001b]8;;https://github.com/samueldervishii\u0007${chalk.underline("Samuel")}\u001b]8;;\u0007`;

  // Create info lines
  const infoLines = [
    `   Sage CLI v${currentVersion} - ${authorLink}`,
    `   ${chalk.cyan("Gemini 2.0 Flash Exp")}`,
    `   ${chalk.gray(currentDir)}`,
  ];

  // Display banner with info on the right
  console.log();
  for (let i = 0; i < Math.max(bannerLines.length, infoLines.length); i++) {
    const bannerLine = bannerLines[i] || "";
    const infoLine = infoLines[i] || "";
    console.log(bannerLine + infoLine);
  }
  console.log();
}

export async function showVersion() {
  const packagePath = path.join(__dirname, PATHS.PACKAGE);
  const packageData = await fs.readJson(packagePath);

  console.log(chalk.cyan(`Version: ${packageData.version}`));
  console.log(chalk.gray(`Node.js: ${process.version}`));
  console.log(chalk.gray(`Platform: ${process.platform} ${process.arch}`));
}

export function displayTips() {
  const DIM = chalk.dim;
  const CYAN_BOLD = chalk.cyan.bold;
  const GREEN = chalk.green;
  const GRAY = chalk.gray;
  const YELLOW = chalk.yellow;
  const BOLD = chalk.bold;

  // We are removing the borders, so we only define the content.
  // We'll keep a consistent indentation of 2 spaces for all lines.
  const INDENT = "  ";

  // --- Header Line (Centered and stylized) ---
  const HEADER_TEXT = "Getting Started"; // 15 chars
  // Creating a decorative look: ★ Getting Started ★ (19 visible chars)
  const HEADER_TEXT_DECORATED = CYAN_BOLD(HEADER_TEXT);
  // The original box padding was 22 spaces on the left to center it within the 63-char width.
  // We add this padding after our base INDENT.
  const HEADER_LINE_PADDING = " ".repeat(19);
  const HEADER_LINE = INDENT + HEADER_LINE_PADDING + HEADER_TEXT_DECORATED;

  // --- Tip 1 Line ---
  const TIP_1_MAIN_TEXT = BOLD(
    "Type your questions directly - Sage will respond"
  );
  const TIP_1_CONTENT = GREEN("●") + " " + TIP_1_MAIN_TEXT;
  const TIP_1_LINE = INDENT + TIP_1_CONTENT;

  // --- Tip 2 Line ---
  const TIP_2_MAIN_TEXT = BOLD("Try '/files' for secure file exploration");
  const TIP_2_CONTENT = GREEN("●") + " " + TIP_2_MAIN_TEXT;
  const TIP_2_LINE = INDENT + TIP_2_CONTENT;

  // --- Tip 3 Line ---
  const TIP_3_MAIN_TEXT = BOLD(
    "Run 'sage setup' first to configure your API keys"
  );
  const TIP_3_CONTENT = GREEN("●") + " " + TIP_3_MAIN_TEXT;
  const TIP_3_LINE = INDENT + TIP_3_CONTENT;

  // --- Footer Line ---
  const FOOTER_TEXT =
    "Type '/' and press enter for command menu or chat directly";
  const FOOTER_LINE = INDENT + GRAY(FOOTER_TEXT);

  // Print the lines with an empty line above and below the tips for spacing
  console.log("");
  console.log(HEADER_LINE);
  console.log(TIP_1_LINE);
  console.log(TIP_2_LINE);
  console.log(TIP_3_LINE);
  console.log(FOOTER_LINE);
  console.log("");
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
