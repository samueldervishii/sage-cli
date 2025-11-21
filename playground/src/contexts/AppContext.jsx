import { createContext, useContext, useState, useEffect, useRef } from "react";
import { healthCheck } from "../services/api";

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [serverStatus, setServerStatus] = useState("checking");
  const [serverInfo, setServerInfo] = useState(null);

  // Initialize dark mode from localStorage or default to true
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const savedMode = localStorage.getItem("darkMode");
      return savedMode !== null ? JSON.parse(savedMode) : true;
    } catch (error) {
      console.error("Failed to read darkMode from localStorage:", error);
      return true; // Default to dark mode
    }
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const savedCollapsed = localStorage.getItem("sidebarCollapsed");
      return savedCollapsed !== null ? JSON.parse(savedCollapsed) : false;
    } catch (error) {
      console.error(
        "Failed to read sidebarCollapsed from localStorage:",
        error
      );
      return false;
    }
  });

  // Use ref instead of state for callback to avoid unnecessary re-renders
  const onNewChatCallbackRef = useRef(null);

  const checkServerHealth = async () => {
    try {
      const data = await healthCheck();
      setServerStatus("healthy");
      setServerInfo(data);
    } catch {
      setServerStatus("error");
      setServerInfo(null);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkServerHealth();
    const interval = setInterval(checkServerHealth, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  // Apply dark mode class to document and save to localStorage
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev);
  };

  // Setter for new chat callback
  const setOnNewChatCallback = callback => {
    onNewChatCallbackRef.current = callback;
  };

  // Getter/caller for new chat callback
  const onNewChatCallback = () => {
    if (onNewChatCallbackRef.current) {
      onNewChatCallbackRef.current();
    }
  };

  const value = {
    serverStatus,
    serverInfo,
    darkMode,
    toggleDarkMode,
    checkServerHealth,
    sidebarCollapsed,
    toggleSidebar,
    onNewChatCallback,
    setOnNewChatCallback,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
