import express from "express";
import MemoryManager from "../../utils/memory-manager.mjs";

const router = express.Router();

// Single memory manager instance (memories are user-level, not session-level)
let memoryManager = null;

async function getMemoryManager() {
  if (!memoryManager) {
    memoryManager = new MemoryManager();
    await memoryManager.init();
  }
  return memoryManager;
}

/**
 * GET /api/memory/list
 * List all memories
 */
router.get("/list", async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;
    const manager = await getMemoryManager();

    const memories = manager.getContextMemories(parseInt(limit));

    res.json({
      success: true,
      memories: memories.map(m => ({
        content: m.content,
        category: m.category,
        timestamp: m.timestamp,
        accessCount: m.accessCount,
      })),
      count: memories.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/memory/search
 * Search memories
 */
router.get("/search", async (req, res, next) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Query parameter is required",
      });
    }

    const manager = await getMemoryManager();
    const results = manager.searchMemories(query);

    res.json({
      success: true,
      query,
      results: results.map(m => ({
        content: m.content,
        category: m.category,
        timestamp: m.timestamp,
      })),
      count: results.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/memory/add
 * Add a new memory
 */
router.post("/add", async (req, res, next) => {
  try {
    const { content, category } = req.body;

    if (!content || !category) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Content and category are required",
      });
    }

    const manager = await getMemoryManager();
    const result = await manager.remember(content, category);

    res.json({
      success: result.success,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/memory/stats
 * Get memory statistics
 */
router.get("/stats", async (req, res, next) => {
  try {
    const manager = await getMemoryManager();
    const stats = manager.getStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/memory/clear
 * Clear all memories
 */
router.delete("/clear", async (req, res, next) => {
  try {
    const manager = await getMemoryManager();
    const result = await manager.clearAllMemories();

    res.json({
      success: result.success,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
