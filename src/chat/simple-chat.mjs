import { GoogleGenerativeAI } from "@google/generative-ai";
import chalk from "chalk";
import ora from "ora";
import SearchService from "../utils/search-service.mjs";
import ConfigManager from "../config/config-manager.mjs";
import FileOperations from "../utils/file-operations.mjs";
import ConversationHistory from "../utils/conversation-history.mjs";
import MemoryManager from "../utils/memory-manager.mjs";
import OpenRouterClient from "../utils/openrouter-client.mjs";
import { confirmAction } from "../utils/prompt-utils.mjs";

class SimpleChat {
  constructor() {
    this.configManager = new ConfigManager();
    this.fileOps = new FileOperations();
    this.history = new ConversationHistory();
    this.memory = new MemoryManager();
    this.openrouterClient = null;
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
    const tools = [
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

    // Build system instruction
    const currentDir = process.cwd();
    const systemInstruction = `You are Sage, an intelligent AI assistant. You are helpful, creative, and conversational.

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

    // Get model from config (allows user to customize via .env or config)
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
      try {
        const existingConversation =
          await this.history.loadConversation(conversationId);
        this.history.currentConversationId = conversationId;
        this.history.currentConversation = existingConversation;

        // Display resuming header
        console.log(chalk.cyan(`Resuming conversation: ${conversationId}`));
        console.log(
          chalk.gray(
            `Started: ${new Date(existingConversation.startedAt).toLocaleString()}`
          )
        );
        console.log(
          chalk.gray(`Messages: ${existingConversation.messages.length}\n`)
        );

        // Display previous messages
        if (existingConversation.messages.length > 0) {
          console.log(chalk.bold.white("Previous conversation:"));
          console.log(chalk.gray("─".repeat(60)));

          for (const msg of existingConversation.messages) {
            const time = new Date(msg.timestamp).toLocaleTimeString();

            if (msg.role === "user") {
              console.log(chalk.bold.blue(`\n> You (${time}):`));
              console.log(chalk.white(msg.content));
            } else if (msg.role === "model") {
              console.log(chalk.bold.green(`\n> Sage (${time}):`));
              console.log(chalk.white(msg.content));
            }

            // Load messages into conversation history for Gemini
            this.conversationHistory.push({
              role: msg.role,
              parts: [{ text: msg.content }],
              timestamp: msg.timestamp,
            });
          }

          console.log("\n" + chalk.gray("─".repeat(60)));
          console.log(
            chalk.green("You can continue the conversation below:\n")
          );
        }
      } catch (error) {
        console.log(
          chalk.yellow(
            `Warning: Could not load conversation ${conversationId}, starting new one`
          )
        );
        console.log(chalk.gray(`Error: ${error.message}\n`));
        await this.history.startNewConversation();
      }
    } else {
      await this.history.startNewConversation();
    }
  }

  formatMarkdownForTerminal(text) {
    let formatted = text;

    formatted = formatted.replace(/\*\*(.*?)\*\*/g, (_match, content) => {
      return chalk.bold.white(content);
    });

    formatted = formatted.replace(/^\* (.*)/gm, (_match, content) => {
      return `  ${chalk.cyan("•")} ${chalk.white(content)}`;
    });

    formatted = formatted.replace(/^\d+\.\s+(.*)/gm, (_match, content) => {
      return `  ${chalk.cyan("•")} ${chalk.white(content)}`;
    });

    formatted = formatted.replace(/^\*\*(.*?):\*\*/gm, (_match, content) => {
      return `\n${chalk.bold.cyan(content + ":")}`;
    });

    formatted = formatted.replace(/`([^`]+)`/g, (_match, code) => {
      return chalk.yellow.bgBlack(` ${code} `);
    });

    formatted = formatted.replace(
      /```(\w+)?\n([\s\S]*?)```/g,
      (_match, _lang, code) => {
        const lines = code.trim().split("\n");
        const formattedLines = lines.map(
          line => `  ${chalk.gray("│")} ${chalk.yellow(line)}`
        );
        return `\n${chalk.gray("┌─ Code:")}\n${formattedLines.join("\n")}\n${chalk.gray("└─")}`;
      }
    );

    return formatted;
  }

  parseError(error) {
    const errorMsg = error.message || String(error);

    // Check for rate limiting (429)
    if (
      errorMsg.includes("429") ||
      errorMsg.includes("Too Many Requests") ||
      errorMsg.includes("Resource exhausted")
    ) {
      return "Rate limit exceeded. Please wait a moment and try again.";
    }

    // Check for API key issues
    if (
      errorMsg.includes("API key") ||
      errorMsg.includes("401") ||
      errorMsg.includes("403")
    ) {
      return "API authentication failed. Please check your API key configuration.";
    }

    // Check for network issues
    if (
      errorMsg.includes("ECONNREFUSED") ||
      errorMsg.includes("ENOTFOUND") ||
      errorMsg.includes("network")
    ) {
      return "Network error. Please check your internet connection.";
    }

    // Check for quota/billing issues
    if (errorMsg.includes("quota") || errorMsg.includes("billing")) {
      return "API quota exceeded. Please check your account limits.";
    }

    // Generic API error
    if (errorMsg.includes("GoogleGenerativeAI Error")) {
      return "The AI service is currently unavailable. Please try again later.";
    }

    // Default fallback
    return "Something went wrong. Please try again.";
  }

  /**
   * Handle file read operation
   */
  async handleReadFile(filePath, reason) {
    console.log(chalk.blue("\nFile Read Request"));
    console.log(chalk.gray(`File: ${filePath}`));
    console.log(chalk.gray(`Reason: ${reason}`));

    // Ask for confirmation
    const { confirmed, cancelled } = await confirmAction(
      "Allow Sage to read this file?",
      "read_file",
      filePath
    );

    if (cancelled) {
      return {
        success: false,
        error: "Operation cancelled by user",
      };
    }

    if (!confirmed) {
      return {
        success: false,
        error: "User chose to continue with normal chat instead",
      };
    }

    // Read the file
    const result = await this.fileOps.readFile(filePath);

    if (result.success) {
      console.log(chalk.green("File read successfully"));
      // Show preview
      const preview = this.fileOps.formatFilePreview(
        filePath,
        result.content,
        20
      );
      console.log(preview);
      console.log();
    } else {
      console.log(chalk.red(`${result.error}`));
    }

    return result;
  }

  /**
   * Handle file write operation
   */
  async handleWriteFile(filePath, content, reason) {
    console.log(chalk.blue("\nFile Write Request"));
    console.log(chalk.gray(`File: ${filePath}`));
    console.log(chalk.gray(`Reason: ${reason}`));
    console.log(chalk.gray(`Content length: ${content.length} characters`));

    // Show content preview
    const lines = content.split("\n");
    console.log(chalk.gray("\nContent preview:"));
    const preview = lines.slice(0, 10).join("\n");
    console.log(chalk.yellow(preview));
    if (lines.length > 10) {
      console.log(chalk.gray(`... (${lines.length - 10} more lines)`));
    }

    // Ask for confirmation
    const { confirmed, cancelled } = await confirmAction(
      "Allow Sage to write to this file?",
      "write_file",
      filePath
    );

    if (cancelled) {
      return {
        success: false,
        error: "Operation cancelled by user",
      };
    }

    if (!confirmed) {
      return {
        success: false,
        error: "User chose to continue with normal chat instead",
      };
    }

    // Write the file
    const result = await this.fileOps.writeFile(filePath, content);

    if (result.success) {
      console.log(chalk.green(`File written successfully to ${result.path}`));
      console.log();
    } else {
      console.log(chalk.red(`${result.error}`));
    }

    return result;
  }

  /**
   * Handle remember info operation
   */
  async handleRememberInfo(content, category) {
    if (process.env.DEBUG) {
      console.log(chalk.blue("\nMemory Store Request"));
      console.log(chalk.gray(`Content: ${content}`));
      console.log(chalk.gray(`Category: ${category}`));
    }

    const result = await this.memory.remember(content, category);

    if (process.env.DEBUG) {
      if (result.success) {
        console.log(chalk.green("Memory stored successfully"));
        console.log();
      } else {
        console.log(chalk.red(`${result.message}`));
      }
    }

    return {
      success: result.success,
      message: result.message,
    };
  }

  /**
   * Handle recall info operation
   */
  async handleRecallInfo(query) {
    if (process.env.DEBUG) {
      console.log(chalk.blue("\nMemory Recall Request"));
      console.log(chalk.gray(`Query: ${query}`));
    }

    const memories = await this.memory.searchMemories(query);

    if (process.env.DEBUG) {
      if (memories.length > 0) {
        console.log(chalk.green(`Found ${memories.length} relevant memories`));
        console.log();
      } else {
        console.log(chalk.yellow("No relevant memories found"));
        console.log();
      }
    }

    return {
      success: true,
      memoriesFound: memories.length,
      memories: memories.map(m => ({
        content: m.content,
        category: m.category,
        timestamp: m.timestamp,
      })),
    };
  }

  async sendSingleMessage(userInput) {
    let spinner = null;
    try {
      this.conversationHistory.push({
        role: "user",
        parts: [{ text: userInput }],
        timestamp: new Date().toISOString(),
      });

      // Save user message to history
      await this.history.addMessage("user", userInput);

      let finalInput = userInput;
      let searchResults = null;

      if (SearchService.detectSearchIntent(userInput)) {
        const searchQuery = SearchService.extractSearchQuery(userInput);
        try {
          searchResults = await this.searchService.search(searchQuery);
          const formattedResults =
            SearchService.formatSearchResults(searchResults);
          console.log(formattedResults);
          finalInput = `${userInput}\nHere are current search results for "${searchQuery}":\n${searchResults.results.map(r => r.text || JSON.stringify(r)).join("\n")}\nPlease provide a comprehensive answer based on this information.`;
        } catch (error) {
          console.log(chalk.yellow(`Search failed: ${error.message}`));
        }
      }

      // Random thinking messages
      const singleThinkingMessages = [
        "Sage is thinking...",
        "Analyzing your request...",
        "Processing with AI...",
        "Consulting the wisdom...",
        "Crafting a response...",
        "Gathering thoughts...",
        "Computing answer...",
        "Pondering deeply...",
        "Working on it...",
        "AI neurons firing...",
        "Brewing intelligence...",
        "Summoning knowledge...",
      ];

      const singleRandomMessage =
        singleThinkingMessages[
          Math.floor(Math.random() * singleThinkingMessages.length)
        ];

      spinner = ora({
        text: chalk.blue(singleRandomMessage),
        spinner: "dots12",
        isEnabled: process.stdout.isTTY,
        discardStdin: false, // keeps readline open
      }).start();
      const cleanHistory = this.conversationHistory.map(msg => ({
        role: msg.role,
        parts: msg.parts,
      }));

      const chat = this.model.startChat({
        history: cleanHistory,
      });

      let result = await chat.sendMessage(finalInput);
      let response = result.response;

      spinner.stop();

      // Check if the response contains function calls
      const functionCalls = response.functionCalls();

      if (functionCalls && functionCalls.length > 0) {
        // Handle function calls
        const functionResponses = [];

        for (const call of functionCalls) {
          if (process.env.DEBUG) {
            console.log(chalk.blue(`\nFunction called: ${call.name}`));
          }

          // Validate function call structure
          if (!call.name || !call.args || typeof call.args !== "object") {
            if (process.env.DEBUG) {
              console.log(
                chalk.yellow("Warning: Malformed function call, skipping")
              );
            }
            continue;
          }

          let functionResult;

          if (call.name === "remember_info") {
            const { content, category } = call.args;
            const result = await this.handleRememberInfo(content, category);
            functionResult = {
              name: call.name,
              response: result,
            };
          } else if (call.name === "recall_info") {
            const { query } = call.args;
            const result = await this.handleRecallInfo(query);
            functionResult = {
              name: call.name,
              response: result,
            };
          } else if (call.name === "search_files") {
            const { pattern } = call.args;
            console.log(chalk.gray(`Searching for: ${pattern}`));

            const result = await this.fileOps.searchFiles(pattern);

            if (result.success && result.files.length > 0) {
              console.log(chalk.green(`Found ${result.files.length} file(s):`));
              result.files.forEach(file =>
                console.log(chalk.gray(`  - ${file}`))
              );
              console.log();
            } else if (result.success && result.files.length === 0) {
              console.log(chalk.yellow(`No files found matching: ${pattern}`));
              console.log();
            }

            functionResult = {
              name: call.name,
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
          } else if (call.name === "read_file") {
            const { file_path, reason } = call.args;
            const result = await this.handleReadFile(file_path, reason);

            functionResult = {
              name: call.name,
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
          } else if (call.name === "write_file") {
            const { file_path, content, reason } = call.args;
            const result = await this.handleWriteFile(
              file_path,
              content,
              reason
            );

            functionResult = {
              name: call.name,
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

          functionResponses.push(functionResult);
        }

        // Send function results back to the model
        spinner = ora({
          text: chalk.blue("Processing results..."),
          spinner: "dots12",
          isEnabled: process.stdout.isTTY,
          discardStdin: false,
        }).start();

        // Send all function responses back to the model
        const functionResponseMessages = functionResponses.map(fr => ({
          functionResponse: {
            name: fr.name,
            response: fr.response,
          },
        }));

        result = await chat.sendMessage(functionResponseMessages);

        response = result.response;
        spinner.stop();
      }

      const reply = response.text();

      // Track function calls if any
      const functionCallNames = functionCalls
        ? functionCalls.map(fc => fc.name)
        : [];

      this.conversationHistory.push({
        role: "model",
        parts: [{ text: reply }],
        timestamp: new Date().toISOString(),
        searchUsed: !!searchResults,
      });

      // Save model response to history with metadata
      await this.history.addMessage("model", reply, {
        searchUsed: !!searchResults,
        functionCalls:
          functionCallNames.length > 0 ? functionCallNames : undefined,
      });

      const formattedReply = this.formatMarkdownForTerminal(reply);
      console.log(chalk.green("•"), formattedReply);

      return reply;
    } catch (error) {
      if (spinner && spinner.isSpinning) {
        spinner.stop();
      }

      // Check if this is a rate limit error and we have OpenRouter fallback
      const errorMsg = error.message || String(error);
      const isRateLimit =
        errorMsg.includes("429") ||
        errorMsg.includes("Too Many Requests") ||
        errorMsg.includes("Resource exhausted");

      if (isRateLimit && this.openrouterClient) {
        // Silent fallback - only show in debug mode
        if (process.env.DEBUG) {
          console.log(
            chalk.gray(
              "Debug: Gemini rate limit hit. Falling back to OpenRouter..."
            )
          );
        }

        // Try with OpenRouter
        try {
          const openrouterMessages = this.openrouterClient.convertGeminiHistory(
            this.conversationHistory
          );

          // Load user memories to include in context (since OpenRouter doesn't support function calling)
          const contextMemories = this.memory.getContextMemories(10);
          const memoryContext = this.memory.formatForContext(contextMemories);

          // Add system message with context including memories
          const systemMessage = {
            role: "system",
            content: `You are Sage, an intelligent AI assistant. Current directory: ${process.cwd()}. Be helpful, creative, and conversational.

${memoryContext}`,
          };
          openrouterMessages.unshift(systemMessage);

          // Use same spinner style as Gemini for consistency
          const spinner2 = ora("Sage is thinking...").start();
          let response;
          try {
            response =
              await this.openrouterClient.chatCompletion(openrouterMessages);
          } finally {
            spinner2.stop();
          }

          if (response && response.success) {
            const reply = response.content;

            // Add to conversation history
            this.conversationHistory.push({
              role: "model",
              parts: [{ text: reply }],
              timestamp: new Date().toISOString(),
            });

            // Save to history
            await this.history.addMessage("model", reply, {
              fallback: true,
              model: response.model,
            });

            const formattedReply = this.formatMarkdownForTerminal(reply);

            // Show model info only in debug mode
            if (process.env.DEBUG) {
              console.log(
                chalk.green("•"),
                chalk.gray(`[${response.model}]`),
                formattedReply
              );
            } else {
              console.log(chalk.green("•"), formattedReply);
            }

            return reply;
          } else {
            if (process.env.DEBUG) {
              console.log(
                chalk.gray("Debug: OpenRouter fallback failed:"),
                response.error
              );
            }
          }
        } catch (fallbackError) {
          if (process.env.DEBUG) {
            console.log(
              chalk.gray("Debug: OpenRouter fallback error:"),
              fallbackError.message
            );
          }
        }
      }

      // Parse error and show user-friendly message
      const errorMessage = this.parseError(error);
      console.log(chalk.red("Error:"), errorMessage);

      // Show full error in debug mode
      if (process.env.DEBUG) {
        console.log(chalk.gray(`Debug: ${error.message}`));
        if (error.stack) {
          console.log(chalk.gray(`Stack: ${error.stack}`));
        }
      }

      throw error;
    }
  }
}

export default SimpleChat;
