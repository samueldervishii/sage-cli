import { useState, useEffect } from "react";
import { memoryAPI } from "../services/api";
import { useToast } from "../contexts/ToastContext";
import {
  MagnifyingGlassIcon,
  TrashIcon,
  PlusIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

const MemoryExplorer = () => {
  const toast = useToast();
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
    if (!newMemory.trim()) {
      toast.warning("Please enter a memory to add");
      return;
    }

    try {
      await memoryAPI.add(newMemory);
      setNewMemory("");
      setShowAddModal(false);
      loadMemories();
      loadStats();
      toast.success("Memory added successfully");
    } catch (error) {
      console.error("Failed to add memory:", error);
      toast.error("Failed to add memory. Please try again.");
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
    } catch {
      return "";
    }
  };

  const displayedMemories = searchQuery.trim() ? searchResults : memories;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-gray-50 dark:bg-[#1a1d20]">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1d20]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                <SparklesIcon className="w-5 h-5 sm:w-7 sm:h-7 text-gray-700 dark:text-gray-300" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  Memory Explorer
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Manage AI memories
                </p>
              </div>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={() => setShowAddModal(true)}
                className="flex-1 sm:flex-none px-3 sm:px-5 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center gap-2 transition-all font-medium text-sm"
              >
                <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Add Memory</span>
                <span className="sm:hidden">Add</span>
              </button>
              <button
                onClick={handleClearAll}
                className="flex-1 sm:flex-none px-3 sm:px-5 py-2 sm:py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl flex items-center justify-center gap-2 transition-all font-medium text-sm"
              >
                <TrashIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Clear All</span>
                <span className="sm:hidden">Clear</span>
              </button>
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="bg-gray-200 dark:bg-gray-800 rounded-xl p-4 sm:p-5 border border-gray-700">
                <div className="text-xs sm:text-sm font-semibold text-gray-400 mb-1">
                  Total Memories
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.totalMemories || 0}
                </div>
              </div>
              <div className="bg-gray-200 dark:bg-gray-800 rounded-xl p-4 sm:p-5 border border-gray-700">
                <div className="text-xs sm:text-sm font-semibold text-gray-400 mb-1">
                  Categories
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.categories ? Object.keys(stats.categories).length : 0}
                </div>
              </div>
              <div className="bg-gray-200 dark:bg-gray-800 rounded-xl p-4 sm:p-5 border border-gray-700">
                <div className="text-xs sm:text-sm font-semibold text-gray-400 mb-1">
                  Most Accessed
                </div>
                <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white line-clamp-2">
                  {stats.mostAccessed?.content || "N/A"}
                </div>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="flex gap-2 sm:gap-3">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="Search memories..."
                className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2 sm:py-3 text-sm sm:text-base bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-800 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 transition-all"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl transition-all font-medium text-sm sm:text-base"
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
            <div className="text-gray-400 text-base sm:text-lg">Loading...</div>
          </div>
        ) : displayedMemories.length === 0 ? (
          <div className="flex items-center justify-center h-full px-4">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-2xl bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
                <SparklesIcon className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {searchQuery ? "No results found" : "No memories yet"}
              </h3>
              <p className="text-sm sm:text-base text-gray-400">
                {searchQuery
                  ? "Try a different search query"
                  : "Start adding memories to help Sage remember important information"}
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto py-4 sm:py-8 px-4 sm:px-6 lg:px-8 space-y-3 sm:space-y-4">
            {displayedMemories.map((memory, index) => (
              <div
                key={memory.id || index}
                className="bg-gray-200 dark:bg-gray-800 border-2 border-gray-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:border-gray-600 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-gray-100 leading-relaxed text-sm sm:text-lg">
                      {memory.content || memory.text || memory}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 sm:mt-3">
                      {memory.category && (
                        <span className="px-2 sm:px-3 py-1 bg-gray-700 text-gray-300 text-xs font-semibold rounded-full">
                          {memory.category}
                        </span>
                      )}
                      {memory.timestamp && (
                        <span className="text-xs text-gray-400">
                          {formatDate(memory.timestamp)}
                        </span>
                      )}
                      {memory.accessCount !== undefined && (
                        <span className="text-xs text-gray-400">
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
          <div className="bg-gray-200 dark:bg-gray-800 rounded-2xl p-6 sm:p-8 max-w-lg w-full border border-gray-700">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
              Add New Memory
            </h3>
            <textarea
              value={newMemory}
              onChange={e => setNewMemory(e.target.value)}
              placeholder="Enter something for Sage to remember..."
              rows={4}
              autoFocus
              className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 mb-4 sm:mb-6 resize-none"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewMemory("");
                }}
                className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-xl transition-all font-medium text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMemory}
                disabled={!newMemory.trim()}
                className="px-4 sm:px-6 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl transition-all font-medium text-sm sm:text-base"
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
