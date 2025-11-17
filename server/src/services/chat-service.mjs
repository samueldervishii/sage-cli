import { GoogleGenerativeAI } from "@google/generative-ai";
import SearchService from "../utils/search-service.mjs";
import OpenRouterClient from "../utils/openrouter-client.mjs";
import { getOpenRouterModelId } from "../config/models.mjs";
import conversationStorage from "./conversation-storage.mjs";
import memoryStorage from "./memory-storage.mjs";

/**
 * ChatService - UI-agnostic chat service
 * Returns data structures instead of formatting output
 * Can be used by both CLI and API
 */
class ChatService {
  constructor() {
    this.openrouterClient = null;
    this.conversationHistory = [];
    this.model = null;
    this.genAI = null;
    this.searchService = null;
    this.currentConversationId = null; // MongoDB UUID for current conversation

    // Model configuration with sensible defaults
    this.modelConfig = {
      selectedModel: "gemini", // gemini, deepseek, llama-3.2-3b, mistral-7b, qwen-2-7b, phi-3-mini, gemini-flash-or
      temperature: 1.0,
      maxOutputTokens: 8192,
      topP: 0.95,
      topK: 40,
      memoryMode: "active", // off, passive, active
    };
  }

  async initialize(conversationId = null, modelParams = null) {
    // Update model configuration if provided
    if (modelParams) {
      this.updateModelConfig(modelParams);
    }

    const selectedModel = this.modelConfig.selectedModel || "gemini";

    // Initialize based on selected model
    const openRouterModels = [
      "deepseek",
      "llama-3.2-3b",
      "mistral-7b",
      "qwen-2-7b",
      "phi-3-mini",
      "gemini-flash-or",
    ];

    if (selectedModel === "gemini") {
      await this._initializeGemini();
    } else if (openRouterModels.includes(selectedModel)) {
      await this._initializeOpenRouter();
    } else {
      throw new Error(`Unknown model: ${selectedModel}`);
    }

    this.conversationHistory = [];
    this.searchService = new SearchService();

    // Initialize OpenRouter client if API key is available (for fallback)
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    if (openrouterKey) {
      const openrouterModel =
        process.env.OPENROUTER_MODEL ||
        "deepseek/deepseek-r1-distill-llama-70b:free";
      this.openrouterClient = new OpenRouterClient(
        openrouterKey,
        openrouterModel
      );
    }

    // If resuming, load existing conversation from MongoDB; otherwise create new
    if (conversationId) {
      const existingConversation =
        await conversationStorage.getConversation(conversationId);

      if (existingConversation) {
        this.currentConversationId = conversationId;

        // Load messages into conversation history for Gemini
        if (
          existingConversation.messages &&
          existingConversation.messages.length > 0
        ) {
          for (const msg of existingConversation.messages) {
            this.conversationHistory.push({
              role: msg.role,
              parts: [{ text: msg.content }],
              timestamp: msg.timestamp,
            });
          }
        }

        return {
          resumed: true,
          conversationId,
          conversation: existingConversation,
        };
      } else {
        // Conversation not found, create new one
        const newConversation = await conversationStorage.createConversation();
        this.currentConversationId = newConversation.id;

        return {
          resumed: false,
          conversationId: newConversation.id,
        };
      }
    } else {
      // Don't create conversation yet - wait for first message
      this.currentConversationId = null;

      return {
        resumed: false,
        conversationId: null, // Will be created on first message
      };
    }
  }

