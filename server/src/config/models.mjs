/**
 * Model ID mapping for OpenRouter
 * Maps our internal model IDs to OpenRouter model IDs
 */
export const MODEL_MAPPING = {
  gemini: {
    useOpenRouter: false,
    apiModel: "gemini-2.0-flash-exp",
  },
  deepseek: {
    useOpenRouter: true,
    apiModel: "deepseek/deepseek-r1-distill-llama-70b:free",
  },
  "llama-3.2-3b": {
    useOpenRouter: true,
    apiModel: "meta-llama/llama-3.2-3b-instruct:free",
  },
  "mistral-7b": {
    useOpenRouter: true,
    apiModel: "mistralai/mistral-7b-instruct:free",
  },
  "qwen-2-7b": {
    useOpenRouter: true,
    apiModel: "qwen/qwen-2-7b-instruct:free",
  },
  "phi-3-mini": {
    useOpenRouter: true,
    apiModel: "microsoft/phi-3-mini-128k-instruct:free",
  },
  "gemini-flash-or": {
    useOpenRouter: true,
    apiModel: "google/gemini-2.0-flash-exp:free",
  },
};

/**
 * Get OpenRouter model ID for a given internal model ID
 * @param {string} modelId - Internal model ID
 * @returns {string} OpenRouter model ID
 */
export const getOpenRouterModelId = modelId => {
  const mapping = MODEL_MAPPING[modelId];
  if (!mapping) {
    console.warn(
      `[Models] Unknown model ID: ${modelId}, defaulting to DeepSeek`
    );
    return MODEL_MAPPING["deepseek"].apiModel;
  }
  return mapping.apiModel;
};

/**
 * Check if a model uses OpenRouter
 * @param {string} modelId - Internal model ID
 * @returns {boolean}
 */
export const usesOpenRouter = modelId => {
  const mapping = MODEL_MAPPING[modelId];
  return mapping ? mapping.useOpenRouter : false;
};
