import { GoogleGenerativeAI } from "@google/generative-ai";
import SearchService from "../utils/search-service.mjs";
import ConfigManager from "../config/config-manager.mjs";
import FileOperations from "../utils/file-operations.mjs";
import ConversationHistory from "../utils/conversation-history.mjs";
import MemoryManager from "../utils/memory-manager.mjs";
import OpenRouterClient from "../utils/openrouter-client.mjs";

/**
 * ChatService - UI-agnostic chat service
 * Returns data structures instead of formatting output
 * Can be used by both CLI and API
 */
class ChatService {
  constructor() {
    this.configManager = new ConfigManager();
    this.fileOps = new FileOperations();
    this.history = new ConversationHistory();
    this.memory = new MemoryManager();
    this.openrouterClient = null;
    this.conversationHistory = [];
    this.model = null;
    this.genAI = null;
    this.searchService = null;
  }

  async initialize(conversationId = null) {
    const apiKey = await this.configManager.getApiKey("gemini");
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY not found in configuration. Run 'sage setup' to configure API keys."
      );
    }

    this.genAI = new GoogleGenerativeAI(apiKey);

    // Define file operation tools for Gemini
    const tools = this._buildToolDefinitions();

    // Build system instruction
    const systemInstruction = this._buildSystemInstruction();

    // Get model from config
    const modelName = await this.configManager.getGeminiModel();

    this.model = this.genAI.getGenerativeModel({
      model: modelName,
      tools: tools,
      systemInstruction: {
        parts: [{ text: systemInstruction }],
        role: "system",
      },
    });
    this.conversationHistory = [];
    this.searchService = new SearchService();

    // Initialize conversation history
    await this.history.init();

    // Initialize memory system
    await this.memory.init();

    // Initialize OpenRouter client if API key is available (for fallback)
    const openrouterKey = await this.configManager.getApiKey("openrouter");
    if (openrouterKey) {
      const config = await this.configManager.loadConfig();
      const openrouterModel =
        config.preferences?.openrouterModel ||
        "deepseek/deepseek-r1-distill-llama-70b:free";
      this.openrouterClient = new OpenRouterClient(
        openrouterKey,
        openrouterModel
      );
    }

    // If resuming, load existing conversation; otherwise start new
    if (conversationId) {
      const existingConversation =
        await this.history.loadConversation(conversationId);
      this.history.currentConversationId = conversationId;
      this.history.currentConversation = existingConversation;

      // Load messages into conversation history for Gemini
      if (existingConversation.messages.length > 0) {
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
      await this.history.startNewConversation();
      return {
        resumed: false,
        conversationId: this.history.currentConversationId,
      };
    }
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
      onFunctionCall,
      onFileRead,
      onFileWrite,
      onSearchFiles,
      onMemoryStore,
      onMemoryRecall,
      onProcessing,
      onFallback,
    } = callbacks;

    try {
      // Add user message to history
      this.conversationHistory.push({
        role: "user",
        parts: [{ text: userInput }],
        timestamp: new Date().toISOString(),
      });

      await this.history.addMessage("user", userInput);

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
            case "search_files":
              functionResult = await this._handleSearchFiles(
                call.args,
                onSearchFiles
              );
              break;
            case "read_file":
              functionResult = await this._handleReadFile(
                call.args,
                onFileRead
              );
              break;
            case "write_file":
              functionResult = await this._handleWriteFile(
                call.args,
                onFileWrite
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

      await this.history.addMessage("model", reply, {
        searchUsed: !!searchResults,
        functionCalls:
          functionCallNames.length > 0 ? functionCallNames : undefined,
      });

      return {
        success: true,
        reply,
        searchUsed: !!searchResults,
        functionCalls: functionCallNames,
        searchResults: searchResults?.results,
      };
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

          const contextMemories = this.memory.getContextMemories(10);
          const memoryContext = this.memory.formatForContext(contextMemories);

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

            await this.history.addMessage("model", reply, {
              fallback: true,
              model: fallbackResponse.model,
            });

            return {
              success: true,
              reply,
              fallback: true,
              model: fallbackResponse.model,
            };
          }
        } catch (_fallbackError) {
          // Both failed, throw original error
        }
      }

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
   * Build tool definitions for Gemini
   */
  _buildToolDefinitions() {
    return [
      {
        functionDeclarations: [
          {
            name: "search_files",
            description:
              "Search for files matching a pattern in the current directory. Use this if you're not sure where a file is located.",
            parameters: {
              type: "OBJECT",
              properties: {
                pattern: {
                  type: "STRING",
                  description:
                    "File name or glob pattern to search for (e.g., 'package.json', '*.js', 'src/**/*.ts')",
                },
              },
              required: ["pattern"],
            },
          },
          {
            name: "read_file",
            description:
              "Read the contents of a file from the filesystem. Use this when the user asks you to read, analyze, or review a file.",
            parameters: {
              type: "OBJECT",
              properties: {
                file_path: {
                  type: "STRING",
                  description:
                    "The path to the file to read (relative or absolute)",
                },
                reason: {
                  type: "STRING",
                  description:
                    "Brief explanation of why you need to read this file",
                },
              },
              required: ["file_path", "reason"],
            },
          },
          {
            name: "write_file",
            description:
              "Write or update content to a file. Use this when the user asks you to create or modify a file.",
            parameters: {
              type: "OBJECT",
              properties: {
                file_path: {
                  type: "STRING",
                  description:
                    "The path to the file to write (relative or absolute)",
                },
                content: {
                  type: "STRING",
                  description: "The content to write to the file",
                },
                reason: {
                  type: "STRING",
                  description:
                    "Brief explanation of what changes you're making",
                },
              },
              required: ["file_path", "content", "reason"],
            },
          },
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
    const currentDir = process.cwd();
    return `You are Sage, an intelligent AI assistant. You are helpful, creative, and conversational.

Key traits:
- Be friendly and personable
- Provide clear, helpful responses
- Ask follow-up questions when appropriate
- Remember context from our conversation
- Be concise but thorough

You can help with:
- Generating code
- Answering questions with real-time web search when needed
- Reading and analyzing files from the filesystem
- Creating and modifying files
- Remembering information about the user for personalized responses
- Problem solving
- Creative tasks
- Technical discussions
- General conversation

Memory System:
- You have the ability to remember information about the user across conversations
- When a user asks you to remember something or mentions preferences/facts about themselves, use the remember_info function
- IMPORTANT: ALWAYS use recall_info FIRST before answering questions that could benefit from personalization
- Before asking the user for preferences, ALWAYS check recall_info to see if you already know them
- Common queries to check memory for: recommendations (food, movies, books), preferences, personal facts, project context
- Examples of things to remember: preferences (likes blueberries), facts (works as a developer), context (working on project X), etc.
- Be proactive about using memory - check it often! Don't ask for information you might already have stored

When provided with search results, incorporate them naturally into your responses and cite sources when relevant.
When asked to generate code, provide clean, working examples with explanations.

Current Working Directory: ${currentDir}

File Operations:
- You are currently running in the directory: ${currentDir}
- When a user asks you to read, analyze, or review a file, use the read_file function
- When a user asks you to create or modify a file, use the write_file function
- For common files like "package.json", "README.md", etc., assume they are in the current directory
- Use relative paths from the current directory (e.g., "package.json", "src/index.js")
- If a file path is not specified or you're unsure where a file is, use search_files first
- Examples: "banner file" → search for "banner.*", "config file" → search for "config.*"
- After searching, use the most relevant result to read the file
- Always provide a clear reason for why you need to perform the file operation
- The user will be prompted to confirm file operations before they are executed

Search Strategy:
- If user asks about a file without exact path (e.g., "What's in the banner file?"), search for it first
- Use patterns like "banner.*" to find files with that name regardless of extension
- Common patterns: "*.js", "*.mjs", "*.json", "src/**/*.js", etc.
- After finding the file, immediately read it without asking the user for the path`;
  }

  /**
   * Handle remember_info function call
   */
  async _handleRememberInfo(args, callback) {
    const { content, category } = args;
    if (callback) callback({ content, category });

    const result = await this.memory.remember(content, category);

    return {
      name: "remember_info",
      response: {
        success: result.success,
        message: result.message,
      },
    };
  }

  /**
   * Handle recall_info function call
   */
  async _handleRecallInfo(args, callback) {
    const { query } = args;
    const memories = await this.memory.searchMemories(query);

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
   * Handle search_files function call
   */
  async _handleSearchFiles(args, callback) {
    const { pattern } = args;
    const result = await this.fileOps.searchFiles(pattern);

    if (callback) callback({ pattern, result });

    return {
      name: "search_files",
      response: result.success
        ? {
            success: true,
            files: result.files,
            count: result.files.length,
          }
        : {
            success: false,
            error: result.error,
          },
    };
  }

  /**
   * Handle read_file function call
   * Note: This requires user confirmation in CLI, handled by callback
   */
  async _handleReadFile(args, callback) {
    const { file_path, reason } = args;

    // Callback should handle user confirmation and return result
    if (callback) {
      const result = await callback({ filePath: file_path, reason });

      return {
        name: "read_file",
        response: result.success
          ? {
              success: true,
              content: result.content,
              message: `File read successfully. Content has ${result.content.split("\n").length} lines.`,
            }
          : {
              success: false,
              error: result.error,
            },
      };
    }

    // No callback (API mode) - read directly
    const result = await this.fileOps.readFile(file_path);

    return {
      name: "read_file",
      response: result.success
        ? {
            success: true,
            content: result.content,
            message: `File read successfully. Content has ${result.content.split("\n").length} lines.`,
          }
        : {
            success: false,
            error: result.error,
          },
    };
  }

  /**
   * Handle write_file function call
   * Note: This requires user confirmation in CLI, handled by callback
   */
  async _handleWriteFile(args, callback) {
    const { file_path, content, reason } = args;

    // Callback should handle user confirmation and return result
    if (callback) {
      const result = await callback({ filePath: file_path, content, reason });

      return {
        name: "write_file",
        response: result.success
          ? {
              success: true,
              path: result.path,
              message: "File written successfully",
            }
          : {
              success: false,
              error: result.error,
            },
      };
    }

    // No callback (API mode) - write directly
    const result = await this.fileOps.writeFile(file_path, content);

    return {
      name: "write_file",
      response: result.success
        ? {
            success: true,
            path: result.path,
            message: "File written successfully",
          }
        : {
            success: false,
            error: result.error,
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
      return "Rate limit exceeded. Please wait a moment and try again.";
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
}

export default ChatService;
