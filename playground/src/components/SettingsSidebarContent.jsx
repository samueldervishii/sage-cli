import { useState, useEffect } from "react";
import { chatAPI } from "../services/api";
import { useApp } from "../contexts/AppContext";
import { useToast } from "../contexts/ToastContext";
import { SunIcon, MoonIcon } from "@heroicons/react/24/outline";
import { AI_MODELS } from "../config/models";

const SettingsSidebarContent = ({ onConfigUpdate }) => {
  const { darkMode, toggleDarkMode } = useApp();
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

  // Load configuration on mount
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
    loadConfig();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleSliderChange = (key, value) => {
    const parsed = parseFloat(value);
    // Only update if the parsed value is a valid number
    if (!isNaN(parsed)) {
      setConfig(prev => ({ ...prev, [key]: parsed }));
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Model Settings
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Configure AI model and parameters
        </p>
      </div>

      {/* Appearance */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Appearance
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">
            Choose your theme preference
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={toggleDarkMode}
            disabled={!darkMode}
            className={`flex items-center justify-center gap-2 px-3 py-2 text-xs rounded-lg transition-colors ${
              !darkMode
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
            }`}
          >
            <SunIcon className="w-4 h-4" />
            Light
          </button>
          <button
            onClick={toggleDarkMode}
            disabled={darkMode}
            className={`flex items-center justify-center gap-2 px-3 py-2 text-xs rounded-lg transition-colors ${
              darkMode
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
            }`}
          >
            <MoonIcon className="w-4 h-4" />
            Dark
          </button>
        </div>
      </div>

      {/* Model Selection */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            AI Model
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">
            Choose your primary AI model - all models are free
          </p>
        </div>
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {AI_MODELS.map(model => (
            <button
              key={model.id}
              onClick={() =>
                setConfig(prev => ({ ...prev, selectedModel: model.id }))
              }
              className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                config.selectedModel === model.id
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-gray-400 dark:hover:border-gray-600"
              }`}
              disabled={loading}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white text-xs mb-0.5">
                      {model.name}
                    </h4>
                    {model.recommended && (
                      <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[9px] rounded font-medium">
                        RECOMMENDED
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-500">
                    {model.provider} • {model.modelId.split("/").pop()}
                  </p>
                </div>
                {config.selectedModel === model.id && (
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-0.5 flex-shrink-0"></div>
                )}
              </div>
              <p className="text-[10px] text-gray-600 dark:text-gray-400 mb-1.5">
                {model.description}
              </p>
              <div className="flex flex-wrap gap-1 mb-1.5">
                {model.features.map((feature, idx) => (
                  <span
                    key={idx}
                    className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-[9px] rounded"
                  >
                    {feature}
                  </span>
                ))}
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] text-gray-600 dark:text-gray-400">
                  • Context: {model.contextWindow}
                </p>
                <p className="text-[10px] text-gray-600 dark:text-gray-400">
                  • Output: {model.maxOutput}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Temperature */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-900 dark:text-white">
            Temperature
          </label>
          <span className="text-xs text-gray-700 dark:text-gray-400 bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded font-mono">
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
          className="w-full h-2 bg-gray-300 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer slider"
          disabled={loading}
        />
        <p className="text-xs text-gray-600 dark:text-gray-500">
          Lower is more focused, higher is more creative
        </p>
      </div>

      {/* Max Output Tokens */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-900 dark:text-white">
            Max Output Tokens
          </label>
          <span className="text-xs text-gray-700 dark:text-gray-400 bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded font-mono">
            {config.maxOutputTokens}
          </span>
        </div>
        <input
          type="range"
          min="256"
          max="8192"
          step="256"
          value={config.maxOutputTokens}
          onChange={e => handleSliderChange("maxOutputTokens", e.target.value)}
          className="w-full h-2 bg-gray-300 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer slider"
          disabled={loading}
        />
        <p className="text-xs text-gray-600 dark:text-gray-500">
          Maximum tokens in response (1 token ≈ 4 chars)
        </p>
      </div>

      {/* Top P */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-900 dark:text-white">
            Top P
          </label>
          <span className="text-xs text-gray-700 dark:text-gray-400 bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded font-mono">
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
          className="w-full h-2 bg-gray-300 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer slider"
          disabled={loading}
        />
        <p className="text-xs text-gray-600 dark:text-gray-500">
          Nucleus sampling threshold
        </p>
      </div>

      {/* Top K */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-900 dark:text-white">
            Top K
          </label>
          <span className="text-xs text-gray-700 dark:text-gray-400 bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded font-mono">
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
          className="w-full h-2 bg-gray-300 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer slider"
          disabled={loading}
        />
        <p className="text-xs text-gray-600 dark:text-gray-500">
          Top K most likely tokens per step
        </p>
      </div>

      {/* Memory Mode */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Memory Mode
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-500 mb-3">
            Control AI memory usage
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setConfig(prev => ({ ...prev, memoryMode: "off" }))}
            className={`px-2 py-1.5 text-xs rounded-lg transition-colors ${
              config.memoryMode === "off"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
            }`}
            disabled={loading}
          >
            Off
          </button>
          <button
            onClick={() =>
              setConfig(prev => ({ ...prev, memoryMode: "passive" }))
            }
            className={`px-2 py-1.5 text-xs rounded-lg transition-colors ${
              config.memoryMode === "passive"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
            }`}
            disabled={loading}
          >
            Passive
          </button>
          <button
            onClick={() =>
              setConfig(prev => ({ ...prev, memoryMode: "active" }))
            }
            className={`px-2 py-1.5 text-xs rounded-lg transition-colors ${
              config.memoryMode === "active"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
            }`}
            disabled={loading}
          >
            Active
          </button>
        </div>
        <div className="text-xs text-gray-700 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/50 p-2 rounded">
          {config.memoryMode === "off" &&
            "Memory disabled - AI won't access stored information"}
          {config.memoryMode === "passive" &&
            "Memory available but won't be proactively used"}
          {config.memoryMode === "active" &&
            "AI proactively uses memory for personalized responses"}
        </div>
      </div>

      {/* Quick Presets */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
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
            className="px-2 py-1.5 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white text-xs rounded-lg transition-colors"
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
            className="px-2 py-1.5 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white text-xs rounded-lg transition-colors"
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
            className="px-2 py-1.5 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white text-xs rounded-lg transition-colors"
            disabled={loading}
          >
            Creative
          </button>
        </div>
      </div>

      {/* Apply Button */}
      <button
        onClick={handleUpdate}
        className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={loading}
      >
        {loading ? "Applying..." : "Apply Settings"}
      </button>

      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          transition: background 0.2s;
        }

        .slider::-webkit-slider-thumb:hover {
          background: #2563eb;
        }

        .slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
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

export default SettingsSidebarContent;
