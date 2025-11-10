import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import chatRoutes from "./routes/chat-routes.mjs";
import memoryRoutes from "./routes/memory-routes.mjs";
import historyRoutes from "./routes/history-routes.mjs";
import { errorHandler } from "./middleware/error-handler.mjs";
import { sessionManager } from "./middleware/session-manager.mjs";

/**
 * API Server for Sage CLI
 * Provides REST endpoints for chat, memory, and history management
 */
class SageAPIServer {
  constructor(port = 3000) {
    this.port = port;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // CORS
    this.app.use(
      cors({
        origin: process.env.CORS_ORIGIN || "*",
        credentials: true,
      })
    );

    // Body parsing
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: {
        error: "Too many requests, please try again later.",
      },
    });
    this.app.use("/api/", limiter);

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
    // Health check
    this.app.get("/health", (req, res) => {
      res.json({
        status: "healthy",
        version: process.env.npm_package_version || "1.5.0",
        timestamp: new Date().toISOString(),
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
        version: process.env.npm_package_version || "1.5.0",
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
          },
          history: {
            list: "GET /api/history/list",
            get: "GET /api/history/:id",
            export: "GET /api/history/:id/export",
            clean: "DELETE /api/history/clean",
          },
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

  start() {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          console.log(`\nSage API Server running on port ${this.port}`);
          console.log(`  Health check: http://localhost:${this.port}/health`);
          console.log(`  API docs: http://localhost:${this.port}/\n`);
          resolve(this.server);
        });

        this.server.on("error", error => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  stop() {
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
