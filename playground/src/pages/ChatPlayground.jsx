import { useState, useRef, useEffect } from "react";
import { chatAPI } from "../services/api";
import { useApp } from "../contexts/AppContext";
import { useToast } from "../contexts/ToastContext";
import {
  PaperAirplaneIcon,
  SparklesIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const ChatPlayground = ({ onModelChange, currentModel = "gemini" }) => {
  const { setOnNewChatCallback } = useApp();
  const toast = useToast();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionInitialized, setSessionInitialized] = useState(false);
  const [streamingMessageIndex, setStreamingMessageIndex] = useState(null);
  const [streamingText, setStreamingText] = useState("");
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const streamingIntervalRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText]);

  // Streaming effect for AI responses
  useEffect(() => {
    console.log("[Streaming] Effect triggered", {
      messagesLength: messages.length,
      streamingMessageIndex,
      lastMessage: messages[messages.length - 1],
    });

    // Clean up any existing interval
    if (streamingIntervalRef.current) {
      clearInterval(streamingIntervalRef.current);
      streamingIntervalRef.current = null;
    }

    // Check if the last message is from assistant and not already streaming
    const lastMessage = messages[messages.length - 1];
    if (
      lastMessage &&
      lastMessage.role === "assistant" &&
      streamingMessageIndex !== messages.length - 1
    ) {
      console.log("[Streaming] Starting stream for message", {
        index: messages.length - 1,
        content: lastMessage.content,
      });

      // Start streaming animation
      setStreamingMessageIndex(messages.length - 1);
      setStreamingText("");

      const fullText = lastMessage.content;
      let currentIndex = 0;

      // Streaming speed: adjust this value (lower = faster, higher = slower)
      const streamingSpeed = 15; // milliseconds per character

      streamingIntervalRef.current = setInterval(() => {
        if (currentIndex < fullText.length) {
          setStreamingText(fullText.substring(0, currentIndex + 1));
          currentIndex++;
        } else {
          // Streaming complete
          clearInterval(streamingIntervalRef.current);
          streamingIntervalRef.current = null;
          setStreamingMessageIndex(null);
          setStreamingText("");
        }
      }, streamingSpeed);
    }

    // Cleanup on unmount
    return () => {
      if (streamingIntervalRef.current) {
        clearInterval(streamingIntervalRef.current);
      }
    };
  }, [messages]); // Only depend on messages, not streamingMessageIndex

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
        // Fetch and notify parent of current model
        const config = await chatAPI.getConfig();
        if (config.success && config.config?.selectedModel && onModelChange) {
          onModelChange(config.config.selectedModel);
        }
      } catch (error) {
        console.error("Failed to initialize session:", error);
        // Show error toast to user
        toast.error(
          `Failed to initialize session: ${error.message}. Please refresh the page.`
        );
      }
    };
    initSession();
  }, [onModelChange]);

  const startNewChat = async () => {
    try {
      await chatAPI.clearSession();
      setMessages([]);
      // Reinitialize session
      await chatAPI.initialize();
      setSessionInitialized(true);
      // Fetch and notify parent of current model
      const config = await chatAPI.getConfig();
      if (config.success && config.config?.selectedModel && onModelChange) {
        onModelChange(config.config.selectedModel);
      }
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

      console.log("[ChatPlayground] Received response:", response);
      console.log("[ChatPlayground] Reply field:", response.reply);

      const assistantMessage = {
        role: "assistant",
        content:
          response.reply ||
          response.response ||
          response.message ||
          "No response",
      };

      console.log("[ChatPlayground] Assistant message:", assistantMessage);
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

      // Show error toast
      toast.error(`Error: ${errorMsg}`);
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

  const getModelDisplayName = model => {
    if (model === "gemini") return "Gemini 2.0";
    if (model === "deepseek") return "DeepSeek R1";
    return model;
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-gray-50 dark:bg-[#1a1d20]">
      {/* Messages area */}
      <div className="flex-1 w-full overflow-y-auto scrollbar-thin">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full px-4">
            <div className="text-center max-w-2xl">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
                Sage AI Studio
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Your AI playground with customizable model parameters
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Click the settings icon in the top right to configure model
                parameters
              </p>
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
                    <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700 dark:text-gray-300" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <SparklesIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700 dark:text-gray-300" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                      {message.role === "user" ? "You" : "Sage AI"}
                    </span>
                    {message.role === "assistant" && (
                      <span className="text-[10px] sm:text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700/50 text-gray-700 dark:text-gray-400 rounded">
                        {getModelDisplayName(currentModel)}
                      </span>
                    )}
                  </div>
                  <div
                    className={`rounded-2xl px-3 py-2 sm:px-5 sm:py-3 ${
                      message.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700"
                    }`}
                  >
                    <div className="prose prose-sm sm:prose-base max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-pre:my-2 prose-code:text-sm">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => (
                            <p className="whitespace-pre-wrap leading-relaxed my-1">
                              {children}
                            </p>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-bold">{children}</strong>
                          ),
                          em: ({ children }) => (
                            <em className="italic">{children}</em>
                          ),
                          code: ({ inline, children, ...props }) =>
                            inline ? (
                              <code
                                className={`px-1.5 py-0.5 rounded text-sm font-mono ${
                                  message.role === "user"
                                    ? "bg-blue-700"
                                    : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                }`}
                                {...props}
                              >
                                {children}
                              </code>
                            ) : (
                              <code
                                className={`block px-4 py-3 rounded-lg text-sm font-mono overflow-x-auto ${
                                  message.role === "user"
                                    ? "bg-blue-700"
                                    : "bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                }`}
                                {...props}
                              >
                                {children}
                              </code>
                            ),
                          pre: ({ children }) => (
                            <pre className="my-2 overflow-x-auto">
                              {children}
                            </pre>
                          ),
                          ul: ({ children }) => (
                            <ul
                              className={`list-disc list-inside my-1 space-y-0.5 ${
                                message.role === "user"
                                  ? "text-white"
                                  : "text-gray-900 dark:text-gray-100"
                              }`}
                            >
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ol
                              className={`list-decimal list-inside my-1 space-y-0.5 ${
                                message.role === "user"
                                  ? "text-white"
                                  : "text-gray-900 dark:text-gray-100"
                              }`}
                            >
                              {children}
                            </ol>
                          ),
                          li: ({ children }) => (
                            <li className="my-0.5">{children}</li>
                          ),
                          h1: ({ children }) => (
                            <h1 className="text-xl sm:text-2xl font-bold my-2">
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-lg sm:text-xl font-bold my-2">
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-base sm:text-lg font-bold my-2">
                              {children}
                            </h3>
                          ),
                          blockquote: ({ children }) => (
                            <blockquote
                              className={`border-l-4 pl-4 my-2 italic ${
                                message.role === "user"
                                  ? "border-blue-400"
                                  : "border-gray-400 dark:border-gray-600"
                              }`}
                            >
                              {children}
                            </blockquote>
                          ),
                        }}
                      >
                        {index === streamingMessageIndex
                          ? streamingText
                          : message.content}
                      </ReactMarkdown>
                      {index === streamingMessageIndex && (
                        <span className="inline-block w-1.5 h-4 ml-0.5 bg-gray-900 dark:bg-gray-100 animate-pulse" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex gap-1.5 px-3 sm:px-5">
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
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="w-full border-t border-gray-200 dark:border-gray-800 flex-shrink-0 relative z-10 bg-gray-50 dark:bg-[#1a1d20]">
        <div className="w-full mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4 max-w-4xl">
          <div className="relative flex items-end gap-2 bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-300 dark:border-gray-800 focus-within:border-blue-500 transition-colors p-1">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              disabled={!sessionInitialized}
              rows={1}
              className="flex-1 px-3 py-2 sm:px-4 sm:py-3 bg-transparent border-0 text-sm sm:text-base text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-0 focus:outline-none resize-none max-h-[150px] sm:max-h-[200px] overflow-y-auto scrollbar-thin disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading || !sessionInitialized}
              className="flex-shrink-0 m-1 px-3 py-2 sm:px-6 sm:py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl transition-all flex items-center justify-center gap-2 font-medium min-w-[60px] sm:min-w-auto"
            >
              <span className="hidden sm:inline">Send</span>
              <PaperAirplaneIcon className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2 sm:mt-3 hidden sm:block">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatPlayground;
