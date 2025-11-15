import { useState, useEffect } from "react";
import { historyAPI } from "../services/api";
import {
  ClockIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  ChatBubbleLeftRightIcon,
  ChevronLeftIcon,
} from "@heroicons/react/24/outline";

const History = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await historyAPI.list();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async id => {
    try {
      const data = await historyAPI.get(id);
      setSelectedConversation(data.conversation || data);
      setShowDetail(true);
    } catch (error) {
      console.error("Failed to load conversation:", error);
    }
  };

  const handleExport = async id => {
    try {
      const data = await historyAPI.export(id);
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `conversation-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export conversation:", error);
    }
  };

  const handleDelete = async id => {
    if (!confirm("Are you sure you want to delete this conversation?")) return;

    try {
      await historyAPI.delete(id);
      loadHistory();
      if (selectedConversation?.id === id) {
        setSelectedConversation(null);
        setShowDetail(false);
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  };

  const handleDeleteAll = async () => {
    if (
      !confirm(
        "Are you sure you want to delete ALL conversations? This action cannot be undone."
      )
    )
      return;

    try {
      await historyAPI.deleteAll();
      loadHistory();
      setSelectedConversation(null);
      setShowDetail(false);
    } catch (error) {
      console.error("Failed to delete all conversations:", error);
    }
  };

  const formatDate = dateString => {
    if (!dateString) return "Unknown date";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Unknown date";
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-gray-50 dark:bg-[#1a1d20]">
      {/* Conversations list */}
      <div
        className={`${showDetail ? "hidden" : "flex"} lg:flex lg:w-80 xl:w-96 w-full flex-col border-r border-gray-300 dark:border-gray-800`}
      >
        <div className="p-4 sm:p-6 border-b border-gray-300 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
              Conversations
            </h2>
            <button
              onClick={handleDeleteAll}
              className="p-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-white dark:bg-gray-800 transition-all"
              title="Delete all conversations"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={loadHistory}
            className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-sm font-medium text-white rounded-lg transition-all"
          >
            Refresh
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-400 text-sm">Loading...</div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-4 text-center">
              <ChatBubbleLeftRightIcon className="w-12 h-12 sm:w-16 sm:h-16 mb-3 text-gray-600" />
              <p className="text-sm font-medium text-gray-400">
                No conversations yet
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Start chatting to see your history here
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={`w-full text-left p-3 sm:p-4 rounded-xl transition-all ${
                    selectedConversation?.id === conv.id
                      ? "bg-blue-50 dark:bg-gray-800 border-2 border-blue-500 dark:border-gray-700"
                      : "bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-800"
                  }`}
                >
                  <div className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-1 line-clamp-2">
                    {conv.firstUserMessage ||
                      conv.title ||
                      `Conversation ${conv.id}`}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-xs text-gray-400">
                      {formatDate(conv.startedAt)}
                    </div>
                    {conv.messageCount && (
                      <div className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full font-medium">
                        {conv.messageCount} msgs
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Conversation detail */}
      <div
        className={`${showDetail ? "flex" : "hidden"} lg:flex flex-1 flex-col`}
      >
        {selectedConversation ? (
          <>
            <div className="border-b border-gray-300 dark:border-gray-800 px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
              <div className="flex items-center justify-between max-w-5xl mx-auto">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => setShowDetail(false)}
                    className="lg:hidden p-2 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-white dark:bg-gray-800 flex-shrink-0"
                  >
                    <ChevronLeftIcon className="w-5 h-5" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white mb-1 truncate">
                      {selectedConversation.firstUserMessage ||
                        selectedConversation.title ||
                        "Conversation Details"}
                    </h3>
                    {selectedConversation.startedAt && (
                      <p className="text-xs sm:text-sm text-gray-400">
                        {formatDate(selectedConversation.startedAt)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 ml-2">
                  <button
                    onClick={() =>
                      handleDelete(
                        selectedConversation?.id ||
                          selectedConversation?.conversation?.id
                      )
                    }
                    disabled={
                      !selectedConversation?.id &&
                      !selectedConversation?.conversation?.id
                    }
                    className="px-3 sm:px-5 py-2 sm:py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg sm:rounded-xl flex items-center gap-2 transition-all font-medium text-sm flex-shrink-0"
                  >
                    <TrashIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                  <button
                    onClick={() =>
                      handleExport(
                        selectedConversation?.id ||
                          selectedConversation?.conversation?.id
                      )
                    }
                    disabled={
                      !selectedConversation?.id &&
                      !selectedConversation?.conversation?.id
                    }
                    className="px-3 sm:px-5 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg sm:rounded-xl flex items-center gap-2 transition-all font-medium text-sm flex-shrink-0"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="hidden sm:inline">Export</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 sm:p-6 lg:p-8">
              <div className="max-w-5xl mx-auto space-y-3 sm:space-y-4">
                {selectedConversation.messages &&
                selectedConversation.messages.length > 0 ? (
                  selectedConversation.messages.map((message, index) => (
                    <div
                      key={index}
                      className={`p-4 sm:p-5 rounded-xl sm:rounded-2xl ${
                        message.role === "user"
                          ? "bg-blue-600 border border-blue-500"
                          : "bg-white dark:bg-gray-800 border border-gray-700"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className={`text-xs font-bold uppercase tracking-wider ${
                            message.role === "user"
                              ? "text-white"
                              : "text-gray-400"
                          }`}
                        >
                          {message.role === "user" ? "You" : "Sage AI"}
                        </div>
                      </div>
                      <p
                        className={`whitespace-pre-wrap leading-relaxed text-sm sm:text-base ${
                          message.role === "user"
                            ? "text-white"
                            : "text-gray-900 dark:text-gray-100"
                        }`}
                      >
                        {message.content}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    No messages in this conversation
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full px-4">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-2xl bg-white dark:bg-gray-800 flex items-center justify-center">
                <ClockIcon className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                No conversation selected
              </h3>
              <p className="text-sm sm:text-base text-gray-400">
                Select a conversation from the list to view its details and
                messages
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
