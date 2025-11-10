import { useState } from "react";
import { useApp } from "../contexts/AppContext";
import {
  ChatBubbleLeftRightIcon,
  CircleStackIcon,
  ClockIcon,
  DocumentTextIcon,
  Bars3Icon,
  XMarkIcon,
  ServerIcon,
  SunIcon,
  MoonIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

const navigation = [
  { name: "Chat", icon: ChatBubbleLeftRightIcon, id: "chat" },
  { name: "Memory", icon: CircleStackIcon, id: "memory" },
  { name: "History", icon: ClockIcon, id: "history" },
  { name: "API Docs", icon: DocumentTextIcon, id: "docs" },
];

const Layout = ({ children, currentView, onViewChange }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const {
    serverStatus,
    serverInfo,
    darkMode,
    toggleDarkMode,
    sidebarCollapsed,
    toggleSidebar,
  } = useApp();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-950">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-white dark:bg-dark-900 border-r border-gray-200 dark:border-dark-800 transform transition-all duration-300 ease-in-out shadow-xl ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 ${
          sidebarCollapsed ? "lg:w-16" : "lg:w-64"
        } ${sidebarOpen ? "w-64" : "w-0"}`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-dark-800 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-dark-800 dark:to-dark-800">
            <div
              className={`flex items-center gap-3 ${sidebarCollapsed ? "lg:justify-center lg:w-full" : ""}`}
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg flex-shrink-0">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              {!sidebarCollapsed && (
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                  Sage
                </h1>
              )}
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-white dark:hover:bg-dark-700"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto scrollbar-thin">
            {navigation.map(item => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onViewChange(item.id);
                    setSidebarOpen(false);
                  }}
                  title={sidebarCollapsed ? item.name : ""}
                  className={`w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-xl transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-800"
                  } ${sidebarCollapsed ? "lg:justify-center" : ""}`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span>{item.name}</span>}
                </button>
              );
            })}
          </nav>

          {/* Bottom section */}
          <div className="px-2 py-4 border-t border-gray-200 dark:border-dark-800 space-y-2">
            {/* Collapse button - desktop only */}
            <button
              onClick={toggleSidebar}
              className="hidden lg:flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-800 rounded-xl transition-all"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? (
                <ChevronRightIcon className="w-5 h-5 flex-shrink-0 mx-auto" />
              ) : (
                <>
                  <ChevronLeftIcon className="w-5 h-5 flex-shrink-0" />
                  <span>Collapse</span>
                </>
              )}
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggleDarkMode}
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-800 rounded-xl transition-all ${
                sidebarCollapsed ? "lg:justify-center" : ""
              }`}
            >
              {darkMode ? (
                <>
                  <SunIcon className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span>Light Mode</span>}
                </>
              ) : (
                <>
                  <MoonIcon className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span>Dark Mode</span>}
                </>
              )}
            </button>

            {/* Server status */}
            {!sidebarCollapsed && (
              <div className="px-3 py-3 bg-gray-50 dark:bg-dark-800 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <ServerIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Server Status
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      serverStatus === "healthy"
                        ? "bg-green-500 animate-pulse"
                        : serverStatus === "checking"
                          ? "bg-yellow-500 animate-pulse"
                          : "bg-red-500"
                    }`}
                  />
                  <span
                    className={`text-xs font-semibold ${
                      serverStatus === "healthy"
                        ? "text-green-600 dark:text-green-400"
                        : serverStatus === "checking"
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {serverStatus === "healthy"
                      ? "Online"
                      : serverStatus === "checking"
                        ? "Checking..."
                        : "Offline"}
                  </span>
                </div>
                {serverInfo && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    v{serverInfo.version}
                  </div>
                )}
              </div>
            )}

            {/* Collapsed server status indicator */}
            {sidebarCollapsed && (
              <div className="hidden lg:flex justify-center">
                <div
                  className={`w-2 h-2 rounded-full ${
                    serverStatus === "healthy"
                      ? "bg-green-500 animate-pulse"
                      : serverStatus === "checking"
                        ? "bg-yellow-500 animate-pulse"
                        : "bg-red-500"
                  }`}
                  title={`Server: ${serverStatus}`}
                />
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div
        className={`transition-all duration-300 ${sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"}`}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-white dark:bg-dark-900 border-b border-gray-200 dark:border-dark-800 shadow-sm">
          <div className="flex items-center justify-between h-full px-4 sm:px-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-800"
              >
                <Bars3Icon className="w-6 h-6" />
              </button>

              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {navigation.find(n => n.id === currentView)?.name ||
                  "Sage Playground"}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
