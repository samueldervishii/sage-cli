import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

import { GoogleGenerativeAI } from "@google/generative-ai";
import chalk from "chalk";
import ora from "ora";
import fs from "fs-extra";
import readlineSync from "readline-sync";
import SearchService from "./search-service.mjs";

class SimpleChat {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY not found in environment variables. Check your .env file."
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

    this.setupSystemPrompt();
    this.ensureConversationsDir();
  }

  setupSystemPrompt() {
    const systemPrompt = `You are Sophia, an intelligent AI assistant created by Samuel. You are helpful, creative, and conversational.

Key traits:
- Be friendly and personable
- Provide clear, helpful responses
- Ask follow-up questions when appropriate
- Remember context from our conversation
- Be concise but thorough

You can help with:
- Generating code (especially Express.js mock servers)
- Answering questions with real-time web search when needed
- Problem solving
- Creative tasks
- Technical discussions
- General conversation

When provided with search results, incorporate them naturally into your responses and cite sources when relevant.
When asked to generate code, provide clean, working examples with explanations.`;

    this.conversationHistory.push({
      role: "user",
      parts: [{ text: systemPrompt }],
    });
  }

  async ensureConversationsDir() {
    await fs.ensureDir(this.conversationsDir);
  }

  async saveConversation() {
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
  }

  displayBanner() {
    console.log(
      chalk.magenta(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   Welcome to Sophia Chat - Your AI Conversation Partner     ║
║                      Created by Samuel                       ║
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

  displayHelp() {
    console.log(
      chalk.yellow(`
Sophia Chat Commands:
  help          Show this help message
  clear         Clear conversation history
  history       Show conversation history
  save          Save current conversation
  export        Export conversation to file
  menu          Return to main menu
  exit          Exit Sophia Chat (or press Ctrl+C)

Tips:
  - Just type naturally to chat with Sophia
  - Ask for code generation, explanations, or general help
  - Sophia remembers context from your conversation
  - Use "clear" to start fresh if conversation gets too long
`)
    );
  }

  handleCommand(input) {
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
        this.saveConversation();
        console.log(
          chalk.green(`Conversation saved! Session ID: ${this.sessionId}`)
        );
        return true;

      case "export":
        this.exportConversation();
        return true;

      case "exit":
        this.saveConversation();
        console.log(
          chalk.magenta(
            "\nThanks for chatting with Sophia! Your conversation has been saved."
          )
        );
        return "exit";
        
      case "menu":
        this.saveConversation();
        console.log(
          chalk.cyan(
            "\nReturning to main menu... Your conversation has been saved."
          )
        );
        return "menu";

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
      const role = message.role === "user" ? "You" : "Sophia";
      const content =
        message.parts[0].text.substring(0, 100) +
        (message.parts[0].text.length > 100 ? "..." : "");
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
        role: msg.role === "user" ? "You" : "Sophia",
        content: msg.parts[0].text,
        timestamp: msg.timestamp || "Unknown",
      })),
    };

    const exportPath = path.join(
      process.cwd(),
      `sophia-chat-${this.sessionId}.json`
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

    if (SearchService.detectSearchIntent(userInput)) {
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
      text: chalk.blue("Sophia is thinking..."),
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
      const response = await result.response;
      const reply = response.text();

      spinner.stop();

      this.conversationHistory.push({
        role: "model",
        parts: [{ text: reply }],
        timestamp: new Date().toISOString(),
        searchUsed: !!searchResults,
      });

      console.log(chalk.magenta("Sophia:"), chalk.white(reply));
      console.log();

      return reply;
    } catch (error) {
      spinner.stop();
      console.error(chalk.red("Error:"), error.message);

      if (error.message.includes("API_KEY")) {
        console.error(
          chalk.red(
            "Please make sure your GEMINI_API_KEY is set in your .env file"
          )
        );
      }

      return null;
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
        console.log(
          chalk.magenta(
            "Thanks for chatting with Sophia! Your conversation has been saved."
          )
        );
      } catch (error) {
        console.log(chalk.red("Error saving conversation:", error.message));
      }
      process.exit(0);
    };

    process.on("SIGINT", gracefulExit);
    process.on("SIGTERM", gracefulExit);

    while (true) {
      try {
        const input = readlineSync.question(chalk.cyan("You: "), {
          mask: false,
          hideEchoBack: false,
        });

        if (!input.trim()) {
          continue;
        }

        const commandResult = this.handleCommand(input);
        if (commandResult === "exit") {
          await gracefulExit();
          break;
        } else if (commandResult === "menu") {
          // Return to main menu without exiting process
          await this.saveConversation();
          await this.searchService.disconnect();
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
