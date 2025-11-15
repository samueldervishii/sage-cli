import axios from "axios";
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
      const requestBody = {
        model: this.model,
        messages: messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 4000,
        stream: false,
      };

      // Add tools/function calling if provided
      if (options.tools && options.tools.length > 0) {
        requestBody.tools = options.tools;
      }

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        requestBody,
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
      if (!choice?.message) {
        return {
          success: false,
          error: "Invalid API response: missing message",
        };
      }

      // Check for tool calls (function calling)
      const toolCalls = choice.message.tool_calls;

      return {
        success: true,
        content: choice.message.content || "",
        model: response.data.model,
        usage: response.data.usage,
        toolCalls: toolCalls || null,
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
   * Convert Gemini function declarations to OpenRouter tools format
   * @param {Array} geminiTools - Gemini tool definitions
   * @returns {Array} OpenRouter tools format
   */
  convertGeminiTools(geminiTools) {
    if (!geminiTools || geminiTools.length === 0) return [];

    const tools = [];

    for (const toolGroup of geminiTools) {
      if (toolGroup.functionDeclarations) {
        for (const func of toolGroup.functionDeclarations) {
          tools.push({
            type: "function",
            function: {
              name: func.name,
              description: func.description,
              parameters: this._convertGeminiParameters(func.parameters),
            },
          });
        }
      }
    }

    return tools;
  }

  /**
   * Convert Gemini parameter format to OpenRouter/OpenAI format
   * @private
   */
  _convertGeminiParameters(params) {
    if (!params) return {};

    const converted = {
      type: "object",
      properties: {},
      required: params.required || [],
    };

    if (params.properties) {
      for (const [key, value] of Object.entries(params.properties)) {
        converted.properties[key] = {
          type: value.type?.toLowerCase() || "string",
          description: value.description,
        };
      }
    }

    return converted;
  }

  /**
   * Format response for display
   * @param {Object} response - OpenRouter response
   * @returns {string} Formatted text
   */
  formatResponse(response) {
    if (!response.success) {
      return response.error;
    }

    let output = response.content;

    if (process.env.DEBUG && response.usage) {
      output += `\n\n[Tokens: ${response.usage.total_tokens} | Model: ${response.model}]`;
    }

    return output;
  }
}

export default OpenRouterClient;
