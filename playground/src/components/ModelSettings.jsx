import { useState, useEffect } from "react";
import { chatAPI } from "../services/api";
import { useToast } from "../contexts/ToastContext";

const ModelSettings = ({ isOpen, onClose, onConfigUpdate }) => {
  const toast = useToast();
  const [config, setConfig] = useState({
    selectedModel: "gemini",
    temperature: 1.0,
    maxOutputTokens: 8192,
    topP: 0.95,
    topK: 40,
    memoryMode: "active",
  });

  const [loading, setLoading] = useState(false);

  // Load current configuration when panel opens
  useEffect(() => {
    let mounted = true;
    const loadConfig = async () => {
      try {
        setLoading(true);
        const response = await chatAPI.getConfig();
        if (mounted && response.success && response.config) {
          setConfig({
            selectedModel: response.config.selectedModel || "gemini",
            temperature: response.config.temperature || 1.0,
            maxOutputTokens: response.config.maxOutputTokens || 8192,
            topP: response.config.topP || 0.95,
            topK: response.config.topK || 40,
            memoryMode: response.config.memoryMode || "active",
          });
        }
      } catch (err) {
        // If no session yet, keep current defaults
        // Only show error if it's not a 404 and component is still mounted
        if (mounted && err.response?.status !== 404) {
          toast.error("Failed to load configuration");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    if (isOpen) {
      loadConfig();
    }
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleUpdate = async () => {
    try {
      setLoading(true);

      const response = await chatAPI.updateConfig(config);

      if (response.success) {
        toast.success("Configuration updated successfully!");
        // Notify parent component about the update
        if (onConfigUpdate) {
          onConfigUpdate(response.config);
        }
        // Close modal after showing success message
        setTimeout(() => {
          onClose();
        }, 800);
      }
    } catch (err) {
      if (err.response?.data?.errors) {
        toast.error(err.response.data.errors.join(", "));
      } else {
        toast.error(
          err.response?.data?.message || "Failed to update configuration"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      setLoading(true);

      const response = await chatAPI.resetConfig();

      if (response.success) {
        setConfig(response.config);
        toast.success("Configuration reset to defaults!");
        // Notify parent component about the reset
        if (onConfigUpdate) {
          onConfigUpdate(response.config);
        }
        // Close modal after showing success message
        setTimeout(() => {
          onClose();
        }, 800);
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to reset configuration"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSliderChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: parseFloat(value) }));
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1d20] border border-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto m-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <h2 className="text-2xl font-bold text-white">Model Settings</h2>
            <p className="text-sm text-gray-400 mt-1">
              Fine-tune the AI model behavior for your playground session
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Model Selection */}
          <div className="space-y-3 pb-6 border-b border-gray-800">
            <div>
              <h3 className="text-sm font-medium text-white mb-2">AI Model</h3>
              <p className="text-xs text-gray-500 mb-3">
                Choose your primary AI model
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() =>
                  setConfig(prev => ({ ...prev, selectedModel: "gemini" }))
                }
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  config.selectedModel === "gemini"
                    ? "border-blue-500 bg-blue-900/20"
                    : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
                }`}
                disabled={loading}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-white text-sm">
                    Gemini 2.0 Flash
                  </h4>
                  {config.selectedModel === "gemini" && (
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  )}
                </div>
                <p className="text-xs text-gray-400 mb-2">
                  1M context, multimodal
                </p>
                <div className="flex flex-wrap gap-1">
                  <span className="px-2 py-0.5 bg-green-900/30 text-green-400 text-xs rounded">
                    Function Calling
                  </span>
                  <span className="px-2 py-0.5 bg-blue-900/30 text-blue-400 text-xs rounded">
                    Memory
                  </span>
                </div>
              </button>

              <button
                onClick={() =>
                  setConfig(prev => ({ ...prev, selectedModel: "deepseek" }))
                }
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  config.selectedModel === "deepseek"
                    ? "border-blue-500 bg-blue-900/20"
                    : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
                }`}
                disabled={loading}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-white text-sm">
                    DeepSeek R1 Distill
                  </h4>
                  {config.selectedModel === "deepseek" && (
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  )}
                </div>
                <p className="text-xs text-gray-400 mb-2">
                  70B reasoning, free
                </p>
                <div className="flex flex-wrap gap-1">
                  <span className="px-2 py-0.5 bg-green-900/30 text-green-400 text-xs rounded">
                    Function Calling
                  </span>
                  <span className="px-2 py-0.5 bg-purple-900/30 text-purple-400 text-xs rounded">
                    Fast
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-white">
                Temperature
              </label>
              <span className="text-sm text-gray-400 bg-gray-800 px-3 py-1 rounded-md font-mono">
                {config.temperature.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.01"
              value={config.temperature}
              onChange={e => handleSliderChange("temperature", e.target.value)}
              className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer slider"
              disabled={loading}
            />
            <p className="text-xs text-gray-500">
              Controls randomness: Lower is more focused and deterministic,
              higher is more creative and diverse
            </p>
          </div>

          {/* Max Output Tokens */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-white">
                Max Output Tokens
              </label>
              <span className="text-sm text-gray-400 bg-gray-800 px-3 py-1 rounded-md font-mono">
                {config.maxOutputTokens}
              </span>
            </div>
            <input
              type="range"
              min="256"
              max="8192"
              step="256"
              value={config.maxOutputTokens}
              onChange={e =>
                handleSliderChange("maxOutputTokens", e.target.value)
              }
              className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer slider"
              disabled={loading}
            />
            <p className="text-xs text-gray-500">
              Maximum number of tokens in the response (1 token ≈ 4 characters)
            </p>
          </div>

          {/* Top P */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-white">Top P</label>
              <span className="text-sm text-gray-400 bg-gray-800 px-3 py-1 rounded-md font-mono">
                {config.topP.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={config.topP}
              onChange={e => handleSliderChange("topP", e.target.value)}
              className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer slider"
              disabled={loading}
            />
            <p className="text-xs text-gray-500">
              Nucleus sampling: Only considers tokens with top P cumulative
              probability
            </p>
          </div>

          {/* Top K */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-white">Top K</label>
              <span className="text-sm text-gray-400 bg-gray-800 px-3 py-1 rounded-md font-mono">
                {config.topK}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              step="1"
              value={config.topK}
              onChange={e => handleSliderChange("topK", e.target.value)}
              className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer slider"
              disabled={loading}
            />
            <p className="text-xs text-gray-500">
              Only considers the top K most likely tokens for each step
            </p>
          </div>

          {/* Memory Mode */}
          <div className="border-t border-gray-800 pt-6 space-y-3">
            <div>
              <h3 className="text-sm font-medium text-white mb-2">
                Memory Mode
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Control how the AI uses its memory system
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() =>
                  setConfig(prev => ({ ...prev, memoryMode: "off" }))
                }
                className={`px-3 py-2 text-xs rounded-lg transition-colors ${
                  config.memoryMode === "off"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 hover:bg-gray-700 text-white"
                }`}
                disabled={loading}
              >
                Off
              </button>
              <button
                onClick={() =>
                  setConfig(prev => ({ ...prev, memoryMode: "passive" }))
                }
                className={`px-3 py-2 text-xs rounded-lg transition-colors ${
                  config.memoryMode === "passive"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 hover:bg-gray-700 text-white"
                }`}
                disabled={loading}
              >
                Passive
              </button>
              <button
                onClick={() =>
                  setConfig(prev => ({ ...prev, memoryMode: "active" }))
                }
                className={`px-3 py-2 text-xs rounded-lg transition-colors ${
                  config.memoryMode === "active"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 hover:bg-gray-700 text-white"
                }`}
                disabled={loading}
              >
                Active
              </button>
            </div>
            <div className="space-y-1.5 text-xs">
              {config.memoryMode === "off" && (
                <p className="text-gray-400 bg-gray-900/50 p-2 rounded">
                  Memory disabled - AI won't access stored information
                </p>
              )}
              {config.memoryMode === "passive" && (
                <p className="text-gray-400 bg-gray-900/50 p-2 rounded">
                  Memory available but won't be proactively used
                </p>
              )}
              {config.memoryMode === "active" && (
                <p className="text-gray-400 bg-gray-900/50 p-2 rounded">
                  AI proactively uses memory for personalized responses
                </p>
              )}
            </div>
          </div>

          {/* Preset Configurations */}
          <div className="border-t border-gray-800 pt-6">
            <h3 className="text-sm font-medium text-white mb-3">
              Quick Presets
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() =>
                  setConfig(prev => ({
                    ...prev,
                    temperature: 0.3,
                    maxOutputTokens: 4096,
                    topP: 0.8,
                    topK: 20,
                    memoryMode: "off",
                  }))
                }
                className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs rounded-lg transition-colors"
                disabled={loading}
              >
                Precise
              </button>
              <button
                onClick={() =>
                  setConfig(prev => ({
                    ...prev,
                    temperature: 1.0,
                    maxOutputTokens: 8192,
                    topP: 0.95,
                    topK: 40,
                    memoryMode: "passive",
                  }))
                }
                className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs rounded-lg transition-colors"
                disabled={loading}
              >
                Balanced
              </button>
              <button
                onClick={() =>
                  setConfig(prev => ({
                    ...prev,
                    temperature: 1.5,
                    maxOutputTokens: 8192,
                    topP: 0.98,
                    topK: 60,
                    memoryMode: "active",
                  }))
                }
                className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs rounded-lg transition-colors"
                disabled={loading}
              >
                Creative
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-800">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            disabled={loading}
          >
            Reset to Defaults
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleUpdate}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? "Applying..." : "Apply Settings"}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          transition: background 0.2s;
        }

        .slider::-webkit-slider-thumb:hover {
          background: #2563eb;
        }

        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
          transition: background 0.2s;
        }

        .slider::-moz-range-thumb:hover {
          background: #2563eb;
        }

        .slider:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default ModelSettings;
