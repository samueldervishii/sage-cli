import { fileURLToPath } from "url";
import { spawn } from "child_process";
import path from "path";
import os from "os";
import fs from "fs-extra";
import chalk from "chalk";
import axios from "axios";
import ora from "ora";
import inquirer from "inquirer";
import { URLS, PATHS, TIMEOUTS } from "../constants/constants.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function fetchGitHubReleases() {
  try {
    const packagePath = path.join(__dirname, PATHS.PACKAGE);
    const packageData = await fs.readJson(packagePath);

    const repoUrl = packageData.repository?.url || "";
    const match = repoUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)/);

    if (!match) {
      throw new Error(
        "Could not determine GitHub repository from package.json"
      );
    }

    const [, owner, repo] = match;
    const apiUrl = `${URLS.GITHUB_API}/repos/${owner}/${repo}/releases`;

    const response = await axios.get(apiUrl, {
      timeout: TIMEOUTS.GITHUB_API,
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "sage-cli",
      },
    });

    return response.data;
  } catch (error) {
    console.error(
      chalk.yellow("Warning: Could not fetch GitHub releases"),
      error.message
    );
    return null;
  }
}

export function parseChangelogFromBody(body) {
  if (!body) return ["Release notes not available"];

  let processedBody = body;
  const jsonStringMatch = body.match(/"(### .*?)"/s);
  if (jsonStringMatch && jsonStringMatch[1].includes("\\n")) {
    try {
      const parsedContent = JSON.parse(`"${jsonStringMatch[1]}"`);
      processedBody = body + "\n\n" + parsedContent;
    } catch (e) {
      processedBody = body;
    }
  }

  const changes = [];
  const lines = processedBody.split("\n");

  for (const line of lines) {
    let trimmed = line.trim();

    if (
      !trimmed ||
      trimmed.startsWith("```") ||
      trimmed.startsWith("##") ||
      trimmed.startsWith("###") ||
      trimmed.includes("http") ||
      trimmed.toLowerCase().includes("installation") ||
      trimmed.toLowerCase().includes("full changelog")
    ) {
      continue;
    }

    trimmed = trimmed
      .replace(/\\n/g, " ")
      .replace(/^["'`]+|["'`]+$/g, "")
      .replace(/^#+\s*/, "")
      .replace(/^\*+\s*/, "")
      .replace(/^-+\s*/, "")
      .replace(/\s+/g, " ")
      .replace(/^(New Features|Bug Fixes|Improvements|Changes)$/i, "")
      .trim();

    if (trimmed.match(/^[-*•]\s+/) || trimmed.match(/^\d+\.\s+/)) {
      const change = trimmed
        .replace(/^[-*•]\s+/, "")
        .replace(/^\d+\.\s+/, "")
        .trim();
      if (change && change.length > 3 && change.length < 200) {
        changes.push(change);
      }
    } else if (
      trimmed.length > 5 &&
      trimmed.length < 200 &&
      !trimmed.startsWith("#") &&
      !trimmed.startsWith("**") &&
      !trimmed.startsWith("```") &&
      !trimmed.toLowerCase().includes("what's changed") &&
      !trimmed.toLowerCase().includes("bash -c") &&
      !trimmed.toLowerCase().includes("new features") &&
      !trimmed.toLowerCase().includes("bug fixes") &&
      !trimmed.toLowerCase().includes("improvements") &&
      !trimmed.match(/^\w+:$/) &&
      !trimmed.match(/^".*"$/)
    ) {
      changes.push(trimmed);
    }
  }

  const cleanChanges = changes
    .filter(change => change && change.trim().length > 3)
    .map(change => change.charAt(0).toUpperCase() + change.slice(1))
    .filter((change, index, array) => array.indexOf(change) === index)
    .slice(0, 8);

  return cleanChanges.length > 0
    ? cleanChanges
    : ["Release notes not available"];
}

export async function showChangelog() {
  console.log(chalk.cyan("\n Sage CLI Changelog\n"));

  const spinner = ora("Fetching changelog from GitHub...").start();

  try {
    const releases = await fetchGitHubReleases();
    spinner.stop();

    if (!releases || releases.length === 0) {
      console.log(chalk.yellow("No releases found on GitHub."));
      return;
    }

    releases.slice(0, 10).forEach(release => {
      const version = release.tag_name.replace(/^v/, "");
      const date = new Date(release.published_at).toLocaleDateString();
      const changes = parseChangelogFromBody(release.body);

      console.log(chalk.green.bold(`v${version}`) + chalk.gray(` (${date})`));

      if (release.name && release.name !== release.tag_name) {
        console.log(chalk.italic.gray(`  ${release.name}`));
      }

      changes.forEach(change => {
        console.log(`  • ${change}`);
      });

      console.log();
    });

    if (releases.length > 10) {
      console.log(chalk.gray(`... and ${releases.length - 10} more releases`));
      console.log(chalk.gray(`View full changelog: ${URLS.REPO_URL}/releases`));
    }
  } catch (error) {
    spinner.stop();
    console.error(chalk.red("Error fetching changelog:"), error.message);
    console.log(
      chalk.gray(
        "Unable to fetch changelog from GitHub. Please check your internet connection."
      )
    );
  }
}

export async function checkForUpdates(silent = false) {
  const spinner = !silent ? ora("Checking for updates...").start() : null;

  try {
    const packagePath = path.join(__dirname, PATHS.PACKAGE);
    const packageData = await fs.readJson(packagePath);
    const currentVersion = packageData.version;

    const releases = await fetchGitHubReleases();

    if (!releases || releases.length === 0) {
      if (spinner) spinner.stop();
      if (!silent) {
        console.log(chalk.yellow("No releases found on GitHub."));
        console.log(
          chalk.gray("This appears to be a local development version")
        );
      }
      return null;
    }

    const latestRelease = releases[0];
    const latestVersion = latestRelease.tag_name.replace(/^v/, "");

    if (spinner) spinner.stop();

    const comparison = compareVersions(currentVersion, latestVersion);

    if (comparison === 0) {
      if (!silent) {
        console.log(chalk.green("You're running the latest version!"));
        console.log(chalk.gray(`Current version: ${currentVersion}`));
      }
      return null;
    } else if (comparison < 0) {
      const updateInfo = {
        current: currentVersion,
        latest: latestVersion,
        releaseUrl: latestRelease.html_url,
        releaseNotes: parseChangelogFromBody(latestRelease.body),
      };

      if (!silent) {
        console.log(chalk.yellow("A new version is available!"));
        console.log(chalk.gray(`Current: ${currentVersion}`));
        console.log(chalk.cyan(`Latest: ${latestVersion}`));
        console.log(chalk.white("\nTo update, run:"));
        console.log(chalk.cyan(`  sage update`));

        if (updateInfo.releaseNotes.length > 0) {
          console.log(chalk.white("\nWhat's new:"));
          updateInfo.releaseNotes.slice(0, 3).forEach(note => {
            console.log(chalk.gray(`  • ${note}`));
          });
        }
      }

      return updateInfo;
    } else {
      if (!silent) {
        console.log(chalk.blue("You're running a development version!"));
        console.log(chalk.gray(`Current: ${currentVersion} (dev)`));
        console.log(chalk.yellow("This is a local development build."));
      }
      return null;
    }
  } catch (error) {
    if (spinner) spinner.stop();
    if (!silent) {
      console.log(chalk.red("Failed to check for updates:"), error.message);
      console.log(chalk.gray("Please check your internet connection"));
    }
    return null;
  }
}

export async function performUpdate() {
  try {
    const updateInfo = await checkForUpdates(true);

    if (!updateInfo) {
      console.log(chalk.green("You're already running the latest version!"));
      return;
    }

    console.log(
      `Updating from v${updateInfo.current} to v${updateInfo.latest}...`
    );

    const { confirmUpdate } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirmUpdate",
        message: `Do you want to update to v${updateInfo.latest}?`,
        default: true,
      },
    ]);

    if (!confirmUpdate) {
      console.log("Update cancelled.");
      return;
    }

    const steps = [
      "Preparing to download...",
      "Downloading installation script...",
      "Verifying download...",
      "Installing update...",
      "Cleaning up...",
    ];

    let currentStep = 0;
    const totalSteps = steps.length;

    const showProgress = (step, message, percentage = null) => {
      const progress = Math.floor((step / totalSteps) * 100);
      const progressBar =
        "█".repeat(Math.floor(progress / 5)) +
        "░".repeat(20 - Math.floor(progress / 5));
      const percent = percentage !== null ? percentage : progress;
      process.stdout.write(`\r[${progressBar}] ${percent}% ${message}...`);
    };

    showProgress(++currentStep, steps[0]);
    await new Promise(resolve => setTimeout(resolve, 500));

    const tempDir = path.join(os.tmpdir(), "sage-update");
    const scriptPath = path.join(tempDir, "install.sh");
    await fs.ensureDir(tempDir);

    showProgress(++currentStep, steps[1]);

    try {
      const response = await axios.get(URLS.INSTALL_SCRIPT, {
        timeout: TIMEOUTS.NETWORK,
        headers: {
          "User-Agent": "sage-cli-updater",
        },
      });

      showProgress(++currentStep, steps[2]);
      await fs.writeFile(scriptPath, response.data);
      await fs.chmod(scriptPath, 0o755);
      await new Promise(resolve => setTimeout(resolve, 300));

      showProgress(++currentStep, steps[3]);

      await new Promise((resolve, reject) => {
        const child = spawn("bash", [scriptPath], {
          stdio: ["ignore", "ignore", "pipe"],
          env: { ...process.env, SAGE_UPDATE: "true" },
        });

        child.on("close", code => {
          if (code === 0) {
            resolve(code);
          } else {
            reject(new Error(`Installation script failed with code ${code}`));
          }
        });

        child.on("error", err => {
          reject(err);
        });
      });

      showProgress(++currentStep, steps[4]);
      await fs.remove(tempDir);
      await new Promise(resolve => setTimeout(resolve, 200));

      process.stdout.write(`\r\x1b[K[${"█".repeat(20)}] 100% Complete!\n`);

      console.log(chalk.green(`Updated to v${updateInfo.latest}`));

      // Show proper release information
      console.log("\nWhat's new:");
      console.log(`  • Linux/macOS:`);
      console.log(
        `    ${chalk.cyan('bash -c "$(curl -fsSL https://raw.githubusercontent.com/samueldervishii/sage-cli/main/install.sh)"')}`
      );
      console.log(`  • Windows (PowerShell):`);
      console.log(
        `    ${chalk.cyan("irm https://raw.githubusercontent.com/samueldervishii/sage-cli/main/install.ps1 | iex")}`
      );
      console.log(`  • Windows (Node.js):`);
      console.log(
        `    ${chalk.cyan("curl -o install.mjs https://raw.githubusercontent.com/samueldervishii/sage-cli/main/install.mjs && node install.mjs")}`
      );

      if (updateInfo.releaseNotes.length > 0) {
        console.log(`\nNew Features:`);
        updateInfo.releaseNotes.slice(0, 3).forEach(note => {
          console.log(`  • ${note}`);
        });
      }

      console.log(`\nFull Changelog:`);
      console.log(
        `Full Changelog: https://github.com/samueldervishii/sage-cli/commits/v${updateInfo.latest}`
      );

      process.exit(0);
    } catch (downloadError) {
      process.stdout.write(`\rDownload failed\n`);
      console.error(
        chalk.red("Failed to download installation script:"),
        downloadError.message
      );
      console.log(chalk.gray("Manual installation:"));
      console.log(chalk.cyan(`bash -c "$(curl -fsSL ${URLS.INSTALL_SCRIPT})"`));
    }
  } catch (error) {
    console.error(chalk.red("Update failed:"), error.message);
    console.log(chalk.gray("Manual installation:"));
    console.log(chalk.cyan(`bash -c "$(curl -fsSL ${URLS.INSTALL_SCRIPT})"`));
  }
}

export function compareVersions(version1, version2) {
  const parseVersion = version => {
    const parts = version.split("-");
    const versionPart = parts[0];
    const prerelease = parts[1] || "";

    return {
      version: versionPart.split(".").map(Number),
      prerelease: prerelease,
    };
  };

  const v1 = parseVersion(version1);
  const v2 = parseVersion(version2);

  const maxLength = Math.max(v1.version.length, v2.version.length);
  while (v1.version.length < maxLength) v1.version.push(0);
  while (v2.version.length < maxLength) v2.version.push(0);

  for (let i = 0; i < maxLength; i++) {
    if (v1.version[i] > v2.version[i]) return 1;
    if (v1.version[i] < v2.version[i]) return -1;
  }
  if (!v1.prerelease && v2.prerelease) return 1;
  if (v1.prerelease && !v2.prerelease) return -1;
  if (!v1.prerelease && !v2.prerelease) return 0;

  if (v1.prerelease > v2.prerelease) return 1;
  if (v1.prerelease < v2.prerelease) return -1;

  return 0;
}
