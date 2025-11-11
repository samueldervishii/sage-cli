import { useState } from "react";
import { useApp } from "../contexts/AppContext";

const endpoints = [
  {
    category: "Chat",
    items: [
      {
        method: "POST",
        path: "/api/chat/send",
        description: "Send a message to the AI assistant",
        body: {
          message: "Your message here",
          model: "gemini-2.0-flash-exp",
          temperature: 1.0,
          maxTokens: 2048,
          systemPrompt: "Optional system prompt",
        },
        response: {
          response: "AI assistant response",
          model: "gemini-2.0-flash-exp",
          timestamp: "2025-11-10T12:00:00.000Z",
        },
      },
      {
        method: "POST",
        path: "/api/chat/initialize",
        description: "Initialize a new chat session",
        body: {
          model: "gemini-2.0-flash-exp",
          systemPrompt: "Optional system prompt",
        },
        response: {
          sessionId: "session-123",
          status: "initialized",
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

  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

  return (
    <div
      className="h-[calc(100vh-4rem)] overflow-y-auto scrollbar-thin"
      style={{ backgroundColor: "#1a1d20" }}
    >
      <div className="max-w-6xl mx-auto py-8 px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Sage API Documentation
          </h1>
          <p className="text-gray-400">
            REST API for Sage AI Assistant - Version{" "}
            {serverInfo?.version || "2.0.0"}
          </p>
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-900 dark:text-blue-300">
              <span className="font-semibold">Base URL:</span>{" "}
              <code className="bg-white dark:bg-dark-950 px-2 py-1 rounded">
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
                      className="bg-white dark:bg-dark-900 border border-gray-200 dark:border-dark-800 rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() =>
                          setSelectedEndpoint(isExpanded ? null : key)
                        }
                        className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-dark-800 transition-colors"
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
                        <div className="border-t border-gray-200 dark:border-dark-800 p-4 bg-gray-50 dark:bg-dark-950">
                          {endpoint.body && (
                            <div className="mb-4">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                Request Body
                              </h4>
                              <pre className="bg-gray-900 dark:bg-black text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                                {JSON.stringify(endpoint.body, null, 2)}
                              </pre>
                            </div>
                          )}

                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                              Response
                            </h4>
                            <pre className="bg-gray-900 dark:bg-black text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                              {JSON.stringify(endpoint.response, null, 2)}
                            </pre>
                          </div>

                          {/* cURL example */}
                          <div className="mt-4">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                              cURL Example
                            </h4>
                            <pre className="bg-gray-900 dark:bg-black text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
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
        <div className="mt-12 p-6 bg-gray-900 dark:bg-black rounded-lg">
          <h2 className="text-xl font-semibold text-white mb-4">Quick Start</h2>
          <div className="space-y-4 text-gray-300">
            <div>
              <h3 className="font-medium text-white mb-2">
                1. Start the server
              </h3>
              <pre className="bg-black p-3 rounded text-sm overflow-x-auto">
                npm run api
              </pre>
            </div>
            <div>
              <h3 className="font-medium text-white mb-2">2. Send a message</h3>
              <pre className="bg-black p-3 rounded text-sm overflow-x-auto">
                {`curl -X POST ${baseUrl}/api/chat/send \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Hello, Sage!"}'`}
              </pre>
            </div>
            <div>
              <h3 className="font-medium text-white mb-2">3. Check health</h3>
              <pre className="bg-black p-3 rounded text-sm overflow-x-auto">
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
