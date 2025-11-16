import { v4 as uuidv4 } from "uuid";
import mongoDBService from "./mongodb-service.mjs";

class MemoryStorage {
  constructor() {
    this.collection = null;
  }

  async initialize() {
    const db = await mongoDBService.connect();
    this.collection = db.collection("memories");
  }

  async ensureInitialized() {
    if (!this.collection) {
      await this.initialize();
    }
  }

  /**
   * Add a new memory
   */
  async addMemory(content, category = "general") {
    await this.ensureInitialized();

    const memory = {
      id: uuidv4(),
      content,
      category,
      timestamp: new Date().toISOString(),
      accessCount: 0,
      lastAccessed: null,
    };

    await this.collection.insertOne(memory);
    return memory;
  }

  /**
   * Get a memory by ID
   */
  async getMemory(memoryId) {
    await this.ensureInitialized();

    // Validate memoryId is a string
    if (typeof memoryId !== "string") {
      throw new Error("memoryId must be a string");
    }

    // Use findOneAndUpdate to combine read + update in single operation
    // This eliminates the N+1 query problem (2 DB calls -> 1 DB call)
    const result = await this.collection.findOneAndUpdate(
      { id: { $eq: memoryId } },
      {
        $inc: { accessCount: 1 },
        $set: { lastAccessed: new Date().toISOString() },
      },
      {
        returnDocument: "after", // Return the updated document
        projection: { _id: 0 },
      }
    );

    return result?.value || null;
  }

  /**
   * List all memories
   */
  async listMemories(options = {}) {
    await this.ensureInitialized();

    const {
      limit = 100,
      skip = 0,
      category = null,
      sortBy = "timestamp",
      sortOrder = -1,
    } = options;

    // Validate and sanitize inputs
    const sanitizedLimit = Math.min(Math.max(parseInt(limit) || 100, 1), 100);
    const sanitizedSkip = Math.max(parseInt(skip) || 0, 0);

    // Whitelist allowed sort fields
    const allowedSortFields = [
      "timestamp",
      "accessCount",
      "category",
      "content",
    ];
    const sanitizedSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : "timestamp";
    const sanitizedSortOrder = sortOrder === 1 ? 1 : -1;

    // Validate category if provided
    const query = category ? { category: { $eq: category } } : {};
    const sort = { [sanitizedSortBy]: sanitizedSortOrder };

    const memories = await this.collection
      .find(query, { projection: { _id: 0 } })
      .sort(sort)
      .skip(sanitizedSkip)
      .limit(sanitizedLimit)
      .toArray();

    return memories;
  }

  /**
   * Search memories by content
   */
  async searchMemories(query) {
    await this.ensureInitialized();

    // Validate query is a string and escape special regex characters
    if (typeof query !== "string") {
      throw new Error("query must be a string");
    }
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const memories = await this.collection
      .find(
        {
          $or: [
            { content: { $regex: escapedQuery, $options: "i" } },
            { category: { $regex: escapedQuery, $options: "i" } },
          ],
        },
        { projection: { _id: 0 } }
      )
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();

    return memories;
  }

  /**
   * Update a memory
   */
  async updateMemory(memoryId, updates) {
    await this.ensureInitialized();

    // Validate memoryId is a string
    if (typeof memoryId !== "string") {
      throw new Error("memoryId must be a string");
    }

    const allowedUpdates = ["content", "category"];
    const filteredUpdates = {};

    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return null;
    }

    const result = await this.collection.findOneAndUpdate(
      { id: { $eq: memoryId } },
      { $set: filteredUpdates },
      { returnDocument: "after", projection: { _id: 0 } }
    );

