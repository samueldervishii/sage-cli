#!/usr/bin/env node

const originalLog = console.log;
console.log = () => {};

import dotenv from "dotenv";
import os from "os";
import path from "path";

dotenv.config({ debug: false });
dotenv.config({
  path: path.join(os.homedir(), ".local", "bin", "sage-cli", ".env"),
  debug: false,
});

console.log = originalLog;

import { parseAndExecuteCommand } from "../src/core/command-parser.mjs";

const args = process.argv.slice(2);

parseAndExecuteCommand(args).catch(error => {
  console.error("Error:", error.message);

  // Exit with appropriate error code
  if (error.code === "ENOENT") {
    process.exit(127); // Command not found
  } else if (error.code === "EACCES") {
    process.exit(126); // Permission denied
  } else if (
    error.message.includes("API_KEY") ||
    error.message.includes("configuration")
  ) {
    process.exit(78); // Configuration error
  } else {
    process.exit(1); // General error
  }
});
