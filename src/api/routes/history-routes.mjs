import express from "express";
import conversationStorage from "../../services/conversation-storage.mjs";

const router = express.Router();

/**
 * GET /api/history/list
 * List all conversations (non-deleted)
 */
router.get("/list", async (req, res, next) => {
  try {
    const { limit = 50, skip = 0 } = req.query;

    const conversations = await conversationStorage.listConversations({
      limit: parseInt(limit),
      skip: parseInt(skip),
    });

    res.json({
      success: true,
      conversations,
      count: conversations.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/history/:id
 * Get a specific conversation
 */
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const conversation = await conversationStorage.getConversation(id);

    if (!conversation) {
      return res.status(404).json({
        error: "Not Found",
        message: `Conversation ${id} not found`,
      });
    }

    res.json({
      success: true,
      conversation,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/history/:id/export
 * Export conversation as JSON
 */
router.get("/:id/export", async (req, res, next) => {
  try {
    const { id } = req.params;

    const conversation = await conversationStorage.getConversation(id);

    if (!conversation) {
      return res.status(404).json({
        error: "Not Found",
        message: `Conversation ${id} not found`,
      });
    }

    res.json({
      success: true,
      conversation,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/history/info/storage
 * Get storage statistics
 */
router.get("/info/storage", async (req, res, next) => {
  try {
    const stats = await conversationStorage.getStatistics();

    res.json({
      success: true,
      info: {
        totalConversations: stats.totalConversations,
        deletedConversations: stats.deletedConversations,
        totalMessages: stats.totalMessages,
        storageType: "mongodb",
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/history/clean
 * Soft delete old conversations (older than 30 days)
 */
router.delete("/clean", async (req, res, next) => {
  try {
    const { days = 30 } = req.query;

    const count = await conversationStorage.cleanOldConversations(
      parseInt(days)
    );

    res.json({
      success: true,
      message: `Soft deleted ${count} old conversation(s)`,
      count,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/history/:id
 * Soft delete a specific conversation
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const deleted = await conversationStorage.deleteConversation(id);

    if (!deleted) {
      return res.status(404).json({
        error: "Not Found",
        message: `Conversation ${id} not found`,
      });
    }

    res.json({
      success: true,
      message: `Conversation ${id} has been deleted`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/history/:id/restore
 * Restore a soft-deleted conversation
 */
router.post("/:id/restore", async (req, res, next) => {
  try {
    const { id } = req.params;

    const restored = await conversationStorage.restoreConversation(id);

    if (!restored) {
      return res.status(404).json({
        error: "Not Found",
        message: `Deleted conversation ${id} not found`,
      });
    }

    res.json({
      success: true,
      message: `Conversation ${id} has been restored`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/history/search
 * Search conversations by content
 */
router.get("/search/query", async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        error: "Bad Request",
        message: 'Query parameter "q" is required',
      });
    }

    const conversations = await conversationStorage.searchConversations(q);

    res.json({
      success: true,
      conversations,
      count: conversations.length,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
