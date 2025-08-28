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

    if (!process.env.SERPER_API_KEY) {
      console.log(
        chalk.yellow(
          "Serper API key not configured. Web search functionality will be disabled."
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
      this.transport = new StdioClientTransport({
        command: "npx",
        args: ["-y", "serper-search-scrape-mcp-server"],
        env: {
          ...process.env,
          SERPER_API_KEY: process.env.SERPER_API_KEY,
        },
      });

      this.client = new Client({
        name: "sage-search-client",
        version: "0.0.7-beta",
      });

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
      const tools = await this.client.listTools();

      let searchTool = tools.tools.find(
        tool =>
          tool.name === "search" ||
          tool.name === "web_search" ||
          tool.name === "google_search" ||
          tool.name === "serper_search"
      );

      if (!searchTool && tools.tools.length > 0) {
        searchTool = tools.tools[0];
      }

      if (!searchTool) {
        throw new Error("No search tool found in MCP server");
      }

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

  static detectSearchIntent(message) {
    const lowerMessage = message.toLowerCase();

    const explicitSearchPatterns = [
      /search\s+(online\s+)?for\s+/,
      /look\s+up\s+.+\s+online/,
      /find\s+information\s+about\s+/,
      /search\s+the\s+web\s+for/,
      /google\s+search\s+for/,
      /web\s+search\s+for/,
      /^search\s+/,
      /latest\s+news\s+about\s+/,
      /current\s+events\s+about/,
      /recent\s+developments\s+in/,
      /what's\s+happening\s+with\s+/,
      /what\s+is\s+the\s+latest\s+/,
      /tell\s+me\s+about\s+.+\s+(news|updates|developments)/,
    ];

    return explicitSearchPatterns.some(pattern => pattern.test(lowerMessage));
  }

  static extractSearchQuery(message) {
    const lowerMessage = message.toLowerCase();

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

    cleanQuery = cleanQuery.replace(/[?!]/g, "").trim();

    return cleanQuery;
  }

  static formatSearchResults(searchResponse) {
    if (
      !searchResponse ||
      !searchResponse.results ||
      searchResponse.results.length === 0
    ) {
      return "No search results found.";
    }

    let formatted = `\n${chalk.cyan("Search Results:")} ${chalk.gray(searchResponse.query)}\n\n`;

    searchResponse.results.forEach((result, index) => {
      if (result.type === "text" && result.text) {
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
          const lines = result.text.split("\n");
          lines.forEach(line => {
            if (line.trim()) {
              formatted += `${chalk.blue("•")} ${line.trim()}\n`;
            }
          });
        }
      } else if (typeof result === "object") {
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
