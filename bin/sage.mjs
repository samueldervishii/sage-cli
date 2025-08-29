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
parseAndExecuteCommand(args).catch(console.error);
