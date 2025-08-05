// Load environment variables from .env
import dotenv from "dotenv";
dotenv.config();

// Core Node.js and library imports
import open from "open";
import fs from "fs-extra";
import readline from "readline-sync";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Resolve current file/directory references
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load CLI configuration (e.g., default port, projectDir, editor)
const configPath = path.resolve(__dirname, "../.sophiarc.json");
const config = await fs.readJson(configPath).catch(() => ({}));
const defaultPort = config.defaultPort || 3000;
const openBrowser =
  config.openBrowser === "true" || config.openBrowser === true;

// Prompt user to name the generated file
const baseFilename = readline
  .question("Name your file: ")
  .trim()
  .replace(/\s+/g, "-")
  .replace(/[^a-zA-Z0-9-_]/g, "");

if (!baseFilename) {
  console.error("Filename cannot be empty.");
  process.exit(1);
}

// Collect prompt from CLI args
const userPrompt = process.argv.slice(2).join(" ").trim();

if (!userPrompt) {
  console.error("Prompt is missing.");
  process.exit(1);
}

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

// Main async block
(async () => {
  try {
    console.log("Sophia is generating your mock server...");
    
    // Request code generation from Gemini
    const prompt = `Generate only raw, runnable Express.js code using ESM import syntax (no require or module.exports). Do not include markdown formatting or code blocks. The code should be ready to run as-is. Instruction: ${userPrompt}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const reply = response.text();

    // Basic response validation
    if (!reply || reply.length < 40 || !reply.includes("express")) {
      console.error("Invalid or incomplete code response.");
      return;
    }

    // Clean up markdown/code block syntax if any slipped through
    let cleanCode = reply
      .replace(/```[a-z]*\n?/gi, "")
      .replace(/```$/g, "")
      .trim();

    // Ensure proper ESM syntax and default port usage
    cleanCode = cleanCode
      .replace(
        `const express = require('express');`,
        `import express from 'express';`
      )
      .replace(`module.exports =`, `export default`)
      .replace(`import { open } from 'open';`, `import open from 'open';`)
      .replace(/const port = \d+/, `const port = ${defaultPort}`);

    // Add default startup log if missing
    if (!cleanCode.includes("console.log")) {
      cleanCode += `\n\nprocess.on('beforeExit', () => {\n  console.log("Mock server is running. No startup log was included.");\n});`;
    }

    // Define file structure and paths
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `${baseFilename}-${timestamp}.js`;
    const fileDir = path.resolve(
      __dirname,
      "../",
      config.projectDir || "generated"
    );
    const fullPath = path.join(fileDir, fileName);

    // Save file to disk
    await fs.ensureDir(fileDir);
    await fs.writeFile(fullPath, cleanCode);

    console.log(`\nMock server saved to: ${fullPath}`);

    // Open file in preferred editor
    await open(fullPath, { app: { name: config.editor || "code" } });

    // Start server using runner.mjs
    const runnerPath = path.resolve(__dirname, "runner.mjs");
    console.log("Launching mock using runner.mjs...");

    const runner = spawn("node", [runnerPath, fileName], { stdio: "inherit" });

    // When runner starts, try pinging the first found endpoint
    runner.on("spawn", async () => {
      const routeMatch = cleanCode.match(/app\.get\(['"`](\/[^'"` ]*)['"`]/);
      const routePath = routeMatch ? routeMatch[1] : "";
      const fullUrl = `http://localhost:${defaultPort}${routePath}`;

      console.log(`\nWaiting for server to boot...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log(`Testing endpoint: ${fullUrl}`);
      try {
        const axios = (await import('axios')).default;
        const response = await axios.get(fullUrl);
        console.log(`Endpoint responded with status ${response.status}`);

        if (openBrowser) {
          console.log(`Opening ${fullUrl} in browser...`);
          await open(fullUrl);
        }
      } catch (err) {
        console.warn(`Failed to reach ${fullUrl}:`, err.message);
      }
    });

    // Log process exit
    runner.on("exit", (code) => {
      console.log(`\nRunner process exited with code ${code}`);
    });
  } catch (err) {
    console.error("Error occurred:", err.message);
    if (err.message.includes("API_KEY")) {
      console.error("Please make sure your GEMINI_API_KEY is set in your .env file");
    }
  }
})();