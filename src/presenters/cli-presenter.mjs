import chalk from "chalk";
import ora from "ora";
import { confirmAction } from "../utils/prompt-utils.mjs";

/**
 * CLIPresenter - Handles all CLI-specific formatting and output
 * Uses chalk, ora, and console.log to present data to the user
 */
class CLIPresenter {
  constructor() {
    this.spinner = null;
  }

  /**
   * Show a thinking spinner with random message
   */
  showThinking() {
    const thinkingMessages = [
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

    const randomMessage =
      thinkingMessages[Math.floor(Math.random() * thinkingMessages.length)];

    this.spinner = ora({
      text: chalk.blue(randomMessage),
      spinner: "dots12",
      isEnabled: process.stdout.isTTY,
      discardStdin: false,
    }).start();
  }

  /**
   * Show processing spinner
   */
  showProcessing() {
    if (this.spinner && this.spinner.isSpinning) {
      this.spinner.stop();
    }

    this.spinner = ora({
      text: chalk.blue("Processing results..."),
      spinner: "dots12",
      isEnabled: process.stdout.isTTY,
      discardStdin: false,
    }).start();
  }

  /**
   * Stop any active spinner
   */
  stopSpinner() {
    if (this.spinner && this.spinner.isSpinning) {
      this.spinner.stop();
    }
  }

  /**
   * Show search start notification
   */
  showSearchStart(query) {
    console.log(chalk.cyan(`\nSearching for: "${query}"...\n`));
  }

  /**
   * Show function call (debug mode)
   */
  showFunctionCall(functionName) {
    if (process.env.DEBUG) {
      console.log(chalk.blue(`\nFunction called: ${functionName}`));
    }
  }

  /**
   * Show file search results
   */
  showFileSearchResults(pattern, result) {
    console.log(chalk.gray(`Searching for: ${pattern}`));

    if (result.success && result.files.length > 0) {
      console.log(chalk.green(`Found ${result.files.length} file(s):`));
      result.files.forEach(file => console.log(chalk.gray(`  - ${file}`)));
      console.log();
    } else if (result.success && result.files.length === 0) {
      console.log(chalk.yellow(`No files found matching: ${pattern}`));
      console.log();
    }
  }

  /**
   * Show memory store request (debug mode)
   */
  showMemoryStore(content, category) {
    if (process.env.DEBUG) {
      console.log(chalk.blue("\nMemory Store Request"));
      console.log(chalk.gray(`Content: ${content}`));
      console.log(chalk.gray(`Category: ${category}`));
    }
  }

  /**
   * Show memory store success (debug mode)
   */
  showMemoryStoreSuccess() {
    if (process.env.DEBUG) {
      console.log(chalk.green("Memory stored successfully"));
      console.log();
    }
  }

  /**
   * Show memory recall request (debug mode)
   */
  showMemoryRecall(query, memories) {
    if (process.env.DEBUG) {
      console.log(chalk.blue("\nMemory Recall Request"));
      console.log(chalk.gray(`Query: ${query}`));

      if (memories.length > 0) {
        console.log(chalk.green(`Found ${memories.length} relevant memories`));
        console.log();
      } else {
        console.log(chalk.yellow("No relevant memories found"));
        console.log();
      }
    }
  }

  /**
   * Show file read confirmation dialog
   */
  async confirmFileRead(filePath, reason) {
    console.log(chalk.blue("\nFile Read Request"));
    console.log(chalk.gray(`File: ${filePath}`));
    console.log(chalk.gray(`Reason: ${reason}`));

    const { confirmed, cancelled } = await confirmAction(
      "Allow Sage to read this file?",
      "read_file",
      filePath
    );

    return { confirmed, cancelled };
  }

  /**
   * Show file read success
   */
  showFileReadSuccess(filePath, content) {
    console.log(chalk.green("File read successfully"));

    // Show preview
    const lines = content.split("\n");
    const previewLines = lines.slice(0, 20);
    console.log(chalk.gray("\nPreview:"));
    console.log(chalk.gray("─".repeat(60)));
    previewLines.forEach((line, i) => {
      console.log(chalk.gray(`${i + 1}:`) + " " + chalk.white(line));
    });
    if (lines.length > 20) {
      console.log(chalk.gray(`... (${lines.length - 20} more lines)`));
    }
    console.log(chalk.gray("─".repeat(60)));
    console.log();
  }

  /**
   * Show file write confirmation dialog
   */
  async confirmFileWrite(filePath, content, reason) {
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

    const { confirmed, cancelled } = await confirmAction(
      "Allow Sage to write to this file?",
      "write_file",
      filePath
    );

    return { confirmed, cancelled };
  }

  /**
   * Show file write success
   */
  showFileWriteSuccess(path) {
    console.log(chalk.green(`File written successfully to ${path}`));
    console.log();
  }

  /**
   * Show error message
   */
  showError(message, details = null) {
    console.log(chalk.red("Error:"), message);

    if (details && process.env.DEBUG) {
      console.log(chalk.gray(`Debug: ${details}`));
    }
  }

  /**
   * Format markdown text for terminal display
   */
  formatMarkdownForTerminal(text) {
    let formatted = text;

    // Bold text
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, (_match, content) => {
      return chalk.bold.white(content);
    });

    // Bullet points
    formatted = formatted.replace(/^\* (.*)/gm, (_match, content) => {
      return `  ${chalk.cyan("•")} ${chalk.white(content)}`;
    });

    // Numbered lists
    formatted = formatted.replace(/^\d+\.\s+(.*)/gm, (_match, content) => {
      return `  ${chalk.cyan("•")} ${chalk.white(content)}`;
    });

    // Bold headers
    formatted = formatted.replace(/^\*\*(.*?):\*\*/gm, (_match, content) => {
      return `\n${chalk.bold.cyan(content + ":")}`;
    });

    // Inline code
    formatted = formatted.replace(/`([^`]+)`/g, (_match, code) => {
      return chalk.yellow.bgBlack(` ${code} `);
    });

    // Code blocks
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

  /**
   * Show the assistant's response
   */
  showResponse(reply) {
    const formattedReply = this.formatMarkdownForTerminal(reply);
    console.log(chalk.green("•"), formattedReply);
  }

  /**
   * Show response with model info (for fallback)
   */
  showResponseWithModel(reply, model) {
    const formattedReply = this.formatMarkdownForTerminal(reply);

    if (process.env.DEBUG) {
      console.log(chalk.green("•"), chalk.gray(`[${model}]`), formattedReply);
    } else {
      console.log(chalk.green("•"), formattedReply);
    }
  }

  /**
   * Show fallback notification (debug mode)
   */
  showFallback() {
    if (process.env.DEBUG) {
      console.log(
        chalk.gray(
          "Debug: Gemini rate limit hit. Falling back to OpenRouter..."
        )
      );
    }
  }

  /**
   * Show conversation resume header
   */
  showResumeHeader(conversationId, conversation) {
    console.log(chalk.cyan(`Resuming conversation: ${conversationId}`));
    console.log(
      chalk.gray(
        `Started: ${new Date(conversation.startedAt).toLocaleString()}`
      )
    );
    console.log(chalk.gray(`Messages: ${conversation.messages.length}\n`));
  }

  /**
   * Show previous conversation messages
   */
  showPreviousMessages(messages) {
    if (messages.length === 0) return;

    console.log(chalk.bold.white("Previous conversation:"));
    console.log(chalk.gray("─".repeat(60)));

    for (const msg of messages) {
      const time = new Date(msg.timestamp).toLocaleTimeString();

      if (msg.role === "user") {
        console.log(chalk.bold.blue(`\n> You (${time}):`));
        console.log(chalk.white(msg.content));
      } else if (msg.role === "model") {
        console.log(chalk.bold.green(`\n> Sage (${time}):`));
        console.log(chalk.white(msg.content));
      }
    }

    console.log("\n" + chalk.gray("─".repeat(60)));
    console.log(chalk.green("You can continue the conversation below:\n"));
  }
}

export default CLIPresenter;
