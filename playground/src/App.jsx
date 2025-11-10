import { useState } from "react";
import { AppProvider } from "./contexts/AppContext";
import Layout from "./components/Layout";
import ChatPlayground from "./pages/ChatPlayground";
import MemoryExplorer from "./pages/MemoryExplorer";
import History from "./pages/History";
import ApiDocs from "./pages/ApiDocs";

function App() {
  const [currentView, setCurrentView] = useState("chat");

  const renderView = () => {
    switch (currentView) {
      case "chat":
        return <ChatPlayground />;
      case "memory":
        return <MemoryExplorer />;
      case "history":
        return <History />;
      case "docs":
        return <ApiDocs />;
      default:
        return <ChatPlayground />;
    }
  };

  return (
    <AppProvider>
      <Layout currentView={currentView} onViewChange={setCurrentView}>
        {renderView()}
      </Layout>
    </AppProvider>
  );
}

export default App;
