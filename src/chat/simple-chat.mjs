import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { GoogleGenerativeAI } from "@google/generative-ai";
import chalk from "chalk";
import ora from "ora";
import fs from "fs-extra";
import readlineSync from "readline-sync";
import SearchService from "../utils/search-service.mjs";
import FilesystemService from "../filesystem/filesystem-service.mjs";
import TerminalService from "../terminal/terminal-service.mjs";
import ConfigManager from "../config/config-manager.mjs";

class SimpleChat {
  constructor() {
    this.configManager = new ConfigManager();
  }

  async initialize() {
    const apiKey = await this.configManager.getApiKey("gemini");
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY not found in configuration. Run 'sage setup' to configure API keys."
      );
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
    });
    this.conversationHistory = [];
    this.sessionId = new Date().toISOString().replace(/[:.]/g, "-");
    this.conversationsDir = path.join(__dirname, "../conversations");
    this.searchService = new SearchService();
    this.filesystemService = new FilesystemService();
    this.terminalService = new TerminalService();
    this.saveInProgress = false; // Prevent concurrent saves
    this.signalHandlersRegistered = false; // Track signal handler registration

    this.setupSystemPrompt();
    await this.ensureConversationsDir();
  }

  setupSystemPrompt() {
    const systemPrompt = `You are Sage, an intelligent AI assistant. You are helpful, creative, and conversational.

Key traits:
- Be friendly and personable
- Provide clear, helpful responses
- Ask follow-up questions when appropriate
- Remember context from our conversation
- Be concise but thorough

You can help with:
- Generating code (especially Express.js mock servers)
- Answering questions with real-time web search when needed
- Reading, writing, and managing files across the system (with security restrictions)
- Exploring directory structures and project files
- Executing safe terminal commands and system operations
- Problem solving
- Creative tasks
- Technical discussions
- General conversation

When provided with search results, incorporate them naturally into your responses and cite sources when relevant.
When asked to generate code, provide clean, working examples with explanations.
When working with files, always respect system security boundaries and explain what you're doing.
When executing terminal commands, only run safe operations and explain the output clearly.`;

    this.conversationHistory.push({
      role: "user",
      parts: [{ text: systemPrompt }],
    });
  }

  async ensureConversationsDir() {
    await fs.ensureDir(this.conversationsDir);
  }

  async saveConversation() {
    // Prevent concurrent saves
    if (this.saveInProgress) {
      if (process.env.DEBUG) {
        console.log(chalk.gray("Debug: Save already in progress, skipping..."));
      }
      return;
    }

    try {
      this.saveInProgress = true;
      const conversationPath = path.join(
        this.conversationsDir,
        `session-${this.sessionId}.json`
      );
      const conversationData = {
        sessionId: this.sessionId,
        startTime: this.sessionId,
        lastMessage: new Date().toISOString(),
        messages: this.conversationHistory.slice(1),
      };
      await fs.writeJson(conversationPath, conversationData, { spaces: 2 });
    } finally {
      this.saveInProgress = false;
    }
  }

  displayBanner() {
    console.log(
      chalk.magenta(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║       Welcome to Sage Chat - Your AI Conversation Partner    ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`)
    );
    console.log(
      chalk.cyan(
        'Start chatting! Type "exit" to quit, "menu" for main menu, "help" for commands, or press Ctrl+C.\n'
      )
    );
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

  displayHelp() {
    console.log(
      chalk.yellow(`
Sage Chat Commands:
  help          Show this help message
  clear         Clear conversation history
  history       Show conversation history
  save          Save current conversation
  export        Export conversation to file
  fsinfo        Show filesystem access information
  terminfo      Show terminal command information
  menu          Return to main menu
  exit          Exit Sage Chat (or press Ctrl+C)

Tips:
  - Just type naturally to chat with Sage
  - Ask for code generation, explanations, or general help
  - Ask to read/write files: "show me package.json" or "list files in /home"
  - Web search: "search for latest React features"
  - Terminal commands: "ping google.com" or "check system info"
  - Sage remembers context from your conversation
  - Use "clear" to start fresh if conversation gets too long
`)
    );
  }

  async handleCommand(input) {
    const command = input.trim().toLowerCase();

    switch (command) {
      case "help":
        this.displayHelp();
        return true;

      case "clear":
        this.conversationHistory = [this.conversationHistory[0]];
        console.log(chalk.green("Conversation history cleared!"));
        return true;

      case "history":
        this.displayConversationHistory();
        return true;

      case "save":
        await this.saveConversation();
        console.log(
          chalk.green(`Conversation saved! Session ID: ${this.sessionId}`)
        );
        return true;

      case "export":
        await this.exportConversation();
        return true;

      case "exit":
        await this.saveConversation();
        console.log(
          chalk.magenta(
            "\nThanks for chatting with Sage! Your conversation has been saved."
          )
        );
        return "exit";

      case "menu":
        await this.saveConversation();
        console.log(
          chalk.cyan(
            "\nReturning to main menu... Your conversation has been saved."
          )
        );
        return "menu";

      case "fsinfo": {
        const fsInfo = this.filesystemService.getSafePathsInfo();
        console.log(fsInfo.message);
        return true;
      }

      case "terminfo": {
        const termInfo = TerminalService.getSafeCommandsInfo();
        console.log(termInfo.message);
        return true;
      }

      default:
        return false;
    }
  }

  displayConversationHistory() {
    console.log(
      chalk.cyan(
        `\nConversation History (${this.conversationHistory.length - 1} messages):\n`
      )
    );

    this.conversationHistory.slice(1).forEach((message, index) => {
      const role = message.role === "user" ? "You" : "Sage";

      // Safely access message parts with bounds checking
      let content = "[No content]";
      if (message.parts && message.parts.length > 0 && message.parts[0].text) {
        content =
          message.parts[0].text.substring(0, 100) +
          (message.parts[0].text.length > 100 ? "..." : "");
      }

      const timestamp = message.timestamp
        ? new Date(message.timestamp).toLocaleTimeString()
        : "";

      console.log(
        chalk.gray(`${index + 1}.`),
        chalk.white(role),
        chalk.gray(timestamp)
      );
      console.log(chalk.gray(`   ${content}\n`));
    });
  }

  async exportConversation() {
    const exportData = {
      sessionId: this.sessionId,
      exportTime: new Date().toISOString(),
      messages: this.conversationHistory.slice(1).map(msg => ({
        role: msg.role === "user" ? "You" : "Sage",
        content: msg.parts[0].text,
        timestamp: msg.timestamp || "Unknown",
      })),
    };

    const exportPath = path.join(
      process.cwd(),
      `sage-chat-${this.sessionId}.json`
    );
    await fs.writeJson(exportPath, exportData, { spaces: 2 });
    console.log(chalk.green(`Conversation exported to: ${exportPath}`));
  }

  async sendMessage(userInput) {
    this.conversationHistory.push({
      role: "user",
      parts: [{ text: userInput }],
      timestamp: new Date().toISOString(),
    });

    let finalInput = userInput;
    let searchResults = null;
    let fileResults = null;
    let terminalResults = null;

    if (FilesystemService.detectFileIntent(userInput)) {
      const fileOp = FilesystemService.extractFileOperation(userInput);

      try {
        if (fileOp.operation === "read") {
          const pathMatch = userInput.match(
            /["']([^"']+)["']|([\w/.-]+\.\w+)|([\w/.-]+)/g
          );
          if (pathMatch) {
            const filePath = pathMatch.find(
              p => p.includes("/") || p.includes(".")
            );
            if (filePath) {
              fileResults = await this.filesystemService.readFile(
                filePath.replace(/["']/g, "")
              );
              const formattedResults =
                FilesystemService.formatFileResult(fileResults);
              console.log(formattedResults);

              finalInput = `${userInput}\n\nHere is the file content from "${fileResults.path}":\n${fileResults.content.map(c => c.text || c).join("\n")}\n\nPlease analyze this file content and provide insights.`;
            }
          }
        } else if (fileOp.operation === "list") {
          const pathMatch = userInput.match(/["']([^"']+)["']|([\w/.-]+)/g);
          let dirPath = ".";
          if (pathMatch) {
            const foundPath = pathMatch.find(
              p => p.includes("/") || p === "." || p === ".."
            );
            if (foundPath) {
              dirPath = foundPath.replace(/["']/g, "");
            }
          }

          fileResults = await this.filesystemService.listDirectory(dirPath);
          const formattedResults =
            FilesystemService.formatDirectoryResult(fileResults);
          console.log(formattedResults);

          finalInput = `${userInput}\n\nHere are the contents of directory "${fileResults.path}":\n${fileResults.contents.map(c => c.text || c.name || c).join("\n")}\n\nPlease describe the directory structure and provide insights.`;
        }
      } catch (error) {
        console.log(chalk.red(`Filesystem operation failed: ${error.message}`));
        finalInput = `${userInput}\n\nNote: Filesystem operation failed - ${error.message}`;
      }
    } else if (TerminalService.detectTerminalIntent(userInput)) {
      const command = TerminalService.extractCommand(userInput);

      if (command) {
        try {
          if (!this.terminalService.isConnected) {
            await this.terminalService.connect();
          }

          terminalResults = await this.terminalService.executeCommand(command);
          const formattedResults =
            TerminalService.formatCommandResult(terminalResults);
          console.log(formattedResults);

          finalInput = `${userInput}\n\nHere is the terminal command result:\n${JSON.stringify(terminalResults, null, 2)}\n\nPlease analyze this command output and provide insights.`;
        } catch (error) {
          console.log(chalk.red(`Terminal command failed: ${error.message}`));
          finalInput = `${userInput}\n\nNote: Terminal command failed - ${error.message}`;
        }
      }
    } else if (SearchService.detectSearchIntent(userInput)) {
      const searchQuery = SearchService.extractSearchQuery(userInput);

      try {
        searchResults = await this.searchService.search(searchQuery);

        const formattedResults =
          SearchService.formatSearchResults(searchResults);
        console.log(formattedResults);

        finalInput = `${userInput}

Here are current search results for "${searchQuery}":
${searchResults.results.map(r => r.text || JSON.stringify(r)).join("\n")}

Please provide a comprehensive answer based on this information.`;
      } catch (error) {
        console.log(
          chalk.yellow(
            `Search failed: ${error.message}. Proceeding without search results.`
          )
        );
      }
    }

    const spinner = ora({
      text: chalk.blue("Sage is thinking..."),
      spinner: "dots12",
    }).start();

    try {
      const cleanHistory = this.conversationHistory.slice(0, -1).map(msg => ({
        role: msg.role,
        parts: msg.parts,
      }));

      const chat = this.model.startChat({
        history: cleanHistory,
      });

      const result = await chat.sendMessage(finalInput);
      const response = result.response;
      const reply = response.text();

      spinner.stop();

      this.conversationHistory.push({
        role: "model",
        parts: [{ text: reply }],
        timestamp: new Date().toISOString(),
        searchUsed: !!searchResults,
        filesystemUsed: !!fileResults,
        terminalUsed: !!terminalResults,
      });

      const formattedReply = this.formatMarkdownForTerminal(reply);
      console.log(chalk.magenta("Sage:"), formattedReply);
      console.log();

      return reply;
    } catch (error) {
      spinner.stop();

      if (
        error.message.includes("overloaded") ||
        error.message.includes("503")
      ) {
        console.error(
          chalk.yellow(
            "The AI service is currently busy. Please try again in a few moments."
          )
        );
      } else if (
        error.message.includes("API_KEY") ||
        error.message.includes("401")
      ) {
        console.error(
          chalk.red(
            "API key issue. Please check your GEMINI_API_KEY configuration."
          )
        );
      } else if (
        error.message.includes("fetch failed") ||
        error.message.includes("network")
      ) {
        console.error(
          chalk.red(
            "Something went wrong with the connection. Please try again later."
          )
        );
      } else if (error.message.includes("GoogleGenerativeAI Error")) {
        console.error(
          chalk.red("Something went wrong. Please try again later.")
        );
      } else {
        console.error(
          chalk.red("Something unexpected happened. Please try again later.")
        );
      }

      return null;
    }
  }

  async sendSingleMessage(userInput) {
    try {
      this.conversationHistory.push({
        role: "user",
        parts: [{ text: userInput }],
        timestamp: new Date().toISOString(),
      });

      let finalInput = userInput;
      let searchResults = null;
      let fileResults = null;
      let terminalResults = null;

      if (FilesystemService.detectFileIntent(userInput)) {
        const fileOp = FilesystemService.extractFileOperation(userInput);
        try {
          fileResults = await this.filesystemService.performOperation(fileOp);
          const formattedResults =
            FilesystemService.formatFileResults(fileResults);
          console.log(formattedResults);
          finalInput = `${userInput}\n\nFile content:\n${fileResults}`;
        } catch (error) {
          console.log(chalk.yellow(`File operation failed: ${error.message}`));
        }
      } else if (SearchService.detectSearchIntent(userInput)) {
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
      } else if (TerminalService.detectTerminalIntent(userInput)) {
        const terminalCommand = TerminalService.extractCommand(userInput);
        try {
          terminalResults =
            await this.terminalService.executeCommand(terminalCommand);
          const formattedResults =
            TerminalService.formatTerminalResults(terminalResults);
          console.log(formattedResults);
          finalInput = `${userInput}\n\nTerminal output:\n${terminalResults}`;
        } catch (error) {
          console.log(
            chalk.yellow(`Terminal command failed: ${error.message}`)
          );
        }
      }

      const spinner = ora({
        text: chalk.blue("Sage is thinking..."),
        spinner: "dots12",
      }).start();

      const cleanHistory = this.conversationHistory.map(msg => ({
        role: msg.role,
        parts: msg.parts,
      }));

      const chat = this.model.startChat({
        history: cleanHistory,
      });

      const result = await chat.sendMessage(finalInput);
      const response = result.response;
      const reply = response.text();

      spinner.stop();

      this.conversationHistory.push({
        role: "model",
        parts: [{ text: reply }],
        timestamp: new Date().toISOString(),
        searchUsed: !!searchResults,
        filesystemUsed: !!fileResults,
        terminalUsed: !!terminalResults,
      });

      const formattedReply = this.formatMarkdownForTerminal(reply);
      console.log(formattedReply);

      return reply;
    } catch (error) {
      if (spinner && spinner.isSpinning) {
        spinner.stop();
      }
      console.log(chalk.red("Error:"), error.message);
      throw error;
    }
  }

  async startChat() {
    this.displayBanner();

    let isExiting = false;

    const gracefulExit = async () => {
      if (isExiting) return;
      isExiting = true;

      console.log(chalk.yellow("\n\nSaving conversation before exit..."));
      try {
        await this.saveConversation();
        await this.searchService.disconnect();
        await this.filesystemService.disconnect();
        await this.terminalService.disconnect();
        console.log(
          chalk.magenta(
            "Thanks for chatting with Sage! Your conversation has been saved."
          )
        );
      } catch (error) {
        console.log(chalk.red("Error saving conversation:", error.message));
      }
      process.exit(0);
    };

    // Register signal handlers only once to prevent duplicate handlers
    if (!this.signalHandlersRegistered) {
      process.on("SIGINT", gracefulExit);
      process.on("SIGTERM", gracefulExit);
      this.signalHandlersRegistered = true;
    }

    let continueChat = true;
    while (continueChat) {
      try {
        const input = readlineSync.question(chalk.cyan("You: "), {
          mask: false,
          hideEchoBack: false,
        });

        if (!input.trim()) {
          continue;
        }

        const commandResult = await this.handleCommand(input);
        if (commandResult === "exit") {
          await gracefulExit();
          continueChat = false;
          break;
        } else if (commandResult === "menu") {
          await this.saveConversation();
          await this.searchService.disconnect();
          await this.filesystemService.disconnect();
          await this.terminalService.disconnect();
          return "menu";
        } else if (commandResult === true) {
          continue;
        }

        await this.sendMessage(input);

        if (this.conversationHistory.length % 10 === 0) {
          await this.saveConversation();
        }
      } catch (error) {
        if (
          error.message.includes("canceled") ||
          error.message.includes("SIGINT")
        ) {
          await gracefulExit();
          break;
        } else {
          console.error(chalk.red("Error:"), error.message);
        }
      }
    }
  }
}

export default SimpleChat;
