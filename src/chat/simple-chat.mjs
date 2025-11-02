import { GoogleGenerativeAI } from "@google/generative-ai";
import chalk from "chalk";
import ora from "ora";
import SearchService from "../utils/search-service.mjs";
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
    this.searchService = new SearchService();

    this.setupSystemPrompt();
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
- Generating code
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

  async sendSingleMessage(userInput) {
    let spinner = null;
    try {
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

      const result = await chat.sendMessage(finalInput);
      const response = result.response;
      const reply = response.text();

      spinner.stop();

      this.conversationHistory.push({
        role: "model",
        parts: [{ text: reply }],
        timestamp: new Date().toISOString(),
        searchUsed: !!searchResults,
      });

      const formattedReply = this.formatMarkdownForTerminal(reply);
      console.log(chalk.green("●"), formattedReply);

      return reply;
    } catch (error) {
      if (spinner && spinner.isSpinning) {
        spinner.stop();
      }
      console.log(chalk.red("Error:"), error.message);
      throw error;
    }
  }
}

export default SimpleChat;
