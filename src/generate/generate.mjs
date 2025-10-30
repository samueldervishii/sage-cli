import open from "open";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { GoogleGenerativeAI } from "@google/generative-ai";
import logger from "../utils/logger.mjs";
import ConfigManager from "../config/config-manager.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.resolve(__dirname, "../.sage.json");
const config = await fs.readJson(configPath).catch(() => ({}));
const defaultPort = config.defaultPort || 3000;

const userPrompt = process.argv.slice(2).join(" ").trim();

const baseFilename =
  userPrompt
    .slice(0, 30)
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-_]/g, "")
    .toLowerCase() || "mock-server";

if (!userPrompt) {
  console.error("Prompt is missing.");
  process.exit(1);
}

// Load API key from ConfigManager
const configManager = new ConfigManager();
const geminiApiKey = await configManager.getApiKey("gemini");

if (!geminiApiKey) {
  console.error("Error: GEMINI_API_KEY not found in configuration.");
  console.error("Please run 'sage setup' to configure your API keys.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(geminiApiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

(async () => {
  try {
    logger.info("Starting mock server generation", { prompt: userPrompt });

    const prompt = `Generate only raw, runnable Express.js code using ESM import syntax (no require or module.exports). Do not include markdown formatting or code blocks. The code should be ready to run as-is. Instruction: ${userPrompt}`;

    logger.debug("Sending request to AI", { model: "gemini-2.0-flash-exp" });
    const result = await model.generateContent(prompt);
    const response = result.response;
    const reply = response.text();

    logger.info("AI response received, processing code...");
    logger.debug("AI response details", { length: reply?.length });

    // Improved code validation
    if (!reply || typeof reply !== "string") {
      const error = new Error("No response received from AI");
      logger.error("Code generation failed", error);
      console.error("Error: No response received from AI.");
      process.exit(1);
    }

    if (reply.length < 40) {
      const error = new Error("Response too short to be valid code");
      logger.error("Code validation failed", error);
      console.error("Error: Response too short to be valid code.");
      process.exit(1);
    }

    // Check for Express.js indicators
    const hasExpress =
      reply.includes("express") ||
      reply.includes("Express") ||
      reply.includes("app.listen");

    // Check for common code structures
    const hasCodeStructure =
      reply.includes("import") ||
      reply.includes("require") ||
      reply.includes("function") ||
      reply.includes("const") ||
      reply.includes("let");

    if (!hasExpress || !hasCodeStructure) {
      const error = new Error(
        "Generated response is not valid Express.js code"
      );
      logger.error("Code validation failed", {
        error,
        hasExpress,
        hasCodeStructure,
        preview: reply.substring(0, 200),
      });
      console.error(
        "Error: Generated response doesn't appear to be valid Express.js code."
      );
      console.error("Response preview:", reply.substring(0, 200));
      process.exit(1);
    }

    let cleanCode = reply
      .replace(/```[a-z]*\n?/gi, "")
      .replace(/```$/g, "")
      .trim();

    cleanCode = cleanCode
      .replace(
        `const express = require('express');`,
        `import express from 'express';`
      )
      .replace(`module.exports =`, `export default`)
      .replace(`import { open } from 'open';`, `import open from 'open';`)
      .replace(/const port = \d+/, `const port = ${defaultPort}`);

    if (!cleanCode.includes("process.on('SIGINT'")) {
      cleanCode += `\n\n// Keep server running and handle graceful shutdown\nprocess.on('SIGINT', () => {\n  console.log('\\n👋 Shutting down mock server...');\n  process.exit(0);\n});\n\nprocess.on('SIGTERM', () => {\n  console.log('\\n👋 Shutting down mock server...');\n  process.exit(0);\n});`;
    }

    const timestamp = Date.now();
    const fileName = `${baseFilename}-${timestamp}.js`;
    const fileDir = path.resolve(
      __dirname,
      "../",
      config.projectDir || "generated"
    );
    const fullPath = path.join(fileDir, fileName);

    await fs.ensureDir(fileDir);
    await fs.writeFile(fullPath, cleanCode);

    await initializeGitRepo(fileDir, fileName, userPrompt);

    logger.success("Mock server generated successfully");
    logger.info("Generated file details", { fileName, fullPath });

    console.log(`\nMock server generated successfully!`);
    console.log(`File: ${fileName}`);
    console.log(`Location: ${fullPath}`);

    const routeMatch = cleanCode.match(/app\.get\(['"`](\/[^'"` ]*)['"`]/);
    const routePath = routeMatch ? routeMatch[1] : "/";

    console.log(`\nTo run your mock server:`);
    console.log(`   cd ${path.dirname(fullPath)}`);
    console.log(`   node ${fileName}`);
    console.log(`\nThen visit: http://localhost:${defaultPort}${routePath}`);
    console.log(`Press Ctrl+C to stop the server when running`);

    if (config.editor) {
      logger.debug("Opening file in editor", {
        editor: config.editor,
        path: fullPath,
      });
      await open(fullPath, { app: { name: config.editor } });
    }
  } catch (err) {
    logger.error("Mock server generation failed", err);
    console.error("Error occurred:", err.message);

    if (err.message.includes("API_KEY")) {
      console.error(
        "Please make sure your GEMINI_API_KEY is set in your .env file"
      );
      logger.warn("API key issue detected");
    } else if (
      err.message.includes("overloaded") ||
      err.message.includes("503")
    ) {
      console.error(
        "The AI service is currently busy. Please try again later."
      );
      logger.warn("AI service overloaded");
    } else if (err.code === "EACCES") {
      console.error("Permission denied. Check file/directory permissions.");
      logger.error("Permission error", { code: err.code });
    } else if (err.code === "ENOSPC") {
      console.error("Disk space full. Free up some space and try again.");
      logger.error("Disk space error", { code: err.code });
    }

    process.exit(1);
  }
})();

async function initializeGitRepo(projectDir, fileName, userPrompt) {
  try {
    const gitDir = path.join(projectDir, ".git");
    const gitExists = await fs.pathExists(gitDir);

    if (!gitExists) {
      logger.info("Initializing git repository...");
      await executeGitCommand(projectDir, ["init"]);
      const gitignoreContent = `node_modules/
*.log
.env
.DS_Store
dist/
coverage/
`;
      await fs.writeFile(path.join(projectDir, ".gitignore"), gitignoreContent);

      const packagePath = path.join(projectDir, "package.json");
      if (!(await fs.pathExists(packagePath))) {
        const packageJson = {
          name: "sage-generated-servers",
          version: "1.0.0",
          description: "Mock servers generated by Sage CLI",
          type: "module",
          scripts: {
            start: `node ${fileName}`,
          },
          dependencies: {
            express: "^5.1.0",
          },
        };
        await fs.writeFile(packagePath, JSON.stringify(packageJson, null, 2));
      }

      await executeGitCommand(projectDir, ["add", "."]);
      await executeGitCommand(projectDir, [
        "commit",
        "-m",
        "Initial commit: Sage CLI generated project",
      ]);

      logger.info("Git repository initialized");
    }

    const shortPrompt =
      userPrompt.slice(0, 50) + (userPrompt.length > 50 ? "..." : "");
    await executeGitCommand(projectDir, ["add", fileName]);
    await executeGitCommand(projectDir, [
      "commit",
      "-m",
      `Generated: ${shortPrompt}`,
    ]);

    logger.info(`Committed: ${fileName}`);
  } catch (error) {
    logger.warn(`Git operation failed: ${error.message}`);
  }
}

async function executeGitCommand(cwd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn("git", args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    let error = "";

    child.stdout.on("data", data => (output += data.toString()));
    child.stderr.on("data", data => (error += data.toString()));

    child.on("close", code => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(
          new Error(error.trim() || `Git command failed with code ${code}`)
        );
      }
    });

    child.on("error", err => {
      reject(new Error(`Failed to execute git: ${err.message}`));
    });
  });
}
