import { useState } from "react";
import { AppProvider } from "./contexts/AppContext";
import Layout from "./components/Layout";
import ChatPlayground from "./pages/ChatPlayground";
import MemoryExplorer from "./pages/MemoryExplorer";
import History from "./pages/History";
import ApiDocs from "./pages/ApiDocs";
import SettingsSidebarContent from "./components/SettingsSidebarContent";

function App() {
  const [currentView, setCurrentView] = useState("chat");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentModel, setCurrentModel] = useState("gemini");

  const handleConfigUpdate = newConfig => {
    if (newConfig?.selectedModel) {
      setCurrentModel(newConfig.selectedModel);
    }
  };

  const renderView = () => {
    switch (currentView) {
      case "chat":
        return (
          <ChatPlayground
            onModelChange={setCurrentModel}
            currentModel={currentModel}
          />
        );
      case "memory":
        return <MemoryExplorer />;
      case "history":
        return <History />;
      case "docs":
        return <ApiDocs />;
      default:
        return (
          <ChatPlayground
            onModelChange={setCurrentModel}
            currentModel={currentModel}
          />
        );
    }
  };

  const renderSettingsSidebar = () => {
    // Show settings on all views
    return <SettingsSidebarContent onConfigUpdate={handleConfigUpdate} />;
  };

  return (
    <AppProvider>
      <Layout
        currentView={currentView}
        onViewChange={setCurrentView}
        currentModel={currentView === "chat" ? currentModel : null}
        settingsOpen={settingsOpen}
        onSettingsToggle={() => setSettingsOpen(!settingsOpen)}
        settingsSidebar={renderSettingsSidebar()}
      >
        {renderView()}
      </Layout>
    </AppProvider>
  );
}

export default App;
