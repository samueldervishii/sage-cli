// Load environment variables from .env
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '../.env') });

import { GoogleGenerativeAI } from "@google/generative-ai";
import chalk from "chalk";
import ora from "ora";
import fs from "fs-extra";
import readlineSync from "readline-sync";

class SimpleChat {
  constructor() {
    // Debug API key
    const apiKey = process.env.GEMINI_API_KEY;
    
    console.log(chalk.gray(`Environment check:`));
    console.log(chalk.gray(`- Current working directory: ${process.cwd()}`));
    console.log(chalk.gray(`- GEMINI_API_KEY exists: ${!!apiKey}`));
    console.log(chalk.gray(`- API key length: ${apiKey ? apiKey.length : 0}`));
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found in environment variables. Check your .env file.');
    }
    
    if (apiKey === 'your_actual_gemini_api_key_here') {
      throw new Error('Please replace "your_actual_gemini_api_key_here" with your real Gemini API key in .env file');
    }
    
    console.log(chalk.gray(`Using API key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`));
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    this.conversationHistory = [];
    this.sessionId = new Date().toISOString().replace(/[:.]/g, "-");
    this.conversationsDir = path.join(__dirname, "../conversations");
    
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
- Answering questions
- Problem solving
- Creative tasks
- Technical discussions
- General conversation

When asked to generate code, provide clean, working examples with explanations.`;

    this.conversationHistory.push({
      role: "user",
      parts: [{ text: systemPrompt }]
    });
  }

  async ensureConversationsDir() {
    await fs.ensureDir(this.conversationsDir);
  }

  async saveConversation() {
    const conversationPath = path.join(this.conversationsDir, `session-${this.sessionId}.json`);
    const conversationData = {
      sessionId: this.sessionId,
      startTime: this.sessionId,
      lastMessage: new Date().toISOString(),
      messages: this.conversationHistory.slice(1)
    };
    await fs.writeJson(conversationPath, conversationData, { spaces: 2 });
  }

  displayBanner() {
    console.log(chalk.magenta(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   Welcome to Sophia Chat - Your AI Conversation Partner     ║
║                      Created by Samuel                       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`));
    console.log(chalk.cyan('Start chatting! Type "exit" to quit, "help" for commands, or press Ctrl+C.\n'));
  }

  displayHelp() {
    console.log(chalk.yellow(`
Sophia Chat Commands:
  help          Show this help message
  clear         Clear conversation history
  history       Show conversation history
  save          Save current conversation
  export        Export conversation to file
  exit          Exit Sophia Chat (or press Ctrl+C)

Tips:
  - Just type naturally to chat with Sophia
  - Ask for code generation, explanations, or general help
  - Sophia remembers context from your conversation
  - Use "clear" to start fresh if conversation gets too long
`));
  }

  handleCommand(input) {
    const command = input.trim().toLowerCase();
    
    switch (command) {
      case 'help':
        this.displayHelp();
        return true;
        
      case 'clear':
        this.conversationHistory = [this.conversationHistory[0]]; // Keep only system prompt
        console.log(chalk.green('Conversation history cleared!'));
        return true;
        
      case 'history':
        this.displayConversationHistory();
        return true;
        
      case 'save':
        this.saveConversation();
        console.log(chalk.green(`Conversation saved! Session ID: ${this.sessionId}`));
        return true;
        
      case 'export':
        this.exportConversation();
        return true;
        
      case 'exit':
        this.saveConversation();
        console.log(chalk.magenta('\nThanks for chatting with Sophia! Your conversation has been saved.'));
        return 'exit';
        
      default:
        return false; // Not a command
    }
  }

  displayConversationHistory() {
    console.log(chalk.cyan(`\nConversation History (${this.conversationHistory.length - 1} messages):\n`));
    
    this.conversationHistory.slice(1).forEach((message, index) => {
      const role = message.role === 'user' ? 'You' : 'Sophia';
      const content = message.parts[0].text.substring(0, 100) + (message.parts[0].text.length > 100 ? '...' : '');
      const timestamp = message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : '';
      
      console.log(chalk.gray(`${index + 1}.`), chalk.white(role), chalk.gray(timestamp));
      console.log(chalk.gray(`   ${content}\n`));
    });
  }

  async exportConversation() {
    const exportData = {
      sessionId: this.sessionId,
      exportTime: new Date().toISOString(),
      messages: this.conversationHistory.slice(1).map(msg => ({
        role: msg.role === 'user' ? 'You' : 'Sophia',
        content: msg.parts[0].text,
        timestamp: msg.timestamp || 'Unknown'
      }))
    };
    
    const exportPath = path.join(process.cwd(), `sophia-chat-${this.sessionId}.json`);
    await fs.writeJson(exportPath, exportData, { spaces: 2 });
    console.log(chalk.green(`Conversation exported to: ${exportPath}`));
  }

  async sendMessage(userInput) {
    // Add user message to history (with timestamp for our records, but clean for API)
    this.conversationHistory.push({
      role: "user",
      parts: [{ text: userInput }],
      timestamp: new Date().toISOString()
    });

    const spinner = ora({
      text: chalk.blue('Sophia is thinking...'),
      spinner: 'dots12'
    }).start();

    try {
      // Clean history for API (remove timestamps and other non-standard fields)
      const cleanHistory = this.conversationHistory.slice(0, -1).map(msg => ({
        role: msg.role,
        parts: msg.parts
      }));

      // Create chat session with clean history
      const chat = this.model.startChat({
        history: cleanHistory
      });

      // Send message and get response
      const result = await chat.sendMessage(userInput);
      const response = await result.response;
      const reply = response.text();

      spinner.stop();

      // Add assistant response to history (with timestamp for our records)
      this.conversationHistory.push({
        role: "model",
        parts: [{ text: reply }],
        timestamp: new Date().toISOString()
      });

      // Display response with nice formatting
      console.log(chalk.magenta('Sophia:'), chalk.white(reply));
      console.log(); // Add spacing

      return reply;
    } catch (error) {
      spinner.stop();
      console.error(chalk.red('Error:'), error.message);
      
      if (error.message.includes('API_KEY')) {
        console.error(chalk.red('Please make sure your GEMINI_API_KEY is set in your .env file'));
      }
      
      return null;
    }
  }

  async startChat() {
    this.displayBanner();
    
    // Set up Ctrl+C handling
    let isExiting = false;
    
    const gracefulExit = async () => {
      if (isExiting) return;
      isExiting = true;
      
      console.log(chalk.yellow('\n\nSaving conversation before exit...'));
      try {
        await this.saveConversation();
        console.log(chalk.magenta('Thanks for chatting with Sophia! Your conversation has been saved.'));
      } catch (error) {
        console.log(chalk.red('Error saving conversation:', error.message));
      }
      process.exit(0);
    };
    
    // Handle Ctrl+C
    process.on('SIGINT', gracefulExit);
    process.on('SIGTERM', gracefulExit);
    
    while (true) {
      try {
        const input = readlineSync.question(chalk.cyan('You: '), {
          // This allows Ctrl+C to be caught
          mask: false,
          hideEchoBack: false
        });
        
        if (!input.trim()) {
          continue;
        }
        
        // Handle commands
        const commandResult = this.handleCommand(input);
        if (commandResult === 'exit') {
          await gracefulExit();
          break;
        } else if (commandResult === true) {
          continue;
        }
        
        // Send message to Sophia
        await this.sendMessage(input);
        
        // Auto-save every few messages
        if (this.conversationHistory.length % 10 === 0) {
          await this.saveConversation();
        }
        
      } catch (error) {
        if (error.message.includes('canceled') || error.message.includes('SIGINT')) {
          await gracefulExit();
          break;
        } else {
          console.error(chalk.red('Error:'), error.message);
        }
      }
    }
  }
}

export default SimpleChat;