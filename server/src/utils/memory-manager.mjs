import fs from "fs-extra";
import path from "path";
import os from "os";
class MemoryManager {
  constructor() {
    this.memoryDir = path.join(os.homedir(), ".sage-cli", "memory");
    this.memoryFile = path.join(this.memoryDir, "memories.json");
    this.memories = [];
  }

  /**
   * Initialize memory storage
   */
  async init() {
    try {
      await fs.ensureDir(this.memoryDir);
      await fs.chmod(this.memoryDir, 0o700);

      // Load existing memories
      if (await fs.pathExists(this.memoryFile)) {
        this.memories = await fs.readJson(this.memoryFile);
      }
    } catch (error) {
      if (process.env.DEBUG) {
        console.error(`Debug: Memory init failed - ${error.message}`);
      }
    }
  }

  /**
   * Save memories to disk
   */
  async saveMemories() {
    try {
      await fs.writeJson(this.memoryFile, this.memories, {
        spaces: 2,
        mode: 0o600,
      });
    } catch (error) {
      if (process.env.DEBUG) {
        console.error(`Debug: Failed to save memories - ${error.message}`);
      }
    }
  }

  /**
   * Store a new memory
   * @param {string} content - The memory content
   * @param {string} category - Category (preference, fact, context, etc.)
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async remember(content, category = "general") {
    try {
      const memory = {
        id: Date.now().toString(),
        content,
        category,
        timestamp: new Date().toISOString(),
        accessCount: 0,
        lastAccessed: null,
      };

      this.memories.push(memory);
      await this.saveMemories();

      return {
        success: true,
        message: `I'll remember that: "${content}"`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to store memory: ${error.message}`,
      };
    }
  }

  /**
   * Search memories by query
   * @param {string} query - Search query
   * @returns {Promise<Array>} Matching memories
   */
  async searchMemories(query) {
    const lowerQuery = query.toLowerCase();

    // Split query into individual words for better matching
    const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 2); // Ignore very short words

    const matches = this.memories.filter(memory => {
      const lowerContent = memory.content.toLowerCase();
      const lowerCategory = memory.category.toLowerCase();
      const searchText = `${lowerContent} ${lowerCategory}`;

      // Match if entire query is found (exact phrase)
      if (searchText.includes(lowerQuery)) {
        return true;
      }

      // Match if any word from query is found (with fuzzy matching)
      return queryWords.some(word => {
        // Direct match
        if (searchText.includes(word)) return true;

        // Fuzzy match: check if word stem matches (handle plural/singular)
        const stem = word.replace(/s$/, ""); // Remove trailing 's'
        if (stem.length > 2 && searchText.includes(stem)) return true;

        // Check if memory contains a word that starts with query word
        const words = searchText.split(/\s+/);
        return words.some(
          memWord => memWord.startsWith(word) || word.startsWith(memWord)
        );
      });
    });

    // Update access count and timestamp
    matches.forEach(memory => {
      memory.accessCount++;
      memory.lastAccessed = new Date().toISOString();
    });

    // Save updated access stats - await to prevent race condition
    await this.saveMemories();

    // Sort by relevance (exact matches first, then by access count)
    return matches.sort((a, b) => {
      const aExact = a.content.toLowerCase() === lowerQuery;
      const bExact = b.content.toLowerCase() === lowerQuery;

      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      return b.accessCount - a.accessCount;
    });
  }

  /**
   * Get all memories for context
   * @param {number} limit - Maximum number of memories to return
   * @returns {Array} Recent and frequently accessed memories
   */
  getContextMemories(limit = 10) {
    // Get most relevant memories: mix of recent and frequently accessed
    const sorted = [...this.memories].sort((a, b) => {
      const aScore =
        new Date(a.timestamp).getTime() / 1000 + a.accessCount * 10000;
      const bScore =
        new Date(b.timestamp).getTime() / 1000 + b.accessCount * 10000;
      return bScore - aScore;
    });

    return sorted.slice(0, limit);
  }

  /**
   * Get memories by category
   * @param {string} category - Category to filter by
   * @returns {Array} Memories in category
   */
  getMemoriesByCategory(category) {
    return this.memories.filter(
      memory => memory.category.toLowerCase() === category.toLowerCase()
    );
  }

  /**
   * Delete a memory by ID
   * @param {string} id - Memory ID
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async forgetMemory(id) {
    try {
      const index = this.memories.findIndex(m => m.id === id);

      if (index === -1) {
        return {
          success: false,
          message: "Memory not found",
        };
      }

      const deleted = this.memories.splice(index, 1)[0];
      await this.saveMemories();

      return {
        success: true,
        message: `Forgot: "${deleted.content}"`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to delete memory: ${error.message}`,
      };
    }
  }

  /**
   * Clear all memories
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async clearAllMemories() {
    try {
      const count = this.memories.length;
      this.memories = [];
      await this.saveMemories();

      return {
        success: true,
        message: `Cleared ${count} memories`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to clear memories: ${error.message}`,
      };
    }
  }

  /**
   * Get memory statistics
   * @returns {Object} Memory stats
   */
  getStats() {
    const categories = {};

    this.memories.forEach(memory => {
      categories[memory.category] = (categories[memory.category] || 0) + 1;
    });

    return {
      totalMemories: this.memories.length,
      categories,
      oldestMemory: this.memories[0]
        ? new Date(this.memories[0].timestamp).toLocaleDateString()
        : null,
      mostAccessed: [...this.memories].sort(
        (a, b) => b.accessCount - a.accessCount
      )[0],
    };
  }

  /**
   * Export memories to markdown
   * @returns {string} Markdown formatted memories
   */
  exportToMarkdown() {
    let markdown = "# Sage Memory Export\n\n";
    markdown += `**Total Memories:** ${this.memories.length}\n`;
    markdown += `**Exported:** ${new Date().toLocaleString()}\n\n`;
    markdown += "---\n\n";

    // Group by category
    const byCategory = {};
    this.memories.forEach(memory => {
      if (!byCategory[memory.category]) {
        byCategory[memory.category] = [];
      }
      byCategory[memory.category].push(memory);
    });

    Object.entries(byCategory).forEach(([category, memories]) => {
      markdown += `## ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;

      memories.forEach(memory => {
        const date = new Date(memory.timestamp).toLocaleDateString();
        markdown += `- **${memory.content}**\n`;
        markdown += `  - *Stored: ${date}*\n`;
        markdown += `  - *Accessed: ${memory.accessCount} times*\n\n`;
      });
    });

    markdown += "\n*Generated by Sage CLI*\n";

    return markdown;
  }

  /**
   * Format memories for AI context
   * @param {Array} memories - Memories to format
   * @returns {string} Formatted text for AI
   */
  formatForContext(memories) {
    if (!memories || memories.length === 0) {
      return "";
    }

    let context = "=== USER MEMORIES ===\n";
    context +=
      "The following are things the user has asked you to remember:\n\n";

    memories.forEach((memory, index) => {
      context += `${index + 1}. ${memory.content}`;
      if (memory.category !== "general") {
        context += ` (${memory.category})`;
      }
      context += "\n";
    });

    context += "\n";
    context +=
      "Use these memories to provide personalized responses when relevant.\n";
    context += "===\n";

    return context;
  }
}

export default MemoryManager;
