/**
 * Available AI Models Configuration
 * Models are grouped by provider for better organization
 */

export const AI_MODELS = [
  {
    id: "gemini",
    name: "Gemini 2.0 Flash",
    provider: "Google",
    modelId: "gemini-2.0-flash-exp",
    description: "Fast, intelligent, multimodal AI",
    features: ["Multimodal", "Function calling", "1M context"],
    contextWindow: "1,048,576 tokens",
    maxOutput: "8,192 tokens",
    knowledge: "Aug 2024",
    free: true,
    recommended: true,
    useDirectApi: true, // Use Google API directly
  },
  {
    id: "deepseek",
    name: "DeepSeek R1 Distill",
    provider: "DeepSeek",
    modelId: "deepseek/deepseek-r1-distill-llama-70b:free",
    description: "70B reasoning model, distilled from R1",
    features: ["Reasoning", "70B params", "Free"],
    contextWindow: "128K tokens",
    maxOutput: "32,768 tokens",
    knowledge: "Jan 2025",
    free: true,
    recommended: true,
    useDirectApi: false, // Use OpenRouter
  },
  {
    id: "llama-3.2-3b",
    name: "Llama 3.2 3B",
    provider: "Meta",
    modelId: "meta-llama/llama-3.2-3b-instruct:free",
    description: "Lightweight, fast, efficient model",
    features: ["Fast", "Lightweight", "3B params"],
    contextWindow: "128K tokens",
    maxOutput: "2,048 tokens",
    knowledge: "Dec 2024",
    free: true,
    recommended: false,
    useDirectApi: false,
  },
  {
    id: "mistral-7b",
    name: "Mistral 7B Instruct",
    provider: "Mistral AI",
    modelId: "mistralai/mistral-7b-instruct:free",
    description: "Efficient 7B parameter model",
    features: ["Balanced", "7B params", "Free"],
    contextWindow: "32K tokens",
    maxOutput: "4,096 tokens",
    knowledge: "Sep 2024",
    free: true,
    recommended: false,
    useDirectApi: false,
  },
  {
    id: "qwen-2-7b",
    name: "Qwen 2 7B",
    provider: "Alibaba",
    modelId: "qwen/qwen-2-7b-instruct:free",
    description: "Multilingual 7B model with strong reasoning",
    features: ["Multilingual", "Reasoning", "7B params"],
    contextWindow: "32K tokens",
    maxOutput: "4,096 tokens",
    knowledge: "Jun 2024",
    free: true,
    recommended: false,
    useDirectApi: false,
  },
  {
    id: "phi-3-mini",
    name: "Phi-3 Mini",
    provider: "Microsoft",
    modelId: "microsoft/phi-3-mini-128k-instruct:free",
    description: "Compact, efficient Microsoft model",
    features: ["Compact", "Efficient", "128K context"],
    contextWindow: "128K tokens",
    maxOutput: "4,096 tokens",
    knowledge: "Apr 2024",
    free: true,
    recommended: false,
    useDirectApi: false,
  },
  {
    id: "gemini-flash-or",
    name: "Gemini Flash (OpenRouter)",
    provider: "Google",
    modelId: "google/gemini-2.0-flash-exp:free",
    description: "Gemini via OpenRouter (fallback option)",
    features: ["Multimodal", "Fast", "1M context"],
    contextWindow: "1,048,576 tokens",
    maxOutput: "8,192 tokens",
    knowledge: "Aug 2024",
    free: true,
    recommended: false,
    useDirectApi: false,
  },
];

/**
 * Get model configuration by ID
 * @param {string} modelId - Model ID
 * @returns {object|null} Model configuration
 */
export const getModelById = modelId => {
  return AI_MODELS.find(model => model.id === modelId) || null;
};

/**
 * Get all free models
 * @returns {array} Free models
 */
export const getFreeModels = () => {
  return AI_MODELS.filter(model => model.free);
};

/**
 * Get recommended models
 * @returns {array} Recommended models
 */
export const getRecommendedModels = () => {
  return AI_MODELS.filter(model => model.recommended);
};
