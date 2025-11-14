import express from "express";
import ChatService from "../../services/chat-service.mjs";

const router = express.Router();

// Store chat service instances per session
const chatInstances = new Map();

/**
 * Get or create chat service for session
 */
function getChatService(sessionId) {
  if (!chatInstances.has(sessionId)) {
    chatInstances.set(sessionId, new ChatService());
  }
  return chatInstances.get(sessionId);
}

/**
 * POST /api/chat/initialize
 * Initialize a new chat session or resume existing conversation
 * Body: { conversationId?: string, modelParams?: object }
 */
router.post("/initialize", async (req, res, next) => {
  try {
    const { conversationId, modelParams } = req.body;
    const chatService = getChatService(req.sessionId);

    // Initialize with optional model parameters
    const result = await chatService.initialize(conversationId, modelParams);

    res.json({
      success: true,
      sessionId: req.sessionId,
      modelConfig: chatService.getModelConfig(),
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/chat/send
 * Send a message and get AI response
 */
router.post("/send", async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Message is required and must be a string",
      });
    }

    const chatService = getChatService(req.sessionId);

    // Check if chat service is initialized
    if (!chatService.model) {
      return res.status(400).json({
        error: "Not Initialized",
        message:
          "Chat session not initialized. Call /api/chat/initialize first",
      });
    }

    // Send message without UI callbacks (API mode)
    const response = await chatService.sendMessage(message);

    if (response.success) {
      res.json({
        success: true,
        reply: response.reply,
        searchUsed: response.searchUsed || false,
        functionCalls: response.functionCalls || [],
        fallback: response.fallback || false,
        model: response.model,
        conversationId: response.conversationId,
      });
    } else {
      res.status(500).json({
        success: false,
        error: response.error.message,
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/chat/status
 * Get current chat session status
 */
router.get("/status", (req, res) => {
  const chatService = chatInstances.get(req.sessionId);

  if (!chatService) {
    return res.json({
      initialized: false,
      sessionId: req.sessionId,
    });
  }

  res.json({
    initialized: !!chatService.model,
    sessionId: req.sessionId,
    conversationId: chatService.history?.currentConversationId,
    messageCount: chatService.conversationHistory?.length || 0,
  });
});

/**
 * DELETE /api/chat/session
 * Clear current chat session
 */
router.delete("/session", (req, res) => {
  chatInstances.delete(req.sessionId);

  res.json({
    success: true,
    message: "Session cleared",
  });
});

/**
 * GET /api/chat/config
 * Get current model configuration
 */
router.get("/config", (req, res) => {
  let chatService = chatInstances.get(req.sessionId);

  // If no session exists, create one with defaults
  if (!chatService) {
    chatService = new ChatService();
    chatInstances.set(req.sessionId, chatService);
  }

  res.json({
    success: true,
    config: chatService.getModelConfig(),
  });
});

/**
 * POST /api/chat/config
 * Update model configuration
 * Body: { temperature?: number, maxOutputTokens?: number, topP?: number, topK?: number, memoryMode?: string, selectedModel?: string }
 */
router.post("/config", (req, res, next) => {
  try {
    let chatService = chatInstances.get(req.sessionId);

    // If no session exists, create one
    if (!chatService) {
      chatService = new ChatService();
      chatInstances.set(req.sessionId, chatService);
    }

    const params = req.body;

    // Validate that at least one parameter is provided
    if (
      !params ||
      Object.keys(params).length === 0 ||
      (!params.temperature &&
        !params.maxOutputTokens &&
        !params.topP &&
        !params.topK &&
        !params.memoryMode &&
        !params.selectedModel)
    ) {
      return res.status(400).json({
        error: "Bad Request",
        message: "At least one model parameter must be provided",
      });
    }

    const result = chatService.updateModelConfig(params);

    if (!result.success) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Invalid model parameters",
        errors: result.errors,
      });
    }

    res.json({
      success: true,
      config: result.config,
      message: "Model configuration updated successfully",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/chat/config/reset
 * Reset model configuration to defaults
 */
router.post("/config/reset", (req, res) => {
  let chatService = chatInstances.get(req.sessionId);

  // If no session exists, create one
  if (!chatService) {
    chatService = new ChatService();
    chatInstances.set(req.sessionId, chatService);
  }

  const result = chatService.resetModelConfig();

  res.json({
    success: true,
    config: result.config,
    message: "Model configuration reset to defaults",
  });
});

export default router;
