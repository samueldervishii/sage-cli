import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback(id => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback((message, type = "info", duration = 5000) => {
    let toastId = null;

    setToasts(prevToasts => {
      // Check for duplicate toasts (same message and type)
      const isDuplicate = prevToasts.some(
        toast => toast.message === message && toast.type === type
      );

      // Don't add if duplicate already exists
      if (isDuplicate) {
        return prevToasts;
      }

      // Create new toast only if not duplicate
      const id = Date.now() + Math.random();
      toastId = id;
      const newToast = { id, message, type, duration };

      return [...prevToasts, newToast];
    });

    return toastId;
  }, []);

  const success = useCallback(
    (message, duration) => addToast(message, "success", duration),
    [addToast]
  );

  const error = useCallback(
    (message, duration) => addToast(message, "error", duration),
    [addToast]
  );

  const warning = useCallback(
    (message, duration) => addToast(message, "warning", duration),
    [addToast]
  );

  const info = useCallback(
    (message, duration) => addToast(message, "info", duration),
    [addToast]
  );

  const value = useMemo(
    () => ({
      toasts,
      addToast,
      removeToast,
      success,
      error,
      warning,
      info,
    }),
    [toasts, addToast, removeToast, success, error, warning, info]
  );

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
};
