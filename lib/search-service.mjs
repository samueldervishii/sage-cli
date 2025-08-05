import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import chalk from "chalk";
import ora from "ora";

class SearchService {
  constructor() {
    this.client = null;
    this.transport = null;
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected) {
      return true;
    }

    // Check if Serper API key is configured
    if (
      !process.env.SERPER_API_KEY ||
      process.env.SERPER_API_KEY === "your_serper_api_key_here"
    ) {
      console.log(
        chalk.yellow(
          "⚠️  Serper API key not configured. Web search functionality will be disabled."
        )
      );
      console.log(chalk.gray("To enable search:"));
      console.log(
        chalk.gray("1. Get a free API key from https://serper.dev/api-key")
      );
      console.log(
        chalk.gray("2. Add SERPER_API_KEY=your_key_here to your .env file")
      );
      return false;
    }

    const spinner = ora("Connecting to search service...").start();

    try {
      // Create transport for the Serper search MCP server
      this.transport = new StdioClientTransport({
        command: "npx",
        args: ["-y", "serper-search-scrape-mcp-server"],
        env: {
          ...process.env,
          SERPER_API_KEY: process.env.SERPER_API_KEY,
        },
      });

      // Create MCP client
      this.client = new Client({
        name: "sophia-search-client",
        version: "1.0.0",
      });

      // Connect to the server
      await this.client.connect(this.transport);
      this.isConnected = true;

      spinner.succeed("Connected to search service");
      return true;
    } catch (error) {
      spinner.fail("Failed to connect to search service");
      console.error(chalk.red("Search service error:"), error.message);
      if (error.message.includes("SERPER_API_KEY")) {
        console.log(
          chalk.yellow(
            "Make sure your SERPER_API_KEY is valid in the .env file"
          )
        );
      }
      return false;
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      try {
        await this.client.close();
        this.isConnected = false;
      } catch (error) {
        console.error(
          chalk.red("Error disconnecting search service:"),
          error.message
        );
      }
    }
  }

  async search(query, options = {}) {
    if (!this.isConnected) {
      const connected = await this.connect();
      if (!connected) {
        throw new Error("Failed to connect to search service");
      }
    }

    const spinner = ora(`Searching for: ${query}`).start();

    try {
      // List available tools to understand what's available
      const tools = await this.client.listTools();

      // Find the search tool - try common names
      let searchTool = tools.tools.find(
        tool =>
          tool.name === "search" ||
          tool.name === "web_search" ||
          tool.name === "google_search" ||
          tool.name === "serper_search"
      );

      // If not found, use the first available tool
      if (!searchTool && tools.tools.length > 0) {
        searchTool = tools.tools[0];
      }

      if (!searchTool) {
        throw new Error("No search tool found in MCP server");
      }

      // Call the search tool with proper arguments
      const result = await this.client.callTool({
        name: searchTool.name,
        arguments: {
          q: query,
          gl: options.region || "us",
          hl: options.language || "en",
          num: options.numResults || 10,
          ...options,
        },
      });

      spinner.succeed(`Found search results for: ${query}`);

      return {
        query: query,
        results: result.content || [],
        tool_used: searchTool.name,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      spinner.fail(`Search failed: ${error.message}`);
      console.error(chalk.red("Full error:"), error);
      throw error;
    }
  }

  // Helper method to detect if a message contains search intent
  static detectSearchIntent(message) {
    const searchKeywords = [
      "search online",
      "search for",
      "look up",
      "find information about",
      "what is",
      "tell me about",
      "latest news",
      "current",
      "recent",
      "today",
      "search",
      "wikipedia",
      "google",
      "bing",
    ];

    const lowerMessage = message.toLowerCase();
    return searchKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  // Helper method to extract search query from natural language
  static extractSearchQuery(message) {
    const lowerMessage = message.toLowerCase();

    // Remove common prefixes
    const prefixes = [
      "search for ",
      "look up ",
      "find information about ",
      "tell me about ",
      "what is ",
      "what are ",
      "who is ",
      "where is ",
      "when is ",
      "how to ",
    ];

    let cleanQuery = message;
    for (const prefix of prefixes) {
      if (lowerMessage.startsWith(prefix)) {
        cleanQuery = message.substring(prefix.length);
        break;
      }
    }

    // Remove question marks and clean up
    cleanQuery = cleanQuery.replace(/[?!]/g, "").trim();

    return cleanQuery;
  }

  // Format search results for display
  static formatSearchResults(searchResponse) {
    if (
      !searchResponse ||
      !searchResponse.results ||
      searchResponse.results.length === 0
    ) {
      return "No search results found.";
    }

    let formatted = `\n${chalk.cyan("🔍 Search Results:")} ${chalk.gray(searchResponse.query)}\n\n`;

    searchResponse.results.forEach((result, index) => {
      if (result.type === "text" && result.text) {
        // Try to parse structured data if it looks like JSON
        try {
          const parsed = JSON.parse(result.text);
          if (Array.isArray(parsed)) {
            parsed.forEach((item, i) => {
              if (item.title && item.snippet) {
                formatted += `${chalk.blue(`${i + 1}.`)} ${chalk.bold(item.title)}\n`;
                formatted += `   ${item.snippet}\n`;
                if (item.link) {
                  formatted += `   ${chalk.gray(item.link)}\n`;
                }
                formatted += "\n";
              }
            });
          } else if (parsed.title && parsed.snippet) {
            formatted += `${chalk.blue(`${index + 1}.`)} ${chalk.bold(parsed.title)}\n`;
            formatted += `   ${parsed.snippet}\n`;
            if (parsed.link) {
              formatted += `   ${chalk.gray(parsed.link)}\n`;
            }
            formatted += "\n";
          }
        } catch (e) {
          // Not JSON, treat as plain text
          const lines = result.text.split("\n");
          lines.forEach(line => {
            if (line.trim()) {
              formatted += `${chalk.blue("•")} ${line.trim()}\n`;
            }
          });
        }
      } else if (typeof result === "object") {
        // Handle objects directly
        if (result.title && result.snippet) {
          formatted += `${chalk.blue(`${index + 1}.`)} ${chalk.bold(result.title)}\n`;
          formatted += `   ${result.snippet}\n`;
          if (result.link) {
            formatted += `   ${chalk.gray(result.link)}\n`;
          }
          formatted += "\n";
        } else {
          formatted += `${chalk.blue("•")} ${JSON.stringify(result, null, 2)}\n`;
        }
      }
    });

    formatted += `${chalk.gray("---")}\n`;
    return formatted;
  }
}

export default SearchService;
