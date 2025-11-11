import { useState, useRef, useEffect } from "react";
import { chatAPI } from "../services/api";
import { useApp } from "../contexts/AppContext";
import {
  PaperAirplaneIcon,
  SparklesIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

const ChatPlayground = () => {
  const { setOnNewChatCallback } = useApp();
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

  // useEffect(() => {
  //   if (textareaRef.current) {
  //     textareaRef.current.style.height = "auto";
  //     textareaRef.current.style.height =
  //       textareaRef.current.scrollHeight + "px";
  //   }
  // }, [input]);

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

  // Register the startNewChat function with the context
  useEffect(() => {
    setOnNewChatCallback(() => startNewChat);
    return () => setOnNewChatCallback(null);
  }, [setOnNewChatCallback]);

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

  return (
    <div
      className="h-[calc(100vh-4rem)] flex flex-col"
      style={{ backgroundColor: "#1a1d20" }}
    >
      {/* Messages area */}
      <div className="flex-1 w-full overflow-y-auto scrollbar-thin">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full px-4">
            <div className="text-center max-w-2xl">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                Sage AI Studio
              </h2>
            </div>
          </div>
        ) : (
          <div className="w-full mx-auto py-4 sm:py-8 px-3 sm:px-6 lg:px-8 max-w-4xl space-y-4 sm:space-y-6">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-2 sm:gap-4 ${
                  message.role === "user" ? "flex-row-reverse" : ""
                }`}
              >
                <div className="flex-shrink-0 mt-1">
                  {message.role === "user" ? (
                    <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gray-700 flex items-center justify-center">
                      <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gray-700 flex items-center justify-center">
                      <SparklesIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="mb-1">
                    <span className="text-xs sm:text-sm font-medium text-white">
                      {message.role === "user" ? "You" : "Sage AI"}
                    </span>
                  </div>
                  <div
                    className={`rounded-2xl px-3 py-2 sm:px-5 sm:py-3 ${
                      message.role === "user"
                        ? "bg-blue-600 text-white"
                        : message.role === "error"
                          ? "bg-red-900/20 text-red-300 border border-red-800"
                          : "bg-gray-800 text-gray-100 border border-gray-700"
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed text-sm sm:text-base">
                      {message.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex gap-1.5 px-3 sm:px-5">
                    <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" />
                    <div
                      className="w-2 h-2 rounded-full bg-gray-500 animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                    <div
                      className="w-2 h-2 rounded-full bg-gray-500 animate-bounce"
                      style={{ animationDelay: "0.4s" }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div
        className="w-full border-t border-gray-800 flex-shrink-0 relative z-10"
        style={{ backgroundColor: "#1a1d20" }}
      >
        <div className="w-full mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4 max-w-4xl">
          <div className="relative flex items-end gap-2 bg-gray-900 rounded-2xl border-2 border-gray-800 focus-within:border-blue-500 transition-colors p-1">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              disabled={!sessionInitialized}
              rows={1}
              className="flex-1 px-3 py-2 sm:px-4 sm:py-3 bg-transparent border-0 text-sm sm:text-base text-gray-100 placeholder-gray-400 focus:ring-0 focus:outline-none resize-none max-h-[150px] sm:max-h-[200px] overflow-y-auto scrollbar-thin disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading || !sessionInitialized}
              className="flex-shrink-0 m-1 px-3 py-2 sm:px-6 sm:py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl transition-all flex items-center justify-center gap-2 font-medium min-w-[60px] sm:min-w-auto"
            >
              <span className="hidden sm:inline">Send</span>
              <PaperAirplaneIcon className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-center text-gray-400 mt-2 sm:mt-3 hidden sm:block">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatPlayground;
