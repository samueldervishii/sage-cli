import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Session management
let sessionId = null;

// Interceptor to add session ID to requests
api.interceptors.request.use(config => {
  if (sessionId) {
    config.headers["X-Session-ID"] = sessionId;
  } else {
    console.error("No session ID available for request");
  }
  return config;
});

// Interceptor to capture session ID from responses
api.interceptors.response.use(response => {
  // Try multiple variations of the header name (case-insensitive)
  const headers = response.headers;
  const newSessionId =
    headers["x-session-id"] ||
    headers["X-Session-ID"] ||
    headers["X-Session-Id"] ||
    // Axios might lowercase all headers, so check explicitly
    Object.keys(headers).find(key => key.toLowerCase() === "x-session-id")
      ? headers[
          Object.keys(headers).find(key => key.toLowerCase() === "x-session-id")
        ]
      : null;

  if (newSessionId) {
    sessionId = newSessionId;
  }
  return response;
});

// Chat API
export const chatAPI = {
  initialize: async (conversationId = null) => {
    const response = await api.post(
      "/api/chat/initialize",
      conversationId ? { conversationId } : {}
    );
    // Session ID should be captured by interceptor from headers
    // But also try to get from body as ultimate fallback
    if (response.data.sessionId && !sessionId) {
      sessionId = response.data.sessionId;
    }

    if (!sessionId) {
      console.error("No session ID captured!");
      throw new Error("Failed to get session ID from server");
    }
    return response.data;
  },

  send: async message => {
    // Make sure we have a session
    if (!sessionId) {
      await chatAPI.initialize();
    }

    const response = await api.post("/api/chat/send", {
      message,
    });
    return response.data;
  },

  status: async () => {
    const response = await api.get("/api/chat/status");
    return response.data;
  },

  clearSession: async () => {
    const response = await api.delete("/api/chat/session");
    sessionId = null; // Clear local session ID
    return response.data;
  },

  getSessionId: () => sessionId,

  // Model configuration
  getConfig: async () => {
    const response = await api.get("/api/chat/config");
    return response.data;
  },

  updateConfig: async params => {
    const response = await api.post("/api/chat/config", params);
    return response.data;
  },

  resetConfig: async () => {
    const response = await api.post("/api/chat/config/reset");
    return response.data;
  },
};

// Memory API
export const memoryAPI = {
  list: async (limit = 50) => {
    const response = await api.get("/api/memory/list", {
      params: { limit },
    });
    return response.data;
  },

  search: async query => {
    const response = await api.get("/api/memory/search", {
      params: { query },
    });
    return response.data;
  },

  add: async (content, category = "general") => {
    const response = await api.post("/api/memory/add", {
      content,
      category,
    });
    return response.data;
  },

  clear: async () => {
    const response = await api.delete("/api/memory/clear");
    return response.data;
  },

  stats: async () => {
    const response = await api.get("/api/memory/stats");
    return response.data;
  },
};

// History API
export const historyAPI = {
  list: async (limit = 10) => {
    const response = await api.get("/api/history/list", {
      params: { limit },
    });
    return response.data;
  },

  get: async id => {
    const response = await api.get(`/api/history/${id}`);
    return response.data;
  },

  export: async id => {
    const response = await api.get(`/api/history/${id}/export`);
    return response.data;
  },

  delete: async id => {
    const response = await api.delete(`/api/history/${id}`);
    return response.data;
  },

  deleteAll: async () => {
    const response = await api.delete("/api/history/all");
    return response.data;
  },

  clean: async () => {
    const response = await api.delete("/api/history/clean");
    return response.data;
  },

  storageInfo: async () => {
    const response = await api.get("/api/history/info/storage");
    return response.data;
  },
};

// Health check
export const healthCheck = async () => {
  const response = await api.get("/health");
  return response.data;
};

export default api;
