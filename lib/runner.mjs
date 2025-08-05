// Import necessary modules
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs-extra";
import { spawn } from "child_process";

// Resolve __dirname and __filename in ES module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the mock file name from CLI arguments
const args = process.argv.slice(2);
const fileName = args[0];

if (!fileName) {
  console.error("Please provide the mock filename to run (e.g. test-xxx.js)");
  process.exit(1);
}

// Construct full path to the mock server file inside the 'generated' directory
const filePath = path.join(__dirname, "../generated", fileName);

// Validate the file exists
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

// Log what file is being run
console.log(`Running mock file: ${filePath}\n`);

// Spawn a child Node.js process to execute the mock server file
const child = spawn("node", [filePath], { stdio: "inherit" });

// Handle errors while starting the child process
child.on("error", (err) => {
  console.error(`Failed to start process: ${err.message}`);
});

// Log exit code after the mock process finishes
child.on("exit", (code) => {
  console.log(`\nMock process exited with code ${code}`);
});