import axios from "axios";
import chalk from "chalk";

class OpenRouterClient {
  constructor(apiKey, model = "deepseek/deepseek-r1-distill-llama-70b:free") {
    this.apiKey = apiKey;
    this.model = model;
    this.baseURL = "https://openrouter.ai/api/v1";
  }

  /**
   * Send a chat completion request
   * @param {Array} messages - Array of message objects with role and content
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Response from OpenRouter
   */
  async chatCompletion(messages, options = {}) {
    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages: messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 4000,
          stream: false,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "HTTP-Referer": "https://github.com/samueldervishii/sage-cli",
            "X-Title": "Sage CLI",
            "Content-Type": "application/json",
          },
        }
      );

      // Validate response structure
      const choice = response.data.choices?.[0];
      if (!choice?.message?.content) {
        return {
          success: false,
          error: "Invalid API response: missing message content",
        };
      }

      return {
        success: true,
        content: choice.message.content,
        model: response.data.model,
        usage: response.data.usage,
      };
    } catch (error) {
      if (error.response) {
        return {
          success: false,
          error: `OpenRouter API Error: ${error.response.status} - ${error.response.data?.error?.message || error.message}`,
        };
      }

      return {
        success: false,
        error: `Network Error: ${error.message}`,
      };
    }
  }

  /**
   * Convert Gemini conversation history to OpenRouter format
   * @param {Array} geminiHistory - Gemini conversation history
   * @returns {Array} OpenRouter formatted messages
   */
  convertGeminiHistory(geminiHistory) {
    return geminiHistory.map(msg => {
      // Extract text from parts if it exists
      const content =
        msg.parts && msg.parts.length > 0
          ? msg.parts.map(p => p.text).join("")
          : msg.content || "";

      return {
        role: msg.role === "model" ? "assistant" : msg.role,
        content: content,
      };
    });
  }

  /**
   * Format response for display
   * @param {Object} response - OpenRouter response
   * @returns {string} Formatted text
   */
  formatResponse(response) {
    if (!response.success) {
      return chalk.red(response.error);
    }

    let output = response.content;

    if (process.env.DEBUG && response.usage) {
      output += chalk.gray(
        `\n\n[Tokens: ${response.usage.total_tokens} | Model: ${response.model}]`
      );
    }

    return output;
  }
}

export default OpenRouterClient;
