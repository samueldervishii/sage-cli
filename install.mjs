#!/usr/bin/env node

import { execSync } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";

const REPO = "samueldervishii/sage-cli";
const BINARY_NAME = "sage";

const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

function print(type, message) {
  const color = colors[type] || colors.reset;
  const prefix = type.toUpperCase().padEnd(7);
  console.log(`${color}[${prefix}]${colors.reset} ${message}`);
}

function printStatus(message) {
  print("blue", message);
}
function printSuccess(message) {
  print("green", message);
}
function printWarning(message) {
  print("yellow", message);
}
function printError(message) {
  print("red", message);
}

function commandExists(command) {
  try {
    execSync(`${os.platform() === "win32" ? "where" : "which"} ${command}`, {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

function getPlatform() {
  const platform = os.platform();
  const arch = os.arch();

  const archMap = {
    x64: "x64",
    x86: "x86",
    arm64: "arm64",
    arm: "arm",
  };

  const platformMap = {
    darwin: "macos",
    linux: "linux",
    win32: "windows",
  };

  const mappedArch = archMap[arch] || arch;
  const mappedPlatform = platformMap[platform] || platform;

  if (!platformMap[platform]) {
    printError(`Unsupported platform: ${platform}`);
    process.exit(1);
  }

  return `${mappedPlatform}-${mappedArch}`;
}

async function checkNode() {
  if (!commandExists("node")) {
    printError(
      "Node.js is not installed. Please install Node.js (version 14 or higher) first."
    );
    printStatus("Visit: https://nodejs.org/");
    process.exit(1);
  }

  const nodeVersion = process.version.slice(1).split(".")[0];
  if (parseInt(nodeVersion) < 14) {
    printError(
      `Node.js version 14 or higher is required. Current version: ${process.version}`
    );
    process.exit(1);
  }

  printSuccess(`Node.js ${process.version} found`);
}

async function downloadAndExtract(url, tempDir) {
  const isWindows = os.platform() === "win32";

  // Windows tar doesn't handle piped input well, so download to temp file first
  if (isWindows) {
    const tempFile = path.join(os.tmpdir(), `sage-cli-${Date.now()}.tar.gz`);
    try {
      if (commandExists("curl")) {
        execSync(`curl -fsSL "${url}" -o "${tempFile}"`, {
          stdio: "inherit",
        });
      } else if (commandExists("powershell")) {
        execSync(
          `powershell -Command "Invoke-WebRequest -Uri '${url}' -OutFile '${tempFile}'"`,
          { stdio: "inherit" }
        );
      } else {
        printError(
          "Neither curl nor PowerShell found. Please install one of them."
        );
        process.exit(1);
      }

      // Extract the downloaded file
      if (commandExists("tar")) {
        execSync(`tar -xzf "${tempFile}" -C "${tempDir}"`, {
          stdio: "inherit",
        });
      } else {
        printError("tar command not found. Please install Git for Windows.");
        process.exit(1);
      }
    } finally {
      // Clean up temp file
      try {
        await fs.unlink(tempFile);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  } else {
    // Unix-like systems can use piping
    if (commandExists("curl")) {
      execSync(`curl -fsSL "${url}" | tar -xz -C "${tempDir}"`, {
        stdio: "inherit",
      });
    } else if (commandExists("wget")) {
      execSync(`wget -qO- "${url}" | tar -xz -C "${tempDir}"`, {
        stdio: "inherit",
      });
    } else {
      printError("Neither curl nor wget found. Please install one of them.");
      process.exit(1);
    }
  }
}

function getInstallDir() {
  const isWindows = os.platform() === "win32";
  if (isWindows) {
    return path.join(os.homedir(), "AppData", "Local", "sage-cli", "bin");
  } else {
    return path.join(os.homedir(), ".local", "bin");
  }
}

function getSageDir() {
  const installDir = getInstallDir();
  return path.join(path.dirname(installDir), "sage-cli");
}

async function createExecutable(installDir, sageDir) {
  const isWindows = os.platform() === "win32";
  const binaryPath = path.join(
    installDir,
    isWindows ? `${BINARY_NAME}.cmd` : BINARY_NAME
  );

  let content;
  if (isWindows) {
    content = `@echo off
node "${path.join(sageDir, "bin", "sage.mjs")}" %*`;
  } else {
    content = `#!/bin/bash
exec node "${path.join(sageDir, "bin", "sage.mjs")}" "$@"`;
  }

  await fs.writeFile(binaryPath, content);

  if (!isWindows) {
    await fs.chmod(binaryPath, "755");
  }

  return binaryPath;
}

async function installFromGithub() {
  printStatus("Installing Sage CLI from GitHub...");

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sage-cli-"));
  const installDir = getInstallDir();
  const sageDir = getSageDir();

  try {
    await fs.mkdir(installDir, { recursive: true });

    try {
      await fs.rm(sageDir, { recursive: true, force: true });
      printStatus("Removed existing installation...");
    } catch (e) {
      throw new Error(`Failed to remove existing installation: ${e.message}`);
    }
    printStatus("Downloading from GitHub...");
    const downloadUrl = `https://github.com/${REPO}/archive/main.tar.gz`;
    await downloadAndExtract(downloadUrl, tempDir);

    const extractedDir = path.join(tempDir, "sage-cli-main");
    process.chdir(extractedDir);

    printStatus("Installing dependencies...");
    if (!commandExists("npm")) {
      printError(
        "npm is required but not found. Please install Node.js with npm."
      );
      process.exit(1);
    }

    execSync("npm install --production --silent", { stdio: "inherit" });

    printStatus(`Installing to ${sageDir}...`);
    await fs.cp(extractedDir, sageDir, { recursive: true });

    const binaryPath = await createExecutable(installDir, sageDir);

    printSuccess(`${BINARY_NAME} installed to ${binaryPath}`);

    return { installDir, binaryPath };
  } finally {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.error("Failed to remove temporary directory:", e);
    }
  }
}

function isInPath(dir) {
  const pathVar = process.env.PATH || "";
  const pathSeparator = os.platform() === "win32" ? ";" : ":";
  return pathVar.split(pathSeparator).includes(dir);
}

async function verifyInstallation(installDir, binaryPath) {
  printStatus("Verifying installation...");

  const binaryName = path.basename(binaryPath);

  if (commandExists(binaryName.replace(".cmd", ""))) {
    printSuccess(`${BINARY_NAME} is installed and available in PATH`);
    return true;
  } else {
    try {
      await fs.access(binaryPath);
      printWarning(`${BINARY_NAME} installed but not in PATH`);
      printStatus(`You can run it with: ${binaryPath}`);
      return true;
    } catch {
      printError("Installation verification failed");
      return false;
    }
  }
}

function getShellInstructions(installDir) {
  const isWindows = os.platform() === "win32";

  if (isWindows) {
    return {
      message:
        "Add to PATH in System Environment Variables or run this in PowerShell as Administrator:",
      command: `[Environment]::SetEnvironmentVariable("Path", $env:Path + ";${installDir}", "User")`,
    };
  } else {
    const shell = process.env.SHELL || "";
    let profileFile = "~/.profile";

    if (shell.includes("zsh")) {
      profileFile = "~/.zshrc";
    } else if (shell.includes("bash")) {
      profileFile = "~/.bashrc";
    }

    return {
      message: `Add this line to your ${profileFile}:`,
      command: `export PATH="$HOME/.local/bin:$PATH"`,
    };
  }
}

async function setupPath(installDir) {
  if (isInPath(installDir)) {
    return;
  }

  const isWindows = os.platform() === "win32";

  printWarning(`${installDir} is not in your PATH`);

  if (isWindows) {
    // Try to automatically add to PATH on Windows
    printStatus("Attempting to add to PATH...");
    try {
      const psCommand = `[Environment]::SetEnvironmentVariable("Path", [Environment]::GetEnvironmentVariable("Path", "User") + ";${installDir}", "User")`;

      execSync(`powershell -Command "${psCommand}"`, { stdio: "pipe" });

      printSuccess("Successfully added to PATH!");
      printStatus("Please restart your terminal for changes to take effect");
      printStatus(`Then you can run: ${BINARY_NAME}`);
      return;
    } catch (error) {
      printWarning("Could not automatically add to PATH");
      const instructions = getShellInstructions(installDir);
      printStatus(instructions.message);
      console.log(`\n    ${instructions.command}\n`);
      printStatus("Then restart your terminal");
    }
  } else {
    const instructions = getShellInstructions(installDir);
    printStatus(instructions.message);
    console.log(`\n    ${instructions.command}\n`);
    printStatus("Then restart your terminal or source your shell profile");
  }
}

async function main() {
  try {
    printStatus("Installing Sage CLI...");
    printStatus(`Platform: ${getPlatform()}`);

    await checkNode();

    const { installDir, binaryPath } = await installFromGithub();

    if (await verifyInstallation(installDir, binaryPath)) {
      await setupPath(installDir);
      printSuccess("Installation completed successfully!");
      printStatus(`Run '${BINARY_NAME} setup' to configure API keys`);
      printStatus(`Then run '${BINARY_NAME}' to start using Sage CLI`);
    } else {
      printError(
        "Installation verification failed. Please check the installation manually."
      );
      process.exit(1);
    }
  } catch (error) {
    printError(`Installation failed: ${error.message}`);
    process.exit(1);
  }
}

process.on("SIGINT", () => {
  printError("Installation interrupted");
  process.exit(1);
});

main();
