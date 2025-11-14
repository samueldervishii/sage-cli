import { useState } from "react";
import { useApp } from "../contexts/AppContext";
import { ClipboardDocumentIcon, CheckIcon } from "@heroicons/react/24/outline";

const endpoints = [
  {
    category: "Chat",
    items: [
      {
        method: "POST",
        path: "/api/chat/initialize",
        description:
          "Initialize a new chat session with optional model parameters",
        body: {
          conversationId: "Optional conversation ID to resume",
          modelParams: {
            selectedModel: "gemini",
            temperature: 1.0,
            maxOutputTokens: 8192,
            topP: 0.95,
            topK: 40,
            memoryMode: "active",
          },
        },
        response: {
          success: true,
          sessionId: "session-123",
          modelConfig: {
            selectedModel: "gemini",
            temperature: 1.0,
            maxOutputTokens: 8192,
            topP: 0.95,
            topK: 40,
            memoryMode: "active",
          },
        },
      },
      {
        method: "POST",
        path: "/api/chat/send",
        description: "Send a message to the AI assistant",
        body: {
          message: "Your message here",
        },
        response: {
          success: true,
          reply: "AI assistant response",
          searchUsed: false,
          functionCalls: [],
        },
      },
      {
        method: "GET",
        path: "/api/chat/status",
        description: "Get current chat session status",
        response: {
          initialized: true,
          sessionId: "session-123",
          conversationId: "conv-456",
          messageCount: 5,
        },
      },
      {
        method: "DELETE",
        path: "/api/chat/session",
        description: "Clear current chat session",
        response: {
          success: true,
          message: "Session cleared",
        },
      },
      {
        method: "GET",
        path: "/api/chat/config",
        description: "Get current model configuration",
        response: {
          success: true,
          config: {
            temperature: 1.0,
            maxOutputTokens: 8192,
            topP: 0.95,
            topK: 40,
            memoryMode: "active",
          },
        },
      },
      {
        method: "POST",
        path: "/api/chat/config",
        description:
          "Update model configuration. selectedModel: gemini/deepseek, memoryMode: off/passive/active",
        body: {
          selectedModel: "deepseek",
          temperature: 0.7,
          maxOutputTokens: 4096,
          topP: 0.9,
          topK: 30,
          memoryMode: "off",
        },
        response: {
          success: true,
          config: {
            selectedModel: "deepseek",
            temperature: 0.7,
            maxOutputTokens: 4096,
            topP: 0.9,
            topK: 30,
            memoryMode: "off",
          },
          message: "Model configuration updated successfully",
        },
      },
      {
        method: "POST",
        path: "/api/chat/config/reset",
        description: "Reset model configuration to defaults",
        response: {
          success: true,
          config: {
            selectedModel: "gemini",
            temperature: 1.0,
            maxOutputTokens: 8192,
            topP: 0.95,
            topK: 40,
            memoryMode: "active",
          },
          message: "Model configuration reset to defaults",
        },
      },
    ],
  },
  {
    category: "Memory",
    items: [
      {
        method: "GET",
        path: "/api/memory/list",
        description: "Get all stored memories",
        response: {
          memories: ["Memory 1", "Memory 2"],
        },
      },
      {
        method: "GET",
        path: "/api/memory/search?query=<query>",
        description: "Search memories by query",
        response: {
          results: ["Matching memory 1", "Matching memory 2"],
        },
      },
      {
        method: "POST",
        path: "/api/memory/add",
        description: "Add a new memory",
        body: {
          content: "Memory content",
          metadata: {},
        },
        response: {
          success: true,
          id: "memory-123",
        },
      },
      {
        method: "DELETE",
        path: "/api/memory/clear",
        description: "Clear all memories",
        response: {
          success: true,
          message: "All memories cleared",
        },
      },
      {
        method: "GET",
        path: "/api/memory/stats",
        description: "Get memory statistics",
        response: {
          total: 42,
          recent: 5,
          categories: 3,
        },
      },
    ],
  },
  {
    category: "History",
    items: [
      {
        method: "GET",
        path: "/api/history/list",
        description: "Get all conversation history",
        response: {
          conversations: [
            {
              id: "conv-123",
              title: "Conversation title",
              timestamp: "2025-11-10T12:00:00.000Z",
              messageCount: 5,
            },
          ],
        },
      },
      {
        method: "GET",
        path: "/api/history/:id",
        description: "Get a specific conversation",
        response: {
          id: "conv-123",
          title: "Conversation title",
          messages: [
            { role: "user", content: "Hello" },
            { role: "assistant", content: "Hi there!" },
          ],
        },
      },
      {
        method: "GET",
        path: "/api/history/:id/export",
        description: "Export a conversation",
        response: {
          id: "conv-123",
          format: "json",
          data: {},
        },
      },
      {
        method: "DELETE",
        path: "/api/history/clean",
        description: "Clean old conversations",
        response: {
          success: true,
          cleaned: 10,
        },
      },
    ],
  },
];

