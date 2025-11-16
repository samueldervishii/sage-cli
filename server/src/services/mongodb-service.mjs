import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

class MongoDBService {
  constructor() {
    this.client = null;
    this.db = null;
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected) {
      return this.db;
    }

    try {
      const uri = process.env.MONGODB_URI;
      const dbName = process.env.MONGODB_DATABASE || "sage-cli";

      if (!uri) {
        throw new Error("MONGODB_URI is not defined in environment variables");
      }

      this.client = new MongoClient(uri, {
        // Connection timeouts
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,

        // Connection pool configuration (performance optimization)
        maxPoolSize: 50, // Maximum number of connections in the pool
        minPoolSize: 5, // Minimum number of connections to maintain
        maxIdleTimeMS: 60000, // Close connections idle for 60 seconds
        waitQueueTimeoutMS: 10000, // Max time to wait for connection from pool

        // Reliability settings
        retryWrites: true, // Automatically retry write operations
        retryReads: true, // Automatically retry read operations

        // Compression (reduce network bandwidth)
        compressors: ["snappy", "zlib"],
      });

      await this.client.connect();
      this.db = this.client.db(dbName);
      this.isConnected = true;

      console.log(`Connected to MongoDB database: ${dbName}`);

      // Create indexes for better performance
      await this.createIndexes();

      return this.db;
    } catch (error) {
      console.error("MongoDB connection error:", error);
      throw error;
    }
  }

  async createIndexes() {
    try {
      // Conversations indexes
      await this.db
        .collection("conversations")
        .createIndex({ id: 1 }, { unique: true });
      await this.db.collection("conversations").createIndex({ startedAt: -1 });
      await this.db.collection("conversations").createIndex({ deleted: 1 });
      await this.db
        .collection("conversations")
        .createIndex({ lastMessageAt: -1 });

      // Memories indexes
      await this.db
        .collection("memories")
        .createIndex({ id: 1 }, { unique: true });
      await this.db.collection("memories").createIndex({ timestamp: -1 });
      await this.db.collection("memories").createIndex({ category: 1 });

      console.log("MongoDB indexes created successfully");
    } catch (error) {
      // Ignore duplicate key errors (indexes already exist)
      if (error.code !== 11000) {
        console.error("Error creating indexes:", error);
      }
    }
  }

  getDatabase() {
    if (!this.isConnected) {
      throw new Error("Database not connected. Call connect() first.");
    }
    return this.db;
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.isConnected = false;
      console.log("Disconnected from MongoDB");
    }
  }

  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { status: "disconnected" };
      }
      await this.db.admin().ping();
      return { status: "healthy" };
    } catch (error) {
      return { status: "unhealthy", error: error.message };
    }
  }
}

// Singleton instance
const mongoDBService = new MongoDBService();

export default mongoDBService;
