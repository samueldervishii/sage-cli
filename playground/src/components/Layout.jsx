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
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

const navigation = [
  { name: "New chat", icon: PlusIcon, id: "chat" },
  { name: "Memory", icon: CircleStackIcon, id: "memory" },
  { name: "History", icon: ClockIcon, id: "history" },
  { name: "API Docs", icon: DocumentTextIcon, id: "docs" },
];

const Layout = ({ children, currentView, onViewChange }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true
  );
  const { serverStatus, sidebarCollapsed, toggleSidebar, onNewChatCallback } =
    useApp();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#1a1d20" }}>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 border-r border-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out 
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} 
          lg:translate-x-0 
          ${sidebarCollapsed ? "lg:w-16" : "lg:w-64"} 
          w-64 bg-[#1a1d20] z-[60] top-16 bottom-0 lg:inset-y-0`}
      >
        <div
          className={`h-full flex flex-col transform transition-transform duration-300 ease-in-out ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0`}
        >
          {/* Logo */}
          <div
            className="flex items-center justify-between h-16 px-4 border-b border-gray-800"
            style={{ backgroundColor: "#1a1d20" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <h1 className="text-lg font-bold text-white truncate truncate ml-3">
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
                      ? "bg-gray-800 text-white"
                      : "text-gray-300 hover:bg-gray-800"
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
          <div className="px-2 py-4 border-t border-gray-800 space-y-2">
            {/* Collapse button - desktop only */}
            <button
              onClick={toggleSidebar}
              className="hidden lg:flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 rounded-xl transition-all"
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
        <header
          className="sticky top-0 z-50 h-16 border-b border-gray-800 shadow-sm"
          style={{ backgroundColor: "#1a1d20" }}
        >
          <div className="flex items-center justify-between h-full px-4 sm:px-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-gray-800 z-50 relative transition-all duration-200"
                aria-label={sidebarOpen ? "Close menu" : "Open menu"}
              >
                {sidebarOpen ? (
                  <XMarkIcon className="w-6 h-6" />
                ) : (
                  <Bars3Icon className="w-6 h-6" />
                )}
              </button>
              {/* <span className="text-white font-semibold text-base">
                Sage AI Studio
              </span> */}
            </div>

            <button
              onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
              className="flex p-2 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-gray-800 z-50 relative"
              title={rightSidebarOpen ? "Hide info panel" : "Show info panel"}
            >
              <InformationCircleIcon className="w-6 h-6" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main
          className={`min-h-[calc(100vh-4rem)] transition-all duration-300 ${
            currentView === "chat" && rightSidebarOpen ? "lg:pr-80" : ""
          }`}
          style={{ backgroundColor: "#1a1d20" }}
        >
          {children}
        </main>
      </div>

      <aside
        className={`fixed right-0 top-16 bottom-0 w-full lg:w-80 border-l border-gray-800 transform transition-all duration-300 ease-in-out overflow-y-auto scrollbar-thin z-40 ${
          rightSidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ backgroundColor: "#1a1d20" }}
      >
        <div className="p-6 space-y-6">
          {/* Primary Model */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-white">
                Gemini 2.0 Flash Exp
              </h3>
              <span className="px-2 py-0.5 bg-green-600 text-white text-xs font-semibold rounded">
                New
              </span>
            </div>
            <div className="text-xs text-gray-400 mb-3">
              gemini-2.0-flash-exp
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-gray-400">
                <span className="w-2 h-2 bg-gray-600 rounded-full"></span>
                <span>Fast and efficient multimodal AI model</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <span className="w-2 h-2 bg-gray-600 rounded-full"></span>
                <span>Context: 1M tokens (1,048,576)</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <span className="w-2 h-2 bg-gray-600 rounded-full"></span>
                <span>Output: Up to 8,192 tokens</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <span className="w-2 h-2 bg-gray-600 rounded-full"></span>
                <span>Knowledge cutoff: Aug 2024</span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800"></div>

          {/* Fallback Model */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-white">
                DeepSeek R1 Distill
              </h3>
              <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded">
                Fallback
              </span>
            </div>
            <div className="text-xs text-gray-400 mb-3">
              deepseek-r1-distill-llama-70b
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2 text-gray-400">
                <span className="w-2 h-2 bg-gray-600 rounded-full mt-1 flex-shrink-0"></span>
                <span>70B reasoning model, free on OpenRouter</span>
              </div>
              <div className="flex items-start gap-2 text-gray-400">
                <span className="w-2 h-2 bg-gray-600 rounded-full mt-1 flex-shrink-0"></span>
                <span>Context: 128K tokens</span>
              </div>
              <div className="flex items-start gap-2 text-gray-400">
                <span className="w-2 h-2 bg-gray-600 rounded-full mt-1 flex-shrink-0"></span>
                <span>Output: Up to 32,768 tokens</span>
              </div>
              <div className="flex items-start gap-2 text-gray-400">
                <span className="w-2 h-2 bg-gray-600 rounded-full mt-1 flex-shrink-0"></span>
                <span>Automatically used on rate limits</span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800"></div>

          {/* Tips Section */}
          <div>
            <h3 className="text-sm font-bold text-white mb-3">
              Tips for getting started
            </h3>
            <div className="space-y-2 text-xs text-gray-400">
              <p className="flex items-start gap-2">
                <span className="text-gray-500 flex-shrink-0">→</span>
                <span>Click "New chat" in the sidebar to start fresh</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-gray-500 flex-shrink-0">→</span>
                <span>Check Memory to manage what I remember about you</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-gray-500 flex-shrink-0">→</span>
                <span>View History to see past conversations</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-gray-500 flex-shrink-0">→</span>
                <span>Ask me to remember things you tell me</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-gray-500 flex-shrink-0">→</span>
                <span>I can search the web for current info</span>
              </p>
            </div>
          </div>

          <div className="border-t border-gray-800"></div>

          {/* Status & Version at bottom */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Service Status</span>
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
                <span className="text-xs font-medium text-gray-300">
                  {serverStatus === "healthy"
                    ? "Healthy"
                    : serverStatus === "checking"
                      ? "Checking..."
                      : "Offline"}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Version</span>
              <span className="text-xs font-medium text-gray-300">v2.1.0</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default Layout;
