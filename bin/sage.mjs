#!/usr/bin/env node

import dotenv from "dotenv";
import os from "os";
import path from "path";
import { parseAndExecuteCommand } from "../lib/command-parser.mjs";

dotenv.config();
dotenv.config({
  path: path.join(os.homedir(), ".local", "bin", "sage-cli", ".env"),
});

const args = process.argv.slice(2);
parseAndExecuteCommand(args).catch(console.error);
