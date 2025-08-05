import { GoogleGenerativeAI } from "@google/generative-ai";
import chalk from "chalk";
import ora from "ora";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import readline from "readline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SophiaChat {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    this.conversationHistory = [];
    this.sessionId = new Date().toISOString().replace(/[:.]/g, "-");
    this.conversationsDir = path.join(__dirname, "../conversations");
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.cyan("You: "),
    });

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
- Use emojis occasionally but not excessively

You can help with:
- Generating code (especially Express.js mock servers)
- Answering questions
- Problem solving
- Creative tasks
- Technical discussions
- General conversation

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
      messages: this.conversationHistory.slice(1), // Remove system prompt from saved history
    };
    await fs.writeJson(conversationPath, conversationData, { spaces: 2 });
  }

  async loadConversation(sessionId) {
    const conversationPath = path.join(
      this.conversationsDir,
      `session-${sessionId}.json`
    );
    if (await fs.pathExists(conversationPath)) {
      const data = await fs.readJson(conversationPath);
      this.conversationHistory = [
        this.conversationHistory[0],
        ...data.messages,
      ]; // Keep system prompt, add history
      this.sessionId = sessionId;
      console.log(
        chalk.green(
          `Loaded conversation from ${new Date(
            data.startTime
          ).toLocaleString()}`
        )
      );
    }
  }

  async listConversations() {
    const files = await fs.readdir(this.conversationsDir).catch(() => []);
    const conversations = [];

    for (const file of files) {
      if (file.startsWith("session-") && file.endsWith(".json")) {
        const data = await fs.readJson(path.join(this.conversationsDir, file));
        conversations.push({
          sessionId: data.sessionId,
          startTime: new Date(data.startTime).toLocaleString(),
          lastMessage: new Date(data.lastMessage).toLocaleString(),
          messageCount: data.messages.length,
        });
      }
    }

    return conversations.sort(
      (a, b) => new Date(b.lastMessage) - new Date(a.lastMessage)
    );
  }

  displayBanner() {
    console.log(
      chalk.magenta(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   Welcome to Sophia Chat - Your AI Conversation Partner        ║
║                      Created by Samuel                       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`)
    );
    console.log(
      chalk.cyan("Start chatting! Type /help for commands, /exit to quit.\n")
    );
  }

  displayHelp() {
    console.log(
      chalk.yellow(`
Sophia Chat Commands:
  /help          Show this help message
  /clear         Clear conversation history
  /history       Show conversation history
  /save          Save current conversation
  /load <id>     Load a previous conversation
  /list          List all saved conversations
  /export        Export conversation to file
  /exit          Exit Sophia Chat

Tips:
  - Just type naturally to chat with Sophia
  - Ask for code generation, explanations, or general help
  - Sophia remembers context from your conversation
  - Use /clear to start fresh if conversation gets too long
`)
    );
  }

  async handleCommand(input) {
    const [command, ...args] = input.trim().split(" ");

    switch (command) {
      case "/help":
        this.displayHelp();
        return true;

      case "/clear":
        this.conversationHistory = [this.conversationHistory[0]]; // Keep only system prompt
        console.log(chalk.green("Conversation history cleared!"));
        return true;

      case "/history":
        this.displayConversationHistory();
        return true;

      case "/save":
        await this.saveConversation();
        console.log(
          chalk.green(`Conversation saved! Session ID: ${this.sessionId}`)
        );
        return true;

      case "/load":
        if (args.length === 0) {
          console.log(
            chalk.red(
              "Please provide a session ID. Use /list to see available sessions."
            )
          );
        } else {
          await this.loadConversation(args[0]);
        }
        return true;

      case "/list":
        await this.displaySavedConversations();
        return true;

      case "/export":
        await this.exportConversation();
        return true;

      case "/exit":
        await this.saveConversation();
        console.log(
          chalk.magenta(
            "\nThanks for chatting with Sophia! Your conversation has been saved."
          )
        );
        process.exit(0);

      default:
        return false; // Not a command
    }
  }

  displayConversationHistory() {
    console.log(
      chalk.cyan(
        `\nConversation History (${
          this.conversationHistory.length - 1
        } messages):\n`
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

  async displaySavedConversations() {
    const conversations = await this.listConversations();

    if (conversations.length === 0) {
      console.log(chalk.yellow("No saved conversations found."));
      return;
    }

    console.log(
      chalk.cyan(`\nSaved Conversations (${conversations.length}):\n`)
    );

    conversations.forEach((conv, index) => {
      console.log(chalk.white(`${index + 1}. Session: ${conv.sessionId}`));
      console.log(chalk.gray(`   Started: ${conv.startTime}`));
      console.log(chalk.gray(`   Last message: ${conv.lastMessage}`));
      console.log(chalk.gray(`   Messages: ${conv.messageCount}\n`));
    });

    console.log(chalk.gray("Use /load <session-id> to load a conversation"));
  }

  async exportConversation() {
    const exportData = {
      sessionId: this.sessionId,
      exportTime: new Date().toISOString(),
      messages: this.conversationHistory.slice(1).map((msg) => ({
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
    // Add user message to history
    this.conversationHistory.push({
      role: "user",
      parts: [{ text: userInput }],
      timestamp: new Date().toISOString(),
    });

    const spinner = ora({
      text: chalk.blue("Sophia is thinking..."),
      spinner: "dots12",
    }).start();

    try {
      // Create chat session with history
      const chat = this.model.startChat({
        history: this.conversationHistory.slice(0, -1), // Don't include the message we just added
      });

      // Send message and get response
      const result = await chat.sendMessage(userInput);
      const response = await result.response;
      const reply = response.text();

      spinner.stop();

      // Add assistant response to history
      this.conversationHistory.push({
        role: "model",
        parts: [{ text: reply }],
        timestamp: new Date().toISOString(),
      });

      // Display response with nice formatting
      console.log(chalk.magenta("Sophia:"), chalk.white(reply));
      console.log(); // Add spacing

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

    this.rl.prompt();

    this.rl.on("line", async (input) => {
      const trimmedInput = input.trim();

      if (!trimmedInput) {
        this.rl.prompt();
        return;
      }

      // Handle commands
      if (trimmedInput.startsWith("/")) {
        const isCommand = await this.handleCommand(trimmedInput);
        if (isCommand) {
          this.rl.prompt();
          return;
        }
      }

      // Send message to Sophia
      await this.sendMessage(trimmedInput);

      // Auto-save every few messages
      if (this.conversationHistory.length % 10 === 0) {
        await this.saveConversation();
      }

      this.rl.prompt();
    });

    this.rl.on("close", async () => {
      await this.saveConversation();
      console.log(
        chalk.magenta(
          "\nThanks for chatting with Sophia! Your conversation has been saved."
        )
      );
      process.exit(0);
    });

    // Handle Ctrl+C gracefully
    process.on("SIGINT", async () => {
      console.log(chalk.yellow("\n\nSaving conversation before exit..."));
      await this.saveConversation();
      console.log(
        chalk.magenta(
          "Thanks for chatting with Sophia! Your conversation has been saved."
        )
      );
      process.exit(0);
    });
  }
}

export default SophiaChat;
