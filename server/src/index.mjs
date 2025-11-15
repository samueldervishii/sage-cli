import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import SageAPIServer from "./api/server.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
const serverRoot = path.resolve(__dirname, "..");
const envPath = path.join(serverRoot, ".env");
dotenv.config({ path: envPath, debug: false });

// Validate required environment variables
const requiredEnvVars = ["MONGODB_URI"];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error("[ERROR] Missing required environment variables:");
  missingVars.forEach(varName => console.error(`  - ${varName}`));
  console.error("\nPlease check your .env file in the server directory.");
  process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
const portArg = args.find(arg => arg.startsWith("--port="));
const port = portArg
  ? parseInt(portArg.split("=")[1])
  : process.env.PORT || 3000;

// Start API server
const server = new SageAPIServer(port);

server
  .start()
  .then(() => {
    console.log("Server started successfully");
    console.log(`\nPress Ctrl+C to stop the server\n`);
  })
  .catch(error => {
    console.error("[ERROR] Failed to start server:", error.message);
    process.exit(1);
  });

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("\n\nShutting down gracefully...");
  await server.stop();
  console.log("Server stopped");
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("\n\nShutting down gracefully...");
  await server.stop();
  console.log("Server stopped");
  process.exit(0);
});