  /**
   * Initialize Gemini model
   * @private
   */
  async _initializeGemini() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY not found in environment variables. Please add it to your .env file."
      );
    }

    this.genAI = new GoogleGenerativeAI(apiKey);

    // Define tools for Gemini (memory operations)
    const tools = this._buildToolDefinitions();

    // Build system instruction
    const systemInstruction = this._buildSystemInstruction();

    // Get model from env or use default
    const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash-exp";

    // Build generation config with validated parameters
    const generationConfig = this._buildGenerationConfig();

    this.model = this.genAI.getGenerativeModel({
      model: modelName,
      tools: tools,
      systemInstruction: {
        parts: [{ text: systemInstruction }],
        role: "system",
      },
      generationConfig: generationConfig,
    });
  }

  /**
   * Initialize DeepSeek model via OpenRouter
   * @private
   */
  async _initializeOpenRouter() {
    console.log("[ChatService] Initializing OpenRouter...");
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterKey) {
      throw new Error(
        "OPENROUTER_API_KEY not found in environment variables. Please add it to your .env file."
      );
    }

    // Get the correct OpenRouter model ID based on selected model
    const modelId = this.modelConfig.selectedModel || "deepseek";
    const openrouterModel = getOpenRouterModelId(modelId);

    console.log(
      `[ChatService] Creating OpenRouter client with model: ${openrouterModel} (internal ID: ${modelId})`
    );
    this.openrouterClient = new OpenRouterClient(
      openrouterKey,
      openrouterModel
    );
    console.log(
      "[ChatService] OpenRouter client created:",
      this.openrouterClient !== null
    );

    // Store tools for OpenRouter models
    this.tools = this._buildToolDefinitions();
    console.log("[ChatService] DeepSeek initialization complete");
  }

  /**
   * Send a message and get a response
   * @param {string} userInput - The user's message
   * @param {object} callbacks - Optional callbacks for UI updates
   * @returns {object} Response data
   */
  async sendMessage(userInput, callbacks = {}) {
    const {
      onSearchStart,
      onThinking,
      onFunctionCall: _onFunctionCall,
      onMemoryStore: _onMemoryStore,
      onMemoryRecall: _onMemoryRecall,
      onProcessing: _onProcessing,
      onFallback,
    } = callbacks;

    try {
      // Create conversation on first message if it doesn't exist
      if (!this.currentConversationId) {
        const newConversation = await conversationStorage.createConversation();
        this.currentConversationId = newConversation.id;
      }

      // Add user message to history
      this.conversationHistory.push({
        role: "user",
        parts: [{ text: userInput }],
        timestamp: new Date().toISOString(),
      });

      // Save user message to MongoDB
      await conversationStorage.addMessage(this.currentConversationId, {
        role: "user",
        content: userInput,
      });

      let finalInput = userInput;
      let searchResults = null;

      // Handle search if detected
      if (SearchService.detectSearchIntent(userInput)) {
        const searchQuery = SearchService.extractSearchQuery(userInput);
        if (onSearchStart) onSearchStart(searchQuery);

        try {
          searchResults = await this.searchService.search(searchQuery);
          finalInput = `${userInput}\nHere are current search results for "${searchQuery}":\n${searchResults.results.map(r => r.text || JSON.stringify(r)).join("\n")}\nPlease provide a comprehensive answer based on this information.`;
        } catch (error) {
          // Search failed, continue without it
          if (callbacks.onError) {
            callbacks.onError({ type: "search", message: error.message });
          }
        }
      }

      if (onThinking) onThinking();

      // Route to appropriate model
      // Models that use OpenRouter API (all except 'gemini')
      const openRouterModels = [
        "deepseek",
        "llama-3.2-3b",
        "mistral-7b",
        "qwen-2-7b",
        "phi-3-mini",
        "gemini-flash-or",
      ];

      if (openRouterModels.includes(this.modelConfig.selectedModel)) {
        return await this._sendMessageOpenRouter(
          finalInput,
          searchResults,
          callbacks
        );
      } else {
        // Use Gemini direct API for 'gemini' model
        return await this._sendMessageGemini(
          finalInput,
          searchResults,
          callbacks
        );
      }
    } catch (error) {
      // Try fallback to OpenRouter if rate limited
      const errorMsg = error.message || String(error);
      const isRateLimit =
        errorMsg.includes("429") ||
        errorMsg.includes("Too Many Requests") ||
        errorMsg.includes("Resource exhausted");

      if (isRateLimit && this.openrouterClient) {
        if (onFallback) onFallback();

        try {
          const openrouterMessages = this.openrouterClient.convertGeminiHistory(
            this.conversationHistory
          );

          const contextMemories = await memoryStorage.getContextMemories(10);
          const memoryContext = memoryStorage.formatForContext(contextMemories);

          const systemMessage = {
            role: "system",
            content: `You are Sage, an intelligent AI assistant. Current directory: ${process.cwd()}. Be helpful, creative, and conversational.\n\n${memoryContext}`,
          };
          openrouterMessages.unshift(systemMessage);

          if (onThinking) onThinking();

          const fallbackResponse =
            await this.openrouterClient.chatCompletion(openrouterMessages);

          if (fallbackResponse && fallbackResponse.success) {
            const reply = fallbackResponse.content;

            this.conversationHistory.push({
              role: "model",
              parts: [{ text: reply }],
              timestamp: new Date().toISOString(),
            });

            // Save model response to MongoDB
            await conversationStorage.addMessage(this.currentConversationId, {
              role: "model",
              content: reply,
              fallback: true,
              model: fallbackResponse.model,
            });

            return {
              success: true,
              reply,
              fallback: true,
              model: fallbackResponse.model,
              conversationId: this.currentConversationId,
            };
          }
        } catch (_fallbackError) {
          // Both failed, throw original error
        }
      }

      // Log the actual error before returning
      console.error("[ChatService Error]", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });

      return {
        success: false,
        error: {
          message: this._parseError(error),
          raw: error.message,
          stack: error.stack,
        },
      };
    }
  }

  /**
   * Send message using Gemini
   * @private
   */
  async _sendMessageGemini(finalInput, searchResults, callbacks) {
    const { onFunctionCall, onMemoryStore, onMemoryRecall, onProcessing } =
      callbacks;

    const cleanHistory = this.conversationHistory.map(msg => ({
      role: msg.role,
      parts: msg.parts,
    }));

    const chat = this.model.startChat({
      history: cleanHistory,
    });

    let result = await chat.sendMessage(finalInput);
    let response = result.response;

    // Check for function calls
    const functionCalls = response.functionCalls();

    if (functionCalls && functionCalls.length > 0) {
      const functionResponses = [];

      for (const call of functionCalls) {
        if (onFunctionCall) onFunctionCall(call.name);

        if (!call.name || !call.args || typeof call.args !== "object") {
          continue;
        }

        let functionResult;

        switch (call.name) {
          case "remember_info":
            functionResult = await this._handleRememberInfo(
              call.args,
              onMemoryStore
            );
            break;
          case "recall_info":
            functionResult = await this._handleRecallInfo(
              call.args,
              onMemoryRecall
            );
            break;
        }

        if (functionResult) {
          functionResponses.push(functionResult);
        }
      }

      if (onProcessing) onProcessing();

      // Send function results back to model
      const functionResponseMessages = functionResponses.map(fr => ({
        functionResponse: {
          name: fr.name,
          response: fr.response,
        },
      }));

      result = await chat.sendMessage(functionResponseMessages);
      response = result.response;
    }

    const reply = response.text();
    const functionCallNames = functionCalls
      ? functionCalls.map(fc => fc.name)
      : [];

    this.conversationHistory.push({
      role: "model",
      parts: [{ text: reply }],
      timestamp: new Date().toISOString(),
      searchUsed: !!searchResults,
    });

    // Save model response to MongoDB
    await conversationStorage.addMessage(this.currentConversationId, {
      role: "model",
      content: reply,
      searchUsed: !!searchResults,
      functionCalls:
        functionCallNames.length > 0 ? functionCallNames : undefined,
      model: this.modelConfig.selectedModel,
    });

    return {
      success: true,
      reply,
      searchUsed: !!searchResults,
      functionCalls: functionCallNames,
      searchResults: searchResults?.results,
      model: "gemini",
      conversationId: this.currentConversationId,
    };
  }

  /**
   * Send message using DeepSeek via OpenRouter
   * @private
   */
  async _sendMessageOpenRouter(finalInput, searchResults, callbacks) {
    // Verify OpenRouter client is initialized
    if (!this.openrouterClient) {
      console.error(
        "[ChatService] OpenRouter client is null! Re-initializing..."
      );
      await this._initializeOpenRouter();
    }

    const { onFunctionCall, onMemoryStore, onMemoryRecall, onProcessing } =
      callbacks;

    // Convert history to OpenRouter format
    console.log("[ChatService] Converting history for OpenRouter...");
    const openrouterMessages = this.openrouterClient.convertGeminiHistory(
      this.conversationHistory
    );

    // Add system instruction with memory context
    const contextMemories = await memoryStorage.getContextMemories(10);
    const memoryContext = memoryStorage.formatForContext(contextMemories);
    const systemInstruction = this._buildSystemInstruction();

    const systemMessage = {
      role: "system",
      content: `${systemInstruction}\n\n${memoryContext}`,
    };
    openrouterMessages.unshift(systemMessage);

    // Add current user message
    openrouterMessages.push({
      role: "user",
      content: finalInput,
    });

    // Convert tools to OpenRouter format
    const openrouterTools = this.openrouterClient.convertGeminiTools(
      this.tools
    );

    // Send message with tools
    const response = await this.openrouterClient.chatCompletion(
      openrouterMessages,
      {
        temperature: this.modelConfig.temperature,
        maxTokens: this.modelConfig.maxOutputTokens,
        tools: openrouterTools,
      }
    );

    if (!response.success) {
      throw new Error(response.error);
    }

    console.log("[ChatService] OpenRouter response:", {
      success: response.success,
      content: response.content,
      model: this.modelConfig.selectedModel,
      hasToolCalls: response.toolCalls && response.toolCalls.length > 0,
    });

    let reply = response.content;
    const functionCallNames = [];

    // Handle tool calls if present
    if (response.toolCalls && response.toolCalls.length > 0) {
      const functionResponses = [];

      for (const toolCall of response.toolCalls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        if (onFunctionCall) onFunctionCall(functionName);
        functionCallNames.push(functionName);

        let functionResult;

        switch (functionName) {
          case "remember_info":
            functionResult = await this._handleRememberInfo(
              functionArgs,
              onMemoryStore
            );
            break;
          case "recall_info":
            functionResult = await this._handleRecallInfo(
              functionArgs,
              onMemoryRecall
            );
            break;
        }

        if (functionResult) {
          functionResponses.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: functionName,
            content: JSON.stringify(functionResult.response),
          });
        }
      }

      if (onProcessing) onProcessing();

      // Send function results back to model
      const followUpMessages = [...openrouterMessages];
      followUpMessages.push({
        role: "assistant",
        content: response.content || "",
        tool_calls: response.toolCalls,
      });
      followUpMessages.push(...functionResponses);

      const followUpResponse = await this.openrouterClient.chatCompletion(
        followUpMessages,
        {
          temperature: this.modelConfig.temperature,
          maxTokens: this.modelConfig.maxOutputTokens,
        }
      );

      if (followUpResponse.success) {
        reply = followUpResponse.content;
      }
    }

    this.conversationHistory.push({
      role: "model",
      parts: [{ text: reply }],
      timestamp: new Date().toISOString(),
      searchUsed: !!searchResults,
    });

    // Save model response to MongoDB
    await conversationStorage.addMessage(this.currentConversationId, {
      role: "model",
      content: reply,
      searchUsed: !!searchResults,
      functionCalls:
        functionCallNames.length > 0 ? functionCallNames : undefined,
      model: response.model,
    });

    return {
      success: true,
      reply,
      searchUsed: !!searchResults,
      functionCalls: functionCallNames,
      searchResults: searchResults?.results,
      model: response.model,
      conversationId: this.currentConversationId,
    };
  }

  /**
   * Build tool definitions for Gemini
   */
  _buildToolDefinitions() {
    return [
      {
        functionDeclarations: [
          {
            name: "remember_info",
            description:
              "Store information about the user for future conversations. Use this when the user explicitly asks you to remember something, or mentions preferences, facts about themselves, or context that would be useful to recall later.",
            parameters: {
              type: "OBJECT",
              properties: {
                content: {
                  type: "STRING",
                  description:
                    "The information to remember (be specific and clear)",
                },
                category: {
                  type: "STRING",
                  description:
                    "Category of the memory: preference, fact, context, project, or general",
                },
              },
              required: ["content", "category"],
            },
          },
          {
            name: "recall_info",
            description:
              "Search through stored memories about the user. Use this when you need to recall previous information about the user's preferences, facts, or context to provide a personalized response.",
            parameters: {
              type: "OBJECT",
              properties: {
                query: {
                  type: "STRING",
                  description: "Search query to find relevant memories",
                },
              },
              required: ["query"],
            },
          },
        ],
      },
    ];
  }

  /**
   * Build system instruction
   */
  _buildSystemInstruction() {
    const memoryMode = this.modelConfig.memoryMode || "active";

    // Build memory instructions based on mode
    let memoryInstructions = "";
    if (memoryMode === "off") {
      memoryInstructions = `Memory System: DISABLED
- You do not have access to stored memories in this session
- Focus on the current conversation context only
- Do not attempt to use remember_info or recall_info functions`;
    } else if (memoryMode === "passive") {
      memoryInstructions = `Memory System: PASSIVE MODE
- You have the ability to remember information about the user across conversations
- When a user EXPLICITLY asks you to remember something, use the remember_info function
- Only use recall_info when the user explicitly asks you to recall something (e.g., "What do you remember about me?")
- Do NOT proactively check memory unless explicitly requested
- Focus on providing direct, context-independent responses`;
    } else {
      // active mode (default)
      memoryInstructions = `Memory System: ACTIVE MODE
- You have the ability to remember information about the user across conversations
- When a user asks you to remember something or mentions preferences/facts about themselves, use the remember_info function
- IMPORTANT: ALWAYS use recall_info FIRST before answering questions that could benefit from personalization
- Before asking the user for preferences, ALWAYS check recall_info to see if you already know them
- Common queries to check memory for: recommendations (food, movies, books), preferences, personal facts, project context
- Examples of things to remember: preferences (likes blueberries), facts (works as a developer), context (working on project X), etc.
- Be proactive about using memory - check it often! Don't ask for information you might already have stored`;
    }

    return `You are Sage, an intelligent AI assistant accessible through a modern web interface. You are NOT a CLI tool, data analysis tool, or any other specific software - you are a conversational AI assistant that helps users with various tasks.

Key traits:
- Be friendly and personable
- Provide clear, well-formatted responses using markdown
- Respond naturally to greetings and casual conversation
- Ask follow-up questions when appropriate
- Remember context from our conversation
- Be concise but thorough
- Format your responses with proper markdown (use **bold** for emphasis, code blocks for code, lists for lists, etc.)
- NEVER make up information about "Sage CLI" or pretend to be a specific tool - you are an AI assistant named Sage

You can help with:
- Programming and Development: Writing code, debugging, code review, explaining programming concepts
- Problem Solving: Breaking down complex problems, brainstorming solutions, step-by-step guidance
- Creative Assistance: Writing, content creation, idea generation, design suggestions
- General Knowledge: Explaining topics, tutorials, research assistance on any subject
- Web Search: Finding up-to-date information when needed
- Memory: Remembering user preferences and context for personalized responses

${memoryInstructions}

When provided with search results, incorporate them naturally into your responses and cite sources when relevant.
When asked to generate code, provide clean, working examples with explanations.`;
  }

  /**
   * Handle remember_info function call
   */
  async _handleRememberInfo(args, callback) {
    const { content, category } = args;
    if (callback) callback({ content, category });

    const memory = await memoryStorage.addMemory(content, category);

    return {
      name: "remember_info",
      response: {
        success: true,
        message: `Stored memory: ${content}`,
        memoryId: memory.id,
      },
    };
  }

  /**
   * Handle recall_info function call
   */
  async _handleRecallInfo(args, callback) {
    const { query } = args;
    const memories = await memoryStorage.searchMemories(query);

    if (callback) callback({ query, memories });

    return {
      name: "recall_info",
      response: {
        success: true,
        memoriesFound: memories.length,
        memories: memories.map(m => ({
          content: m.content,
          category: m.category,
          timestamp: m.timestamp,
        })),
      },
    };
  }

  /**
   * Parse error into user-friendly message
   */
  _parseError(error) {
    const errorMsg = error.message || String(error);

    if (
      errorMsg.includes("429") ||
      errorMsg.includes("Too Many Requests") ||
      errorMsg.includes("Resource exhausted")
    ) {
      return "AI provider rate limit exceeded (Gemini/DeepSeek free tier limit). Please wait a moment before trying again, or consider upgrading to a paid API key for higher limits.";
    }

    if (
      errorMsg.includes("API key") ||
      errorMsg.includes("401") ||
      errorMsg.includes("403")
    ) {
      return "API authentication failed. Please check your API key configuration.";
    }

    if (
      errorMsg.includes("ECONNREFUSED") ||
      errorMsg.includes("ENOTFOUND") ||
      errorMsg.includes("network")
    ) {
      return "Network error. Please check your internet connection.";
    }

    if (errorMsg.includes("quota") || errorMsg.includes("billing")) {
      return "API quota exceeded. Please check your account limits.";
    }

    if (errorMsg.includes("GoogleGenerativeAI Error")) {
      return "The AI service is currently unavailable. Please try again later.";
    }

    return "Something went wrong. Please try again.";
  }

  /**
   * Build generation config from current model configuration
   * @private
   */
  _buildGenerationConfig() {
    return {
      temperature: this.modelConfig.temperature,
      maxOutputTokens: this.modelConfig.maxOutputTokens,
      topP: this.modelConfig.topP,
      topK: this.modelConfig.topK,
    };
  }

  /**
   * Validate model parameters
   * @private
   */
  _validateModelParams(params) {
    const errors = [];

    if (params.temperature !== undefined) {
      const temp = parseFloat(params.temperature);
      if (isNaN(temp) || temp < 0 || temp > 2) {
        errors.push("Temperature must be between 0 and 2");
      }
    }

    if (params.maxOutputTokens !== undefined) {
      const tokens = parseInt(params.maxOutputTokens);
      if (isNaN(tokens) || tokens < 1 || tokens > 8192) {
        errors.push("Max output tokens must be between 1 and 8192");
      }
    }

    if (params.topP !== undefined) {
      const topP = parseFloat(params.topP);
      if (isNaN(topP) || topP < 0 || topP > 1) {
        errors.push("TopP must be between 0 and 1");
      }
    }

    if (params.topK !== undefined) {
      const topK = parseInt(params.topK);
      if (isNaN(topK) || topK < 1 || topK > 100) {
        errors.push("TopK must be between 1 and 100");
      }
    }

    if (params.memoryMode !== undefined) {
      const validModes = ["off", "passive", "active"];
      if (!validModes.includes(params.memoryMode)) {
        errors.push("Memory mode must be one of: off, passive, active");
      }
    }

    if (params.selectedModel !== undefined) {
      const validModels = [
        "gemini",
        "deepseek",
        "llama-3.2-3b",
        "mistral-7b",
        "qwen-2-7b",
        "phi-3-mini",
        "gemini-flash-or",
      ];
      if (!validModels.includes(params.selectedModel)) {
        errors.push(`Selected model must be one of: ${validModels.join(", ")}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Update model configuration with validation
   * @param {object} params - Model parameters to update
   * @returns {object} Update result
   */
  updateModelConfig(params) {
    const validation = this._validateModelParams(params);

    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors,
      };
    }

    // Update only provided parameters
    if (params.temperature !== undefined) {
      this.modelConfig.temperature = parseFloat(params.temperature);
    }
    if (params.maxOutputTokens !== undefined) {
      this.modelConfig.maxOutputTokens = parseInt(params.maxOutputTokens);
    }
    if (params.topP !== undefined) {
      this.modelConfig.topP = parseFloat(params.topP);
    }
    if (params.topK !== undefined) {
      this.modelConfig.topK = parseInt(params.topK);
    }
    if (params.memoryMode !== undefined) {
      this.modelConfig.memoryMode = params.memoryMode;
    }
    if (params.selectedModel !== undefined) {
      this.modelConfig.selectedModel = params.selectedModel;
    }

    return {
      success: true,
      config: { ...this.modelConfig },
    };
  }

  /**
   * Get current model configuration
   * @returns {object} Current model config
   */
  getModelConfig() {
    return { ...this.modelConfig };
  }

  /**
   * Reset model configuration to defaults
   */
  resetModelConfig() {
    this.modelConfig = {
      selectedModel: "gemini",
      temperature: 1.0,
      maxOutputTokens: 8192,
      topP: 0.95,
      topK: 40,
      memoryMode: "active",
    };
    return {
      success: true,
      config: { ...this.modelConfig },
    };
  }
}

export default ChatService;
