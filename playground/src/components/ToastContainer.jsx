import { useEffect, useState } from "react";
import { useToast } from "../contexts/ToastContext";
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const Toast = ({ toast, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleRemove = () => {
    setIsExiting(true);
    setTimeout(() => {
      onRemove(toast.id);
    }, 300); // Match animation duration
  };

  useEffect(() => {
    // Add a small delay before showing the toast to trigger animation
    const timer = setTimeout(() => {
      setIsExiting(false);
    }, 10);
    return () => clearTimeout(timer);
  }, []);

  // Auto-dismiss after duration
  useEffect(() => {
    if (toast.duration > 0) {
      let exitTimer = null;
      const timer = setTimeout(() => {
        setIsExiting(true);
        exitTimer = setTimeout(() => {
          onRemove(toast.id);
        }, 300); // Exit animation duration
      }, toast.duration);

      return () => {
        clearTimeout(timer);
        if (exitTimer) {
          clearTimeout(exitTimer);
        }
      };
    }
  }, [toast.duration, toast.id, onRemove]);

  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return (
          <CheckCircleIcon className="h-5 w-5 text-green-500 dark:text-green-400 flex-shrink-0" />
        );
      case "error":
        return (
          <XCircleIcon className="h-5 w-5 text-red-500 dark:text-red-400 flex-shrink-0" />
        );
      case "warning":
        return (
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 dark:text-yellow-400 flex-shrink-0" />
        );
      case "info":
      default:
        return (
          <InformationCircleIcon className="h-5 w-5 text-blue-500 dark:text-blue-400 flex-shrink-0" />
        );
    }
  };

  const getStyles = () => {
    const baseStyles =
      "flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border backdrop-blur-sm max-w-md w-full";

    switch (toast.type) {
      case "success":
        return `${baseStyles} bg-green-50/95 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200`;
      case "error":
        return `${baseStyles} bg-red-50/95 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200`;
      case "warning":
        return `${baseStyles} bg-yellow-50/95 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200`;
      case "info":
      default:
        return `${baseStyles} bg-blue-50/95 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200`;
    }
  };

  return (
    <div
      className={`
        transform transition-all duration-300 ease-out
        ${isExiting ? "opacity-0 -translate-y-2 scale-95" : "opacity-100 translate-y-0 scale-100"}
      `}
    >
      <div className={getStyles()}>
        {getIcon()}
        <p className="flex-1 text-sm font-medium">{toast.message}</p>
        <button
          onClick={handleRemove}
          className="flex-shrink-0 hover:opacity-70 transition-opacity"
          aria-label="Close notification"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

const ToastContainer = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex flex-col gap-2 pointer-events-auto">
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </div>
  );
};

export default ToastContainer;
