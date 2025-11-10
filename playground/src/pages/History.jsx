import { useState, useEffect } from "react";
import { historyAPI } from "../services/api";
import {
  ClockIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";

const History = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(false);

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
      // API returns { success: true, conversation: {...} }
      setSelectedConversation(data.conversation || data);
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

  const handleClean = async () => {
    if (!confirm("Are you sure you want to clean old conversations?")) return;

    try {
      await historyAPI.clean();
      loadHistory();
      setSelectedConversation(null);
    } catch (error) {
      console.error("Failed to clean history:", error);
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
    } catch (e) {
      return "Unknown date";
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-950 dark:to-dark-900">
      {/* Conversations list */}
      <div className="w-80 bg-white dark:bg-dark-900 border-r border-gray-200 dark:border-dark-800 flex flex-col shadow-xl">
        <div className="p-6 border-b border-gray-200 dark:border-dark-800 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-dark-800 dark:to-dark-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Conversations
            </h2>
            <button
              onClick={handleClean}
              className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-lg hover:bg-white dark:hover:bg-dark-700 transition-all"
              title="Clean old conversations"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={loadHistory}
            className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-sm font-medium text-white rounded-lg transition-all shadow-lg"
          >
            Refresh
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-500 dark:text-gray-400 text-sm">
                Loading...
              </div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-4 text-center">
              <ChatBubbleLeftRightIcon className="w-16 h-16 mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                No conversations yet
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Start chatting to see your history here
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={`w-full text-left p-4 rounded-xl transition-all ${
                    selectedConversation?.id === conv.id
                      ? "bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-2 border-blue-200 dark:border-blue-800 shadow-md"
                      : "bg-gray-50 dark:bg-dark-800 hover:bg-gray-100 dark:hover:bg-dark-700 border border-gray-200 dark:border-dark-700"
                  }`}
                >
                  <div className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-1 line-clamp-2">
                    {conv.firstUserMessage ||
                      conv.title ||
                      `Conversation ${conv.id}`}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(conv.startedAt)}
                    </div>
                    {conv.messageCount && (
                      <div className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
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
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            <div className="bg-white dark:bg-dark-900 border-b border-gray-200 dark:border-dark-800 px-8 py-6 shadow-sm">
              <div className="flex items-center justify-between max-w-5xl mx-auto">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    {selectedConversation.firstUserMessage ||
                      selectedConversation.title ||
                      "Conversation Details"}
                  </h3>
                  {selectedConversation.startedAt && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(selectedConversation.startedAt)}
                    </p>
                  )}
                </div>
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
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white rounded-xl flex items-center gap-2 transition-all shadow-lg font-medium"
                >
                  <ArrowDownTrayIcon className="w-5 h-5" />
                  Export
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin p-8">
              <div className="max-w-5xl mx-auto space-y-4">
                {selectedConversation.messages &&
                selectedConversation.messages.length > 0 ? (
                  selectedConversation.messages.map((message, index) => (
                    <div
                      key={index}
                      className={`p-5 rounded-2xl shadow-sm ${
                        message.role === "user"
                          ? "bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800"
                          : "bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className={`text-xs font-bold uppercase tracking-wider ${
                            message.role === "user"
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-purple-600 dark:text-purple-400"
                          }`}
                        >
                          {message.role === "user" ? "You" : "Sage AI"}
                        </div>
                      </div>
                      <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    No messages in this conversation
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md px-6">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 flex items-center justify-center">
                <ClockIcon className="w-12 h-12 text-blue-500 dark:text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                No conversation selected
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
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
