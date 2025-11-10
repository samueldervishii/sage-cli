import { useState, useRef, useEffect } from "react";
import { chatAPI } from "../services/api";
import {
  PaperAirplaneIcon,
  SparklesIcon,
  UserIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

const ChatPlayground = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionInitialized, setSessionInitialized] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [input]);

  // Initialize session on mount
  useEffect(() => {
    const initSession = async () => {
      try {
        await chatAPI.initialize();
        setSessionInitialized(true);
      } catch (error) {
        console.error("Failed to initialize session:", error);
        // Show error to user
        setMessages([
          {
            role: "error",
            content: `Failed to initialize session: ${error.message}. Please refresh the page.`,
          },
        ]);
      }
    };
    initSession();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await chatAPI.send(input);

      const assistantMessage = {
        role: "assistant",
        content:
          response.reply ||
          response.response ||
          response.message ||
          "No response",
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      console.error("Error response data:", error.response?.data);
      console.error("Error status:", error.response?.status);

      let errorMsg = "Failed to send message";
      if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.message) {
        errorMsg = error.message;
      }

      const errorMessage = {
        role: "error",
        content: `Error: ${errorMsg}`,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startNewChat = async () => {
    try {
      await chatAPI.clearSession();
      setMessages([]);
      // Reinitialize session
      await chatAPI.initialize();
      setSessionInitialized(true);
    } catch (error) {
      console.error("Failed to clear session:", error);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col items-center bg-gradient-to-b from-gray-50 to-white dark:from-dark-950 dark:to-dark-900">
      {/* Header */}
      <div className="w-full max-w-4xl px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
            <SparklesIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              Sage AI
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {sessionInitialized ? "Ready to chat" : "Initializing..."}
            </p>
          </div>
        </div>
        <button
          onClick={startNewChat}
          className="px-4 py-2 text-sm bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-lg transition-all shadow-lg flex items-center gap-2 font-medium"
        >
          <PlusIcon className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 w-full overflow-y-auto scrollbar-thin">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full px-6">
            <div className="text-center max-w-2xl">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl">
                <SparklesIcon className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                Welcome to Sage AI
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                Your intelligent AI assistant powered by advanced language
                models. Ask me anything!
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                {[
                  { title: "Get creative ideas", icon: "💡" },
                  { title: "Solve complex problems", icon: "🧩" },
                  { title: "Learn something new", icon: "📚" },
                  { title: "Write better content", icon: "✍️" },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(item.title)}
                    className="p-4 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all text-left group"
                  >
                    <span className="text-2xl mb-2 block">{item.icon}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {item.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto py-8 px-6 space-y-6">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-4 ${
                  message.role === "user" ? "flex-row-reverse" : ""
                }`}
              >
                <div className="flex-shrink-0 mt-1">
                  {message.role === "user" ? (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-dark-700 dark:to-dark-600 flex items-center justify-center shadow-sm">
                      <UserIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                      <SparklesIcon className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {message.role === "user" ? "You" : "Sage AI"}
                    </span>
                  </div>
                  <div
                    className={`rounded-2xl px-5 py-3 ${
                      message.role === "user"
                        ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30"
                        : message.role === "error"
                          ? "bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-300 border border-red-200 dark:border-red-800"
                          : "bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-dark-700 shadow-sm"
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-4">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg animate-pulse">
                    <SparklesIcon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Sage AI
                    </span>
                  </div>
                  <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-2xl px-5 py-4 shadow-sm">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" />
                      <div
                        className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      />
                      <div
                        className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce"
                        style={{ animationDelay: "0.4s" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="w-full border-t border-gray-200 dark:border-dark-800 bg-white dark:bg-dark-900 shadow-2xl">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="relative flex items-end gap-3 bg-gray-50 dark:bg-dark-800 rounded-2xl border-2 border-gray-200 dark:border-dark-700 focus-within:border-blue-500 dark:focus-within:border-blue-500 transition-colors p-1">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              disabled={!sessionInitialized}
              rows={1}
              className="flex-1 px-4 py-3 bg-transparent border-0 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-0 focus:outline-none resize-none max-h-[200px] overflow-y-auto scrollbar-thin disabled:opacity-50"
              style={{ minHeight: "48px" }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading || !sessionInitialized}
              className="flex-shrink-0 m-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:from-gray-300 disabled:to-gray-300 dark:disabled:from-dark-700 dark:disabled:to-dark-700 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-lg disabled:shadow-none flex items-center gap-2 font-medium"
            >
              <span>Send</span>
              <PaperAirplaneIcon className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-3">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatPlayground;
