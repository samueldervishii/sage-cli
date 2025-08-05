import dotenv from "dotenv";
dotenv.config();

import open from "open";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.resolve(__dirname, "../.sophiarc.json");
const config = await fs.readJson(configPath).catch(() => ({}));
const defaultPort = config.defaultPort || 3000;

const userPrompt = process.argv.slice(2).join(" ").trim();

// Generate filename from prompt or use default
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

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

(async () => {
  try {
    console.log("Generating mock server...");
    const prompt = `Generate only raw, runnable Express.js code using ESM import syntax (no require or module.exports). Do not include markdown formatting or code blocks. The code should be ready to run as-is. Instruction: ${userPrompt}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const reply = response.text();
    console.log("AI response received, processing code...");

    if (!reply || reply.length < 40 || !reply.includes("express")) {
      console.error("Invalid or incomplete code response.");
      return;
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

    // Ensure the server stays running and has proper process handling
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

    console.log(`\nMock server generated successfully!`);
    console.log(`File: ${fileName}`);
    console.log(`Location: ${fullPath}`);

    // Detect the main endpoint
    const routeMatch = cleanCode.match(/app\.get\(['"`](\/[^'"` ]*)['"`]/);
    const routePath = routeMatch ? routeMatch[1] : "/";

    console.log(`\nTo run your mock server:`);
    console.log(`   cd ${path.dirname(fullPath)}`);
    console.log(`   node ${fileName}`);
    console.log(`\nThen visit: http://localhost:${defaultPort}${routePath}`);
    console.log(`Press Ctrl+C to stop the server when running`);

    // Only open in editor if configured
    if (config.editor) {
      await open(fullPath, { app: { name: config.editor } });
    }
  } catch (err) {
    console.error("Error occurred:", err.message);
    if (err.message.includes("API_KEY")) {
      console.error(
        "Please make sure your GEMINI_API_KEY is set in your .env file"
      );
    }
  }
})();
