import chalk from "chalk";
import ChatService from "../services/chat-service.mjs";
import CLIPresenter from "../presenters/cli-presenter.mjs";
import FileOperations from "../utils/file-operations.mjs";

/**
 * SimpleChat - CLI wrapper around ChatService
 * Maintains backward compatibility with existing CLI code
 */
class SimpleChat {
  constructor() {
    this.chatService = new ChatService();
    this.presenter = new CLIPresenter();
    this.fileOps = new FileOperations();
  }

  async initialize(conversationId = null) {
    const result = await this.chatService.initialize(conversationId);

    if (result.resumed) {
      // Show resume header
      this.presenter.showResumeHeader(
        result.conversationId,
        result.conversation
      );

      // Display previous messages
      if (result.conversation.messages.length > 0) {
        this.presenter.showPreviousMessages(result.conversation.messages);
      }
    }

    return result;
  }

  async sendSingleMessage(userInput) {
    try {
      // Set up callbacks for UI updates
      const callbacks = {
        onSearchStart: query => {
          this.presenter.showSearchStart(query);
        },
        onThinking: () => {
          this.presenter.showThinking();
        },
        onFunctionCall: name => {
          this.presenter.showFunctionCall(name);
        },
        onProcessing: () => {
          this.presenter.showProcessing();
        },
        onFallback: () => {
          this.presenter.showFallback();
        },
        onSearchFiles: ({ pattern, result }) => {
          this.presenter.showFileSearchResults(pattern, result);
        },
        onMemoryStore: ({ content, category }) => {
          this.presenter.showMemoryStore(content, category);
          // Show success after storing
          setTimeout(() => this.presenter.showMemoryStoreSuccess(), 100);
        },
        onMemoryRecall: ({ query, memories }) => {
          this.presenter.showMemoryRecall(query, memories);
        },
        onFileRead: async ({ filePath, reason }) => {
          // Stop spinner for user interaction
          this.presenter.stopSpinner();

          // Ask for confirmation
          const { confirmed, cancelled } = await this.presenter.confirmFileRead(
            filePath,
            reason
          );

          if (cancelled || !confirmed) {
            return {
              success: false,
              error: cancelled
                ? "Operation cancelled by user"
                : "User chose to continue with normal chat instead",
            };
          }

          // Read the file
          const result = await this.fileOps.readFile(filePath);

          if (result.success) {
            this.presenter.showFileReadSuccess(filePath, result.content);
          } else {
            this.presenter.showError(result.error);
          }

          return result;
        },
        onFileWrite: async ({ filePath, content, reason }) => {
          // Stop spinner for user interaction
          this.presenter.stopSpinner();

          // Ask for confirmation
          const { confirmed, cancelled } =
            await this.presenter.confirmFileWrite(filePath, content, reason);

          if (cancelled || !confirmed) {
            return {
              success: false,
              error: cancelled
                ? "Operation cancelled by user"
                : "User chose to continue with normal chat instead",
            };
          }

          // Write the file
          const result = await this.fileOps.writeFile(filePath, content);

          if (result.success) {
            this.presenter.showFileWriteSuccess(result.path);
          } else {
            this.presenter.showError(result.error);
          }

          return result;
        },
        onError: error => {
          if (error.type === "search") {
            console.log(chalk.yellow(`Search failed: ${error.message}`));
          }
        },
      };

      // Send message through service
      const response = await this.chatService.sendMessage(userInput, callbacks);

      // Stop any active spinner
      this.presenter.stopSpinner();

      if (response.success) {
        // Show the response
        if (response.fallback && response.model) {
          this.presenter.showResponseWithModel(response.reply, response.model);
        } else {
          this.presenter.showResponse(response.reply);
        }

        return response.reply;
      } else {
        // Show error
        this.presenter.showError(response.error.message, response.error.raw);

        // Show additional help for API key issues
        if (
          response.error.raw.includes("GEMINI_API_KEY") ||
          response.error.raw.includes("API key")
        ) {
          console.log(
            chalk.yellow("Run 'sage setup' to configure your API keys")
          );
        }

        throw new Error(response.error.message);
      }
    } catch (error) {
      this.presenter.stopSpinner();
      throw error;
    }
  }

  // Backward compatibility methods (if needed)
  formatMarkdownForTerminal(text) {
    return this.presenter.formatMarkdownForTerminal(text);
  }

  parseError(error) {
    return this.chatService._parseError(error);
  }
}

export default SimpleChat;
