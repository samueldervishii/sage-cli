import express from "express";
import cors from "cors";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import chatRoutes from "./routes/chat-routes.mjs";
import memoryRoutes from "./routes/memory-routes.mjs";
import historyRoutes from "./routes/history-routes.mjs";
import { errorHandler } from "./middleware/error-handler.mjs";
import { sessionManager } from "./middleware/session-manager.mjs";
import getRateLimiter from "./middleware/rate-limiter.mjs";
import mongoDBService from "../services/mongodb-service.mjs";

// Get version from root version.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const versionJson = JSON.parse(
  readFileSync(join(__dirname, "../../../version.json"), "utf8")
);
const VERSION = versionJson.version;

/**
 * API Server for Sage CLI
 * Provides REST endpoints for chat, memory, and history management
 */
class SageAPIServer {
  constructor(port = 3000) {
    this.port = port;
    this.app = express();
    this.dbConnected = false;
  }

  async initialize() {
    // Connect to MongoDB
    try {
      console.log("Connecting to MongoDB...");
      await mongoDBService.connect();
      this.dbConnected = true;
      console.log("MongoDB connected successfully");
    } catch (error) {
      console.error("Failed to connect to MongoDB:", error.message);
      console.error("Server will start but database operations will fail.");
      this.dbConnected = false;
    }

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // CORS - allow multiple origins for production deployment
    const allowedOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",")
      : ["http://localhost:5173", "http://localhost:3000"];

    this.app.use(
      cors({
        origin: (origin, callback) => {
          // Allow requests with no origin (like mobile apps or curl)
          if (!origin) return callback(null, true);

          if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
          } else {
            callback(new Error("Not allowed by CORS"));
          }
        },
        credentials: true,
      })
    );

    // Body parsing
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // Rate limiting - 50 req/min in production, 1000 in development
    const rateLimiter = getRateLimiter();
    this.app.use("/api/", rateLimiter);

    // Session management
    this.app.use(sessionManager);

    // Request logging
    if (process.env.DEBUG) {
      this.app.use((req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
        next();
      });
    }
  }

  setupRoutes() {
    // Health check with MongoDB status
    this.app.get("/health", async (req, res) => {
      const dbHealth = await mongoDBService.healthCheck();

      res.json({
        status:
          this.dbConnected && dbHealth.status === "healthy"
            ? "healthy"
            : "degraded",
        version: VERSION,
        timestamp: new Date().toISOString(),
        database: {
          connected: this.dbConnected,
          status: dbHealth.status,
        },
        environment: process.env.NODE_ENV || "development",
      });
    });

    // API routes
    this.app.use("/api/chat", chatRoutes);
    this.app.use("/api/memory", memoryRoutes);
    this.app.use("/api/history", historyRoutes);

    // API documentation
    this.app.get("/", (req, res) => {
      res.json({
        name: "Sage API",
        version: VERSION,
        description: "REST API for Sage AI Assistant",
        endpoints: {
          health: "GET /health",
          chat: {
            send: "POST /api/chat/send",
            initialize: "POST /api/chat/initialize",
          },
          memory: {
            list: "GET /api/memory/list",
            search: "GET /api/memory/search?query=...",
            add: "POST /api/memory/add",
            clear: "DELETE /api/memory/clear",
            stats: "GET /api/memory/stats",
            get: "GET /api/memory/:id",
            update: "PUT /api/memory/:id",
            delete: "DELETE /api/memory/:id",
            byCategory: "GET /api/memory/category/:category",
            recent: "GET /api/memory/recent/:limit",
          },
          history: {
            list: "GET /api/history/list",
            get: "GET /api/history/:id",
            export: "GET /api/history/:id/export",
            clean: "DELETE /api/history/clean?days=30",
            delete: "DELETE /api/history/:id",
            restore: "POST /api/history/:id/restore",
            search: "GET /api/history/search/query?q=...",
          },
        },
        rateLimit: {
          production: "50 requests per minute",
          development: "1000 requests per minute",
        },
        documentation: "https://github.com/samueldervishii/sage-cli#api",
      });
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: "Not Found",
        message: `Cannot ${req.method} ${req.path}`,
      });
    });
  }

  setupErrorHandling() {
    this.app.use(errorHandler);
  }

  async start() {
    // Initialize (connect to DB and setup middleware)
    await this.initialize();

    // Start server
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`\nSage API Server running on port ${this.port}`);
        console.log(`  Environment: ${process.env.NODE_ENV || "development"}`);
        console.log(`  Health check: http://localhost:${this.port}/health`);
        console.log(`  API docs: http://localhost:${this.port}/`);
        console.log(
          `  Database: ${this.dbConnected ? "Connected" : "Disconnected"}`
        );
        console.log(
          `  Rate limit: ${process.env.NODE_ENV === "production" ? "50 req/min" : "Disabled (development)"}\n`
        );
        resolve(this.server);
      });

      this.server.on("error", error => {
        reject(error);
      });
    });
  }

  async stop() {
    console.log("Stopping server...");

    // Close MongoDB connection
    if (this.dbConnected) {
      await mongoDBService.disconnect();
    }

    // Close HTTP server
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close(error => {
          if (error) reject(error);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

export default SageAPIServer;
