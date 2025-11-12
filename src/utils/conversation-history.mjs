import fs from "fs-extra";
import path from "path";
import os from "os";
import chalk from "chalk";

class ConversationHistory {
  constructor() {
    this.historyDir = path.join(os.homedir(), ".sage-cli", "conversations");
    this.maxConversations = 50;
    this.maxAgeDays = 30;
    this.currentConversation = null;
    this.currentConversationId = null;
  }

  /**
   * Validate conversation ID to prevent path traversal attacks
   * @param {string} id - The conversation ID to validate
   * @returns {boolean} - True if valid, false otherwise
   */
  validateConversationId(id) {
    if (!id || typeof id !== "string") {
      return false;
    }

    // Prevent path traversal by disallowing path separators and special characters
    // Only allow alphanumeric characters, hyphens, and underscores
    const validPattern = /^[a-zA-Z0-9_-]+$/;
    return validPattern.test(id);
  }

  /**
   * Sanitize and validate file path to prevent path traversal
   * @param {string} id - The conversation ID
   * @returns {string} - The safe, validated file path
   * @throws {Error} - If ID is invalid or path is unsafe
   */
  getSafeFilePath(id) {
    // First, validate the ID format
    if (!this.validateConversationId(id)) {
      throw new Error(
        "Invalid conversation ID. Only alphanumeric characters, hyphens, and underscores are allowed."
      );
    }

    // Construct the file path
    const fileName = `${id}.json`;
    const filePath = path.resolve(this.historyDir, fileName);

    // Verify the resolved path is within the history directory
    // This prevents path traversal attacks even if validation is bypassed
    const normalizedHistoryDir = path.resolve(this.historyDir) + path.sep;
    const normalizedFilePath = path.resolve(filePath) + path.sep;

    if (!normalizedFilePath.startsWith(normalizedHistoryDir)) {
      throw new Error(
        "Invalid conversation ID: path traversal detected."
      );
    }

    // Return the path without the trailing separator
    return filePath;
  }

  /**
   * Initialize history directory
   */
  async init() {
    try {
      await fs.ensureDir(this.historyDir);
      await fs.chmod(this.historyDir, 0o700);

      // Perform cleanup on init
      await this.autoCleanup();
    } catch (error) {
      if (process.env.DEBUG) {
        console.error(
          chalk.gray(`Debug: History init failed - ${error.message}`)
        );
      }
    }
  }

  /**
   * Start a new conversation session
   */
  async startNewConversation() {
    const timestamp = new Date().toISOString();
    const id = this.generateConversationId();

    this.currentConversationId = id;
    this.currentConversation = {
      id,
      startedAt: timestamp,
      lastMessageAt: timestamp,
      messages: [],
      metadata: {
        workingDirectory: process.cwd(),
        nodeVersion: process.version,
      },
    };

    return id;
  }

  /**
   * Add a message to current conversation
   * @param {string} role - 'user' or 'model'
   * @param {string} content - Message content
   * @param {object} metadata - Additional metadata (searchUsed, functionCalls, etc.)
   */
  async addMessage(role, content, metadata = {}) {
    if (!this.currentConversation) {
      await this.startNewConversation();
    }

    const message = {
      role,
      content,
      timestamp: new Date().toISOString(),
      ...metadata,
    };

    this.currentConversation.messages.push(message);
    this.currentConversation.lastMessageAt = message.timestamp;

    // Auto-save after each message
    await this.saveCurrentConversation();
  }

  /**
   * Save current conversation to disk
   */
  async saveCurrentConversation() {
    if (!this.currentConversation || !this.currentConversationId) {
      return;
    }

    try {
      const filePath = path.join(
        this.historyDir,
        `${this.currentConversationId}.json`
      );

      await fs.writeJSON(filePath, this.currentConversation, {
        spaces: 2,
        mode: 0o600, // Only user can read/write
      });
    } catch (error) {
      if (process.env.DEBUG) {
        console.error(
          chalk.gray(`Debug: Failed to save conversation - ${error.message}`)
        );
      }
    }
  }

