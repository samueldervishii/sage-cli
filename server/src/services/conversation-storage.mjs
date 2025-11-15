import { v4 as uuidv4 } from "uuid";
import mongoDBService from "./mongodb-service.mjs";

class ConversationStorage {
  constructor() {
    this.collection = null;
  }

  async initialize() {
    const db = await mongoDBService.connect();
    this.collection = db.collection("conversations");
  }

  async ensureInitialized() {
    if (!this.collection) {
      await this.initialize();
    }
  }

  /**
   * Create a new conversation
   */
  async createConversation(metadata = {}) {
    await this.ensureInitialized();

    const conversation = {
      id: uuidv4(),
      startedAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
      messages: [],
      metadata: {
        workingDirectory: process.cwd(),
        nodeVersion: process.version,
        ...metadata,
      },
      deleted: false,
    };

    await this.collection.insertOne(conversation);
    return conversation;
  }

  /**
   * Add a message to a conversation
   */
  async addMessage(conversationId, message) {
    await this.ensureInitialized();

    // Validate conversationId is a string
    if (typeof conversationId !== "string") {
      throw new Error("conversationId must be a string");
    }

    const messageWithTimestamp = {
      ...message,
      timestamp: new Date().toISOString(),
    };

    const result = await this.collection.updateOne(
      { id: { $eq: conversationId }, deleted: false },
      {
        $push: { messages: messageWithTimestamp },
        $set: { lastMessageAt: new Date().toISOString() },
      }
    );

    if (result.matchedCount === 0) {
      throw new Error(
        `Conversation ${conversationId} not found or has been deleted`
      );
    }

    return messageWithTimestamp;
  }

  /**
   * Get a conversation by ID
   */
  async getConversation(conversationId) {
    await this.ensureInitialized();

    // Validate conversationId is a string
    if (typeof conversationId !== "string") {
      throw new Error("conversationId must be a string");
    }

    const conversation = await this.collection.findOne(
      { id: { $eq: conversationId }, deleted: false },
      { projection: { _id: 0 } }
    );

    return conversation;
  }

  /**
   * List all conversations (non-deleted)
   */
  async listConversations(options = {}) {
    await this.ensureInitialized();

    const { limit = 50, skip = 0, includeDeleted = false } = options;

    // Validate and sanitize numeric inputs
    const sanitizedLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
    const sanitizedSkip = Math.max(parseInt(skip) || 0, 0);

    const query = includeDeleted ? {} : { deleted: false };

    const conversations = await this.collection
      .find(query, { projection: { _id: 0 } })
      .sort({ lastMessageAt: -1 })
      .skip(sanitizedSkip)
      .limit(sanitizedLimit)
      .toArray();

    // Add computed fields
    return conversations.map(conv => ({
      ...conv,
      messageCount: conv.messages?.length || 0,
      firstUserMessage:
        conv.messages?.find(m => m.role === "user")?.content || null,
    }));
  }

  /**
   * Soft delete a conversation
   */
  async deleteConversation(conversationId) {
    await this.ensureInitialized();

    // Validate conversationId is a string
    if (typeof conversationId !== "string") {
      throw new Error("conversationId must be a string");
    }

    const result = await this.collection.updateOne(
      { id: { $eq: conversationId } },
      {
        $set: {
          deleted: true,
          deletedAt: new Date().toISOString(),
        },
      }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Hard delete a conversation (permanent)
   */
  async permanentlyDeleteConversation(conversationId) {
    await this.ensureInitialized();

    // Validate conversationId is a string
    if (typeof conversationId !== "string") {
      throw new Error("conversationId must be a string");
    }

    const result = await this.collection.deleteOne({
      id: { $eq: conversationId },
    });
    return result.deletedCount > 0;
  }

  /**
   * Restore a soft-deleted conversation
   */
  async restoreConversation(conversationId) {
    await this.ensureInitialized();

    // Validate conversationId is a string
    if (typeof conversationId !== "string") {
      throw new Error("conversationId must be a string");
    }

    const result = await this.collection.updateOne(
      { id: { $eq: conversationId }, deleted: true },
      {
        $set: { deleted: false },
        $unset: { deletedAt: "" },
      }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Clean old conversations (older than specified days)
   */
  async cleanOldConversations(daysOld = 30) {
    await this.ensureInitialized();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.collection.updateMany(
      {
        lastMessageAt: { $lt: cutoffDate.toISOString() },
        deleted: false,
      },
      {
        $set: {
          deleted: true,
          deletedAt: new Date().toISOString(),
        },
      }
    );

    return result.modifiedCount;
  }

  /**
   * Soft delete all non-deleted conversations
   */
  async deleteAllConversations() {
    await this.ensureInitialized();

    const result = await this.collection.updateMany(
      { deleted: false },
      {
        $set: {
          deleted: true,
          deletedAt: new Date().toISOString(),
        },
      }
    );

    return result.modifiedCount;
  }

  /**
   * Get conversation statistics
   */
  async getStatistics() {
    await this.ensureInitialized();

    const stats = await this.collection
      .aggregate([
        {
          $facet: {
            total: [{ $match: { deleted: false } }, { $count: "count" }],
            deleted: [{ $match: { deleted: true } }, { $count: "count" }],
            totalMessages: [
              { $match: { deleted: false } },
              { $project: { messageCount: { $size: "$messages" } } },
              { $group: { _id: null, total: { $sum: "$messageCount" } } },
            ],
          },
        },
      ])
      .toArray();

    const result = stats[0];

    return {
      totalConversations: result.total[0]?.count || 0,
      deletedConversations: result.deleted[0]?.count || 0,
      totalMessages: result.totalMessages[0]?.total || 0,
    };
  }

  /**
   * Search conversations by content
   */
  async searchConversations(query) {
    await this.ensureInitialized();

    // Validate query is a string and escape special regex characters
    if (typeof query !== "string") {
      throw new Error("query must be a string");
    }
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const conversations = await this.collection
      .find(
        {
          deleted: false,
          $or: [
            { "messages.content": { $regex: escapedQuery, $options: "i" } },
            {
              "metadata.workingDirectory": {
                $regex: escapedQuery,
                $options: "i",
              },
            },
          ],
        },
        { projection: { _id: 0 } }
      )
      .sort({ lastMessageAt: -1 })
      .limit(20)
      .toArray();

    return conversations.map(conv => ({
      ...conv,
      messageCount: conv.messages?.length || 0,
      firstUserMessage:
        conv.messages?.find(m => m.role === "user")?.content || null,
    }));
  }
}

// Singleton instance
const conversationStorage = new ConversationStorage();

export default conversationStorage;