const ApiDocs = () => {
  const { serverInfo } = useApp();
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [copiedCurl, setCopiedCurl] = useState(null);

  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

  const copyCurl = async (curlCommand, key) => {
    try {
      await navigator.clipboard.writeText(curlCommand);
      setCopiedCurl(key);
      setTimeout(() => setCopiedCurl(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] overflow-y-auto scrollbar-thin bg-gray-50 dark:bg-[#1a1d20]">
      <div className="max-w-6xl mx-auto py-8 px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Sage API Documentation
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            REST API for Sage AI Assistant - Version{" "}
            {serverInfo?.version || "2.0.0"}
          </p>
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30 rounded-lg">
            <p className="text-sm text-blue-900 dark:text-blue-300">
              <span className="font-semibold">Base URL:</span>{" "}
              <code className="bg-blue-100 dark:bg-blue-950 px-2 py-1 rounded text-blue-800 dark:text-blue-200">
                {baseUrl}
              </code>
            </p>
          </div>
        </div>

        {/* Endpoints */}
        <div className="space-y-8">
          {endpoints.map(category => (
            <div key={category.category}>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                {category.category}
              </h2>
              <div className="space-y-4">
                {category.items.map((endpoint, index) => {
                  const key = `${category.category}-${index}`;
                  const isExpanded = selectedEndpoint === key;

                  return (
                    <div
                      key={key}
                      className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm"
                    >
                      <button
                        onClick={() =>
                          setSelectedEndpoint(isExpanded ? null : key)
                        }
                        className="w-full p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded ${
                              endpoint.method === "GET"
                                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                : endpoint.method === "POST"
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                                  : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                            }`}
                          >
                            {endpoint.method}
                          </span>
                          <code className="flex-1 text-sm text-gray-900 dark:text-gray-100 font-mono">
                            {endpoint.path}
                          </code>
                        </div>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                          {endpoint.description}
                        </p>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-gray-300 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
                          {endpoint.body && (
                            <div className="mb-4">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                Request Body
                              </h4>
                              <pre className="bg-gray-800 dark:bg-gray-950 text-gray-100 dark:text-gray-200 p-4 rounded-lg overflow-x-auto text-sm border border-gray-700 dark:border-gray-800">
                                {JSON.stringify(endpoint.body, null, 2)}
                              </pre>
                            </div>
                          )}

                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                              Response
                            </h4>
                            <pre className="bg-gray-800 dark:bg-gray-950 text-gray-100 dark:text-gray-200 p-4 rounded-lg overflow-x-auto text-sm border border-gray-700 dark:border-gray-800">
                              {JSON.stringify(endpoint.response, null, 2)}
                            </pre>
                          </div>

                          {/* cURL example */}
                          <div className="mt-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                                cURL Example
                              </h4>
                              <button
                                onClick={() => {
                                  const curlCommand =
                                    endpoint.method === "GET"
                                      ? `curl -X GET ${baseUrl}${endpoint.path}`
                                      : endpoint.method === "POST"
                                        ? `curl -X POST ${baseUrl}${endpoint.path} \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(endpoint.body)}'`
                                        : `curl -X ${endpoint.method} ${baseUrl}${endpoint.path}`;
                                  copyCurl(curlCommand, key);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors"
                              >
                                {copiedCurl === key ? (
                                  <>
                                    <CheckIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    <span className="text-green-600 dark:text-green-400">
                                      Copied!
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <ClipboardDocumentIcon className="w-4 h-4" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <pre className="bg-gray-800 dark:bg-gray-950 text-gray-100 dark:text-gray-200 p-4 rounded-lg overflow-x-auto text-sm border border-gray-700 dark:border-gray-800">
                              {endpoint.method === "GET"
                                ? `curl -X GET ${baseUrl}${endpoint.path}`
                                : endpoint.method === "POST"
                                  ? `curl -X POST ${baseUrl}${endpoint.path} \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(endpoint.body)}'`
                                  : `curl -X ${endpoint.method} ${baseUrl}${endpoint.path}`}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Start */}
        <div className="mt-12 p-6 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Quick Start
          </h2>
          <div className="space-y-4 text-gray-700 dark:text-gray-300">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  1. Start the server
                </h3>
                <button
                  onClick={() => copyCurl("npm run api", "quickstart-1")}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  {copiedCurl === "quickstart-1" ? (
                    <>
                      <CheckIcon className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                      <span className="text-green-600 dark:text-green-400">
                        Copied
                      </span>
                    </>
                  ) : (
                    <>
                      <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="bg-gray-800 dark:bg-black text-gray-100 p-3 rounded text-sm overflow-x-auto border border-gray-700 dark:border-gray-800">
                npm run api
              </pre>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  2. Send a message
                </h3>
                <button
                  onClick={() =>
                    copyCurl(
                      `curl -X POST ${baseUrl}/api/chat/send \\\n  -H "Content-Type: application/json" \\\n  -d '{"message": "Hello, Sage!"}'`,
                      "quickstart-2"
                    )
                  }
                  className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  {copiedCurl === "quickstart-2" ? (
                    <>
                      <CheckIcon className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                      <span className="text-green-600 dark:text-green-400">
                        Copied
                      </span>
                    </>
                  ) : (
                    <>
                      <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="bg-gray-800 dark:bg-black text-gray-100 p-3 rounded text-sm overflow-x-auto border border-gray-700 dark:border-gray-800">
                {`curl -X POST ${baseUrl}/api/chat/send \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Hello, Sage!"}'`}
              </pre>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  3. Check health
                </h3>
                <button
                  onClick={() =>
                    copyCurl(`curl ${baseUrl}/health`, "quickstart-3")
                  }
                  className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  {copiedCurl === "quickstart-3" ? (
                    <>
                      <CheckIcon className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                      <span className="text-green-600 dark:text-green-400">
                        Copied
                      </span>
                    </>
                  ) : (
                    <>
                      <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="bg-gray-800 dark:bg-black text-gray-100 p-3 rounded text-sm overflow-x-auto border border-gray-700 dark:border-gray-800">
                curl {baseUrl}/health
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiDocs;