  /**
   * Generate unique conversation ID
   */
  generateConversationId() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day}-${hours}${minutes}${seconds}`;
  }

  /**
   * List all conversations
   * @param {number} limit - Maximum number to return
   */
  async listConversations(limit = 20) {
    try {
      const files = await fs.readdir(this.historyDir);
      const jsonFiles = files.filter(f => f.endsWith(".json"));

      const conversations = [];

      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.historyDir, file);
          const data = await fs.readJSON(filePath);

          conversations.push({
            id: data.id,
            startedAt: data.startedAt,
            lastMessageAt: data.lastMessageAt,
            messageCount: data.messages.length,
            firstUserMessage:
              data.messages
                .find(m => m.role === "user")
                ?.content.substring(0, 60) || "No messages",
          });
        } catch (_error) {
          // Skip invalid files
        }
      }

      // Sort by last message time (newest first)
      conversations.sort(
        (a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
      );

      return conversations.slice(0, limit);
    } catch (error) {
      if (process.env.DEBUG) {
        console.error(
          chalk.gray(`Debug: Failed to list conversations - ${error.message}`)
        );
      }
      return [];
    }
  }

  /**
   * Load a specific conversation
   */
  async loadConversation(id) {
    try {
      // Get safe file path with validation and path traversal protection
      const filePath = this.getSafeFilePath(id);
      return await fs.readJSON(filePath);
    } catch (error) {
      if (error.message.includes("Invalid conversation ID")) {
        throw error;
      }
      throw new Error(`Conversation not found: ${id}`);
    }
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(id) {
    try {
      // Get safe file path with validation and path traversal protection
      const filePath = this.getSafeFilePath(id);
      await fs.remove(filePath);
      return true;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Export conversation to markdown
   */
  async exportToMarkdown(id) {
    // loadConversation will handle validation and path traversal protection
    const conversation = await this.loadConversation(id);

    let markdown = `# Conversation - ${conversation.id}\n\n`;
    markdown += `**Started:** ${new Date(conversation.startedAt).toLocaleString()}\n`;
    markdown += `**Last Message:** ${new Date(conversation.lastMessageAt).toLocaleString()}\n`;
    markdown += `**Messages:** ${conversation.messages.length}\n\n`;
    markdown += `---\n\n`;

    for (const message of conversation.messages) {
      const time = new Date(message.timestamp).toLocaleTimeString();

      if (message.role === "user") {
        markdown += `## User (${time})\n\n`;
        markdown += `${message.content}\n\n`;
      } else if (message.role === "model") {
        markdown += `## Sage (${time})\n\n`;
        markdown += `${message.content}\n\n`;

        if (message.searchUsed) {
          markdown += `*Web search was used for this response*\n\n`;
        }
        if (message.functionCalls) {
          markdown += `*Functions called: ${message.functionCalls.join(", ")}*\n\n`;
        }
      }

      markdown += `---\n\n`;
    }

    markdown += `\n*Generated by Sage CLI*\n`;

    return markdown;
  }

  /**
   * Get storage usage info
   */
  async getStorageInfo() {
    try {
      const files = await fs.readdir(this.historyDir);
      const jsonFiles = files.filter(f => f.endsWith(".json"));

      let totalSize = 0;
      for (const file of jsonFiles) {
        const filePath = path.join(this.historyDir, file);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
      }

      return {
        conversationCount: jsonFiles.length,
        totalSizeBytes: totalSize,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
        directory: this.historyDir,
      };
    } catch (_error) {
      return {
        conversationCount: 0,
        totalSizeBytes: 0,
        totalSizeMB: "0.00",
        directory: this.historyDir,
      };
    }
  }

  /**
   * Auto-cleanup old conversations
   */
  async autoCleanup() {
    try {
      const files = await fs.readdir(this.historyDir);
      const jsonFiles = files.filter(f => f.endsWith(".json"));

      const now = Date.now();
      const maxAgeMs = this.maxAgeDays * 24 * 60 * 60 * 1000;

      const conversations = [];

      // Load all conversations with their timestamps
      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.historyDir, file);
          const stats = await fs.stat(filePath);
          const data = await fs.readJSON(filePath);

          conversations.push({
            id: data.id,
            filePath,
            lastMessageAt: new Date(data.lastMessageAt).getTime(),
            modifiedAt: stats.mtime.getTime(),
          });
        } catch (_error) {
          // Skip invalid files
        }
      }

      // Sort by last message time (oldest first)
      conversations.sort((a, b) => a.lastMessageAt - b.lastMessageAt);

      let deletedCount = 0;

      // Delete conversations older than maxAgeDays
      for (const conv of conversations) {
        const age = now - conv.lastMessageAt;
        if (age > maxAgeMs) {
          await fs.remove(conv.filePath);
          deletedCount++;
        }
      }

      // If still over limit, delete oldest ones
      const remaining = conversations.length - deletedCount;
      if (remaining > this.maxConversations) {
        const toDelete = remaining - this.maxConversations;
        const sortedRemaining = conversations
          .filter(c => now - c.lastMessageAt <= maxAgeMs)
          .slice(0, toDelete);

        for (const conv of sortedRemaining) {
          await fs.remove(conv.filePath);
          deletedCount++;
        }
      }

      if (deletedCount > 0 && process.env.DEBUG) {
        console.log(
          chalk.gray(`Debug: Cleaned up ${deletedCount} old conversations`)
        );
      }
    } catch (error) {
      if (process.env.DEBUG) {
        console.error(
          chalk.gray(`Debug: Auto-cleanup failed - ${error.message}`)
        );
      }
    }
  }

  /**
   * Clean all conversations
   */
  async cleanAll() {
    try {
      const files = await fs.readdir(this.historyDir);
      const jsonFiles = files.filter(f => f.endsWith(".json"));

      for (const file of jsonFiles) {
        const filePath = path.join(this.historyDir, file);
        await fs.remove(filePath);
      }

      return jsonFiles.length;
    } catch (error) {
      throw new Error(`Failed to clean history: ${error.message}`);
    }
  }
}

export default ConversationHistory;
