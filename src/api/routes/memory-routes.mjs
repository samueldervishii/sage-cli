import express from "express";
import memoryStorage from "../../services/memory-storage.mjs";

const router = express.Router();

/**
 * GET /api/memory/list
 * List all memories
 */
router.get("/list", async (req, res, next) => {
  try {
    const { limit = 100, skip = 0, category = null } = req.query;

    const memories = await memoryStorage.listMemories({
      limit: parseInt(limit),
      skip: parseInt(skip),
      category,
    });

    res.json({
      success: true,
      memories,
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

    const results = await memoryStorage.searchMemories(query);

    res.json({
      success: true,
      query,
      results,
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
    const { content, category = "general" } = req.body;

    if (!content) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Content is required",
      });
    }

    const memory = await memoryStorage.addMemory(content, category);

    res.json({
      success: true,
      message: "Memory added successfully",
      memory,
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
    const stats = await memoryStorage.getStatistics();

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
    const count = await memoryStorage.clearAllMemories();

    res.json({
      success: true,
      message: `Deleted ${count} memory(ies)`,
      count,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/memory/:id
 * Get a specific memory
 */
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const memory = await memoryStorage.getMemory(id);

    if (!memory) {
      return res.status(404).json({
        error: "Not Found",
        message: `Memory ${id} not found`,
      });
    }

    res.json({
      success: true,
      memory,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/memory/:id
 * Update a memory
 */
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content, category } = req.body;

    const memory = await memoryStorage.updateMemory(id, { content, category });

    if (!memory) {
      return res.status(404).json({
        error: "Not Found",
        message: `Memory ${id} not found`,
      });
    }

    res.json({
      success: true,
      message: "Memory updated successfully",
      memory,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/memory/:id
 * Delete a specific memory
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const deleted = await memoryStorage.deleteMemory(id);

    if (!deleted) {
      return res.status(404).json({
        error: "Not Found",
        message: `Memory ${id} not found`,
      });
    }

    res.json({
      success: true,
      message: `Memory ${id} has been deleted`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/memory/category/:category
 * Get memories by category
 */
router.get("/category/:category", async (req, res, next) => {
  try {
    const { category } = req.params;

    const memories = await memoryStorage.getMemoriesByCategory(category);

    res.json({
      success: true,
      category,
      memories,
      count: memories.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/memory/recent/:limit
 * Get recent memories
 */
router.get("/recent/:limit", async (req, res, next) => {
  try {
    const { limit = 10 } = req.params;

    const memories = await memoryStorage.getRecentMemories(parseInt(limit));

    res.json({
      success: true,
      memories,
      count: memories.length,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