    return result.value;
  }

  /**
   * Delete a memory
   */
  async deleteMemory(memoryId) {
    await this.ensureInitialized();

    // Validate memoryId is a string
    if (typeof memoryId !== "string") {
      throw new Error("memoryId must be a string");
    }

    const result = await this.collection.deleteOne({ id: { $eq: memoryId } });
    return result.deletedCount > 0;
  }

  /**
   * Clear all memories
   */
  async clearAllMemories() {
    await this.ensureInitialized();

    const result = await this.collection.deleteMany({});
    return result.deletedCount;
  }

  /**
   * Get memory statistics
   */
  async getStatistics() {
    await this.ensureInitialized();

    const stats = await this.collection
      .aggregate([
        {
          $facet: {
            total: [{ $count: "count" }],
            byCategory: [
              {
                $group: {
                  _id: "$category",
                  count: { $sum: 1 },
                },
              },
            ],
            mostAccessed: [
              { $sort: { accessCount: -1 } },
              { $limit: 1 },
              { $project: { _id: 0, content: 1, accessCount: 1 } },
            ],
            totalAccesses: [
              {
                $group: {
                  _id: null,
                  total: { $sum: "$accessCount" },
                },
              },
            ],
          },
        },
      ])
      .toArray();

    const result = stats[0];

    const categories = {};
    result.byCategory.forEach(cat => {
      categories[cat._id || "uncategorized"] = cat.count;
    });

    return {
      totalMemories: result.total[0]?.count || 0,
      categories,
      mostAccessed: result.mostAccessed[0] || null,
      totalAccesses: result.totalAccesses[0]?.total || 0,
    };
  }

  /**
   * Get memories by category
   */
  async getMemoriesByCategory(category) {
    await this.ensureInitialized();

    // Validate category is a string
    if (typeof category !== "string") {
      throw new Error("category must be a string");
    }

    const memories = await this.collection
      .find({ category: { $eq: category } }, { projection: { _id: 0 } })
      .sort({ timestamp: -1 })
      .toArray();

    return memories;
  }

  /**
   * Get most accessed memories
   */
  async getMostAccessedMemories(limit = 10) {
    await this.ensureInitialized();

    // Validate and sanitize limit
    const sanitizedLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 100);

    const memories = await this.collection
      .find({}, { projection: { _id: 0 } })
      .sort({ accessCount: -1 })
      .limit(sanitizedLimit)
      .toArray();

    return memories;
  }

  /**
   * Get recent memories
   */
  async getRecentMemories(limit = 10) {
    await this.ensureInitialized();

    // Validate and sanitize limit
    const sanitizedLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 100);

    const memories = await this.collection
      .find({}, { projection: { _id: 0 } })
      .sort({ timestamp: -1 })
      .limit(sanitizedLimit)
      .toArray();

    return memories;
  }

  /**
   * Get context memories for AI prompts
   * Returns recent and most accessed memories combined
   */
  async getContextMemories(limit = 10) {
    await this.ensureInitialized();

    // Validate and sanitize limit
    const sanitizedLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 50);

    // Get a mix of recent and most accessed memories
    const recentLimit = Math.ceil(sanitizedLimit * 0.6); // 60% recent
    const accessedLimit = Math.floor(sanitizedLimit * 0.4); // 40% most accessed

    const [recent, accessed] = await Promise.all([
      this.getRecentMemories(recentLimit),
      this.getMostAccessedMemories(accessedLimit),
    ]);

    // Combine and deduplicate by id
    const combined = [...recent];
    const existingIds = new Set(recent.map(m => m.id));

    for (const memory of accessed) {
      if (!existingIds.has(memory.id)) {
        combined.push(memory);
      }
    }

    return combined.slice(0, sanitizedLimit);
  }

  /**
   * Format memories for AI context
   */
  formatForContext(memories) {
    if (!memories || memories.length === 0) {
      return "";
    }

    const formatted = memories
      .map(m => `- [${m.category || "general"}] ${m.content}`)
      .join("\n");

    return `\nRelevant memories:\n${formatted}`;
  }
}

// Singleton instance
const memoryStorage = new MemoryStorage();

export default memoryStorage;
