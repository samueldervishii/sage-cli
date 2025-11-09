import express from "express";
import ConversationHistory from "../../utils/conversation-history.mjs";

const router = express.Router();

// Single history manager instance
let historyManager = null;

async function getHistoryManager() {
  if (!historyManager) {
    historyManager = new ConversationHistory();
    await historyManager.init();
  }
  return historyManager;
}

/**
 * GET /api/history/list
 * List all conversations
 */
router.get("/list", async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;
    const manager = await getHistoryManager();

    const conversations = await manager.listConversations(parseInt(limit));

    res.json({
      success: true,
      conversations: conversations.map(c => ({
        id: c.id,
        startedAt: c.startedAt,
        firstUserMessage: c.firstUserMessage,
        messageCount: c.messageCount,
      })),
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
    const manager = await getHistoryManager();

    const conversation = await manager.loadConversation(id);

    res.json({
      success: true,
      conversation: {
        id: conversation.id,
        startedAt: conversation.startedAt,
        messages: conversation.messages.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
          searchUsed: m.searchUsed,
          functionCalls: m.functionCalls,
        })),
      },
    });
  } catch (error) {
    if (error.message.includes("not found")) {
      return res.status(404).json({
        error: "Not Found",
        message: error.message,
      });
    }
    next(error);
  }
});

/**
 * GET /api/history/:id/export
 * Export conversation as markdown
 */
router.get("/:id/export", async (req, res, next) => {
  try {
    const { id } = req.params;
    const manager = await getHistoryManager();

    const markdown = await manager.exportToMarkdown(id);

    res.setHeader("Content-Type", "text/markdown");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="conversation-${id}.md"`
    );
    res.send(markdown);
  } catch (error) {
    if (error.message.includes("not found")) {
      return res.status(404).json({
        error: "Not Found",
        message: error.message,
      });
    }
    next(error);
  }
});

/**
 * GET /api/history/info
 * Get storage information
 */
router.get("/info/storage", async (req, res, next) => {
  try {
    const manager = await getHistoryManager();
    const info = await manager.getStorageInfo();

    res.json({
      success: true,
      info,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/history/clean
 * Delete all conversation history
 */
router.delete("/clean", async (req, res, next) => {
  try {
    const manager = await getHistoryManager();
    const count = await manager.cleanAll();

    res.json({
      success: true,
      message: `Deleted ${count} conversation(s)`,
      count,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
