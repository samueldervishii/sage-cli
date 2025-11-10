import { useState, useEffect } from "react";
import { memoryAPI } from "../services/api";
import {
  MagnifyingGlassIcon,
  TrashIcon,
  PlusIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

const MemoryExplorer = () => {
  const [memories, setMemories] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMemory, setNewMemory] = useState("");

  useEffect(() => {
    loadMemories();
    loadStats();
  }, []);

  const loadMemories = async () => {
    setLoading(true);
    try {
      const data = await memoryAPI.list();
      setMemories(data.memories || []);
    } catch (error) {
      console.error("Failed to load memories:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await memoryAPI.stats();
      setStats(data.stats || data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const data = await memoryAPI.search(searchQuery);
      setSearchResults(data.results || data.memories || []);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMemory = async () => {
    if (!newMemory.trim()) return;

    try {
      await memoryAPI.add(newMemory);
      setNewMemory("");
      setShowAddModal(false);
      loadMemories();
      loadStats();
    } catch (error) {
      console.error("Failed to add memory:", error);
    }
  };

  const handleClearAll = async () => {
    if (
      !confirm(
        "Are you sure you want to clear all memories? This cannot be undone."
      )
    )
      return;

    try {
      await memoryAPI.clear();
      setMemories([]);
      setSearchResults([]);
      loadStats();
    } catch (error) {
      console.error("Failed to clear memories:", error);
    }
  };

  const formatDate = dateString => {
    if (!dateString) return "";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return "";
    }
  };

  const displayedMemories = searchQuery.trim() ? searchResults : memories;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-dark-950 dark:via-dark-950 dark:to-dark-900">
      {/* Header */}
      <div className="bg-white dark:bg-dark-900 border-b border-gray-200 dark:border-dark-800 shadow-sm">
        <div className="max-w-6xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                <SparklesIcon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Memory Explorer
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Manage AI memories and learned information
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddModal(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl flex items-center gap-2 transition-all shadow-lg font-medium"
              >
                <PlusIcon className="w-5 h-5" />
                Add Memory
              </button>
              <button
                onClick={handleClearAll}
                className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-xl flex items-center gap-2 transition-all shadow-lg font-medium"
              >
                <TrashIcon className="w-5 h-5" />
                Clear All
              </button>
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl p-5 border border-blue-200 dark:border-blue-800 shadow-sm">
                <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1">
                  Total Memories
                </div>
                <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                  {stats.totalMemories || 0}
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-2xl p-5 border border-purple-200 dark:border-purple-800 shadow-sm">
                <div className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-1">
                  Categories
                </div>
                <div className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                  {stats.categories ? Object.keys(stats.categories).length : 0}
                </div>
              </div>
              <div className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20 rounded-2xl p-5 border border-pink-200 dark:border-pink-800 shadow-sm">
                <div className="text-sm font-semibold text-pink-600 dark:text-pink-400 mb-1">
                  Most Accessed
                </div>
                <div className="text-lg font-bold text-pink-700 dark:text-pink-300 line-clamp-2">
                  {stats.mostAccessed?.content || "N/A"}
                </div>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="Search memories..."
                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-dark-800 border-2 border-gray-200 dark:border-dark-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-800 hover:to-gray-700 text-white rounded-xl transition-all shadow-lg font-medium"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Memories list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500 dark:text-gray-400 text-lg">
              Loading...
            </div>
          </div>
        ) : displayedMemories.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md px-6">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 flex items-center justify-center">
                <SparklesIcon className="w-12 h-12 text-purple-500 dark:text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {searchQuery ? "No results found" : "No memories yet"}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {searchQuery
                  ? "Try a different search query"
                  : "Start adding memories to help Sage remember important information"}
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto py-8 px-8 space-y-4">
            {displayedMemories.map((memory, index) => (
              <div
                key={memory.id || index}
                className="bg-white dark:bg-dark-800 border-2 border-gray-200 dark:border-dark-700 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-gray-900 dark:text-gray-100 leading-relaxed text-lg">
                      {memory.content || memory.text || memory}
                    </p>
                    <div className="flex items-center gap-4 mt-3">
                      {memory.category && (
                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-full">
                          {memory.category}
                        </span>
                      )}
                      {memory.timestamp && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(memory.timestamp)}
                        </span>
                      )}
                      {memory.accessCount !== undefined && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Accessed {memory.accessCount} times
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add memory modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-900 rounded-2xl p-8 max-w-lg w-full shadow-2xl border border-gray-200 dark:border-dark-700">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Add New Memory
            </h3>
            <textarea
              value={newMemory}
              onChange={e => setNewMemory(e.target.value)}
              placeholder="Enter something for Sage to remember..."
              rows={4}
              autoFocus
              className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-800 border-2 border-gray-200 dark:border-dark-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-6 resize-none"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewMemory("");
                }}
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-dark-800 dark:hover:bg-dark-700 text-gray-900 dark:text-gray-100 rounded-xl transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMemory}
                disabled={!newMemory.trim()}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:from-gray-300 disabled:to-gray-300 dark:disabled:from-dark-700 dark:disabled:to-dark-700 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-lg disabled:shadow-none font-medium"
              >
                Add Memory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemoryExplorer;
