import { useState } from "react";
import { useApp } from "../contexts/AppContext";
import {
  CircleStackIcon,
  ClockIcon,
  DocumentTextIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

const navigation = [
  { name: "New chat", icon: PlusIcon, id: "chat" },
  { name: "Memory", icon: CircleStackIcon, id: "memory" },
  { name: "History", icon: ClockIcon, id: "history" },
  { name: "API Docs", icon: DocumentTextIcon, id: "docs" },
];

const Layout = ({
  children,
  currentView,
  onViewChange,
  currentModel,
  settingsOpen,
  onSettingsToggle,
  settingsSidebar,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const {
    serverStatus,
    serverInfo,
    sidebarCollapsed,
    toggleSidebar,
    onNewChatCallback,
  } = useApp();

  const getModelDisplayName = model => {
    if (model === "gemini") return "Gemini 2.0";
    if (model === "deepseek") return "DeepSeek R1";
    return model;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1a1d20]">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 border-r border-gray-200 dark:border-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
          ${sidebarCollapsed ? "lg:w-16" : "lg:w-64"}
          w-64 bg-white dark:bg-[#1a1d20] z-[60] top-16 bottom-0 lg:inset-y-0`}
      >
        <div
          className={`h-full flex flex-col transform transition-transform duration-300 ease-in-out ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0`}
        >
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1d20]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                <span className="text-gray-900 dark:text-white font-bold text-sm">
                  S
                </span>
              </div>
              {/* Always show on mobile, conditionally on desktop */}
              <h1
                className={`text-lg font-bold text-gray-900 dark:text-white truncate ${sidebarCollapsed ? "lg:hidden" : ""}`}
              >
                Sage AI Studio
              </h1>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto scrollbar-thin">
            {navigation.map(item => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === "chat" && onNewChatCallback) {
                      onNewChatCallback();
                      onViewChange(item.id);
                    } else {
                      onViewChange(item.id);
                    }
                    setSidebarOpen(false);
                  }}
                  title={sidebarCollapsed ? item.name : ""}
                  className={`w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-xl transition-all ${
                    isActive
                      ? "bg-blue-50 dark:bg-gray-800 text-blue-600 dark:text-white"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  } ${sidebarCollapsed ? "lg:justify-center" : ""}`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="lg:hidden">{item.name}</span>
                  <span
                    className={`hidden lg:block ${sidebarCollapsed ? "lg:hidden" : ""}`}
                  >
                    {item.name}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Bottom section */}
          <div className="px-2 py-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
            {/* Collapse button - desktop only */}
            <button
              onClick={toggleSidebar}
              className="hidden lg:flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? (
                <>
                  <ChevronRightIcon className="w-5 h-5 flex-shrink-0 mx-auto" />
                </>
              ) : (
                <>
                  <ChevronLeftIcon className="w-5 h-5 flex-shrink-0" />
                  <span>Collapse</span>
                </>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div
        className={`transition-all duration-300 ${sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"}`}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-50 h-16 border-b border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-[#1a1d20]">
          <div className="flex items-center justify-between h-full px-4 sm:px-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 z-50 relative transition-all duration-200"
                aria-label={sidebarOpen ? "Close menu" : "Open menu"}
              >
                {sidebarOpen ? (
                  <XMarkIcon className="w-6 h-6" />
                ) : (
                  <Bars3Icon className="w-6 h-6" />
                )}
              </button>
              {currentModel && (
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 rounded border border-gray-300 dark:border-gray-700">
                    {getModelDisplayName(currentModel)}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={onSettingsToggle}
              className="flex p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 z-50 relative"
              title={
                settingsOpen ? "Hide settings panel" : "Show settings panel"
              }
            >
              <Cog6ToothIcon className="w-6 h-6" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main
          className={`min-h-[calc(100vh-4rem)] transition-all duration-300 bg-gray-50 dark:bg-[#1a1d20] ${
            settingsOpen ? "lg:pr-80" : ""
          }`}
        >
          {children}
        </main>
      </div>

      {/* Settings Sidebar */}
      <aside
        className={`fixed right-0 top-16 bottom-0 w-full lg:w-80 border-l border-gray-200 dark:border-gray-800 transform transition-all duration-300 ease-in-out overflow-y-auto scrollbar-thin z-40 bg-white dark:bg-[#1a1d20] ${
          settingsOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Settings Content */}
          <div className="flex-1 overflow-y-auto">{settingsSidebar}</div>

          {/* Status & Version at bottom */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Service Status
              </span>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    serverStatus === "healthy"
                      ? "bg-green-500"
                      : serverStatus === "checking"
                        ? "bg-yellow-500"
                        : "bg-red-500"
                  }`}
                />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {serverStatus === "healthy"
                    ? "Healthy"
                    : serverStatus === "checking"
                      ? "Checking..."
                      : "Offline"}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Version
              </span>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {serverInfo?.version || "Unknown"}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default Layout;
