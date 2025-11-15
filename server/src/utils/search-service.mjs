import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
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

    // Check for Tavily API key first (preferred)
    const hasTavily = !!process.env.TAVILY_API_KEY;
    const hasSerper = !!process.env.SERPER_API_KEY;

    if (!hasTavily && !hasSerper) {
      console.log(
        "No search API key configured. Web search functionality will be disabled."
      );
      console.log("To enable search, choose one:");
      console.log(
        "Option 1 (Recommended): Get Tavily API key from https://tavily.com"
      );
      console.log("  Add TAVILY_API_KEY=your_key_here to your .env file");
      console.log(
        "Option 2: Get Serper API key from https://serper.dev/api-key"
      );
      console.log("  Add SERPER_API_KEY=your_key_here to your .env file");
      return false;
    }

    if (process.env.DEBUG) {
      console.log("[Search] Connecting to search service...");
    }

    try {
      // Try Tavily first if available
      if (hasTavily) {
        this.transport = new StdioClientTransport({
          command: "npx",
          args: ["-y", "@modelcontextprotocol/server-tavily"],
          env: {
            ...process.env,
            TAVILY_API_KEY: process.env.TAVILY_API_KEY,
          },
        });
        this.searchProvider = "tavily";
      } else {
        // Fall back to Serper
        this.transport = new StdioClientTransport({
          command: "npx",
          args: ["-y", "serper-search-scrape-mcp-server"],
          env: {
            ...process.env,
            SERPER_API_KEY: process.env.SERPER_API_KEY,
          },
        });
        this.searchProvider = "serper";
      }

      this.client = new Client({
        name: "sage-search-client",
        version: "1.0.0",
      });

      await this.client.connect(this.transport);
      this.isConnected = true;

      if (process.env.DEBUG) {
        console.log(
          `[Search] Connected to search service (${this.searchProvider})`
        );
      }
      return true;
    } catch (error) {
      console.error("[Search] Failed to connect to search service");
      console.error("Search service error:", error.message);
      if (hasTavily) {
        console.log("Make sure your TAVILY_API_KEY is valid in the .env file");
      } else if (hasSerper) {
        console.log("Make sure your SERPER_API_KEY is valid in the .env file");
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
        console.error("Error disconnecting search service:", error.message);
      }
    }
  }

  /**
   * Validate search query input
   * @param {string} query - Search query to validate
   * @returns {{valid: boolean, error?: string}}
   */
  validateSearchQuery(query) {
    // Check if query is provided
    if (!query || typeof query !== "string") {
      return {
        valid: false,
        error: "Search query must be a non-empty string",
      };
    }

    // Trim whitespace
    query = query.trim();

    // Check minimum length
    if (query.length < 2) {
      return {
        valid: false,
        error: "Search query must be at least 2 characters long",
      };
    }

    // Check maximum length (reasonable limit for search queries)
    if (query.length > 500) {
      return {
        valid: false,
        error: "Search query is too long (max 500 characters)",
      };
    }

    // Check for suspicious patterns that might indicate injection attempts
    const suspiciousPatterns = [
      /[<>]/, // HTML/XML tags
      /javascript:/i, // JavaScript protocol
      /on\w+=/i, // Event handlers
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(query)) {
        return {
          valid: false,
          error: "Search query contains invalid characters",
        };
      }
    }

    return {
      valid: true,
      query: query, // Return sanitized query
    };
  }

  async search(query, options = {}) {
    // Validate search query
    const validation = this.validateSearchQuery(query);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Use sanitized query
    query = validation.query;

    if (!this.isConnected) {
      const connected = await this.connect();
      if (!connected) {
        throw new Error("Failed to connect to search service");
      }
    }

    if (process.env.DEBUG) {
      console.log(`[Search] Searching for: ${query}`);
    }

    try {
      const tools = await this.client.listTools();

      // Look for search tool - supports both Tavily and Serper
      let searchTool = tools.tools.find(
        tool =>
          tool.name === "search" ||
          tool.name === "tavily_search" ||
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

      // Build arguments based on provider
      let searchArgs = {};
      if (this.searchProvider === "tavily") {
        searchArgs = {
          query: query,
          max_results: options.numResults || 5,
          ...options,
        };
      } else {
        // Serper format
        searchArgs = {
          q: query,
          gl: options.region || "us",
          hl: options.language || "en",
          num: options.numResults || 10,
          ...options,
        };
      }

      const result = await this.client.callTool({
        name: searchTool.name,
        arguments: searchArgs,
      });

      if (process.env.DEBUG) {
        console.log(`[Search] Found search results for: ${query}`);
      }

      return {
        query: query,
        results: result.content || [],
        tool_used: searchTool.name,
        provider: this.searchProvider,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`[Search] Search failed: ${error.message}`);
      console.error("Full error:", error);
      throw error;
    }
  }

  static detectSearchIntent(message) {
    const lowerMessage = message.toLowerCase();

    const explicitSearchPatterns = [
      /search\s+(online\s+)?(for|about)\s+/,
      /look\s+up\s+.+\s+online/,
      /find\s+information\s+(about|on|for)\s+/,
      /search\s+the\s+web\s+(for|about)/,
      /google\s+search\s+(for|about)/,
      /web\s+search\s+(for|about)/,
      /^search\s+/,
      /latest\s+news\s+(about|on)\s+/,
      /current\s+events\s+(about|on)/,
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
      "search online for ",
      "search online about ",
      "search for ",
      "search about ",
      "look up ",
      "find information about ",
      "find information on ",
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

    let formatted = `\n${"Search Results:"} ${searchResponse.query}\n\n`;

    searchResponse.results.forEach((result, index) => {
      if (result.type === "text" && result.text) {
        try {
          const parsed = JSON.parse(result.text);
          if (Array.isArray(parsed)) {
            parsed.forEach((item, i) => {
              if (item.title && item.snippet) {
                formatted += `${`${i + 1}.`} ${item.title}\n`;
                formatted += `   ${item.snippet}\n`;
                if (item.link) {
                  formatted += `   ${item.link}\n`;
                }
                formatted += "\n";
              }
            });
          } else if (parsed.title && parsed.snippet) {
            formatted += `${`${index + 1}.`} ${parsed.title}\n`;
            formatted += `   ${parsed.snippet}\n`;
            if (parsed.link) {
              formatted += `   ${parsed.link}\n`;
            }
            formatted += "\n";
          }
        } catch (_error) {
          // JSON parse failed, treat as plain text
          if (process.env.DEBUG) {
            console.log(
              `Debug: Search result formatting - Plain text mode for result ${index + 1}`
            );
          }
          const lines = result.text.split("\n");
          lines.forEach(line => {
            if (line.trim()) {
              formatted += `${"•"} ${line.trim()}\n`;
            }
          });
        }
      } else if (typeof result === "object") {
        if (result.title && result.snippet) {
          formatted += `${`${index + 1}.`} ${result.title}\n`;
          formatted += `   ${result.snippet}\n`;
          if (result.link) {
            formatted += `   ${result.link}\n`;
          }
          formatted += "\n";
        } else {
          formatted += `${"•"} ${JSON.stringify(result, null, 2)}\n`;
        }
      }
    });

    formatted += `${"---"}\n`;
    return formatted;
  }
}

export default SearchService;
