import { createContext, useContext, useState, useEffect } from "react";
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
    const savedMode = localStorage.getItem("darkMode");
    return savedMode !== null ? JSON.parse(savedMode) : true;
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const savedCollapsed = localStorage.getItem("sidebarCollapsed");
    return savedCollapsed !== null ? JSON.parse(savedCollapsed) : false;
  });

  const [onNewChatCallback, setOnNewChatCallback] = useState(null);

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
