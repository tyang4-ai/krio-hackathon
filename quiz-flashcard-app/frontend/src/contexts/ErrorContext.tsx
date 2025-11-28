import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ToastContainer, ToastMessage, ToastType } from '../components/Toast';

interface ErrorContextType {
  showToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
  handleApiError: (error: unknown, fallbackMessage?: string) => void;
  clearToasts: () => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

interface ErrorProviderProps {
  children: ReactNode;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const generateId = (): string => {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const showToast = useCallback(
    (type: ToastType, title: string, message?: string, duration?: number) => {
      const newToast: ToastMessage = {
        id: generateId(),
        type,
        title,
        message,
        duration,
      };
      setToasts((prev) => [...prev, newToast]);
    },
    []
  );

  const showSuccess = useCallback(
    (title: string, message?: string) => {
      showToast('success', title, message);
    },
    [showToast]
  );

  const showError = useCallback(
    (title: string, message?: string) => {
      showToast('error', title, message, 7000); // Errors stay longer
    },
    [showToast]
  );

  const showWarning = useCallback(
    (title: string, message?: string) => {
      showToast('warning', title, message);
    },
    [showToast]
  );

  const showInfo = useCallback(
    (title: string, message?: string) => {
      showToast('info', title, message);
    },
    [showToast]
  );

  const handleApiError = useCallback(
    (error: unknown, fallbackMessage: string = 'An unexpected error occurred') => {
      let title = 'Error';
      let message = fallbackMessage;

      if (error instanceof Error) {
        message = error.message || fallbackMessage;
      } else if (typeof error === 'object' && error !== null) {
        const errorObj = error as Record<string, unknown>;

        // Handle axios error response
        if (errorObj.response && typeof errorObj.response === 'object') {
          const response = errorObj.response as Record<string, unknown>;
          const data = response.data as Record<string, unknown> | undefined;

          if (data) {
            // FastAPI returns { detail: "message" }
            if (typeof data.detail === 'string') {
              message = data.detail;
            } else if (typeof data.error === 'string') {
              message = data.error;
            } else if (typeof data.message === 'string') {
              message = data.message;
            }
          }

          // Set title based on status code
          const status = response.status as number | undefined;
          if (status) {
            switch (status) {
              case 400:
                title = 'Bad Request';
                break;
              case 401:
                title = 'Unauthorized';
                message = message || 'Please log in to continue';
                break;
              case 403:
                title = 'Forbidden';
                message = message || 'You do not have permission to perform this action';
                break;
              case 404:
                title = 'Not Found';
                message = message || 'The requested resource was not found';
                break;
              case 422:
                title = 'Validation Error';
                break;
              case 429:
                title = 'Too Many Requests';
                message = message || 'Please wait before trying again';
                break;
              case 500:
                title = 'Server Error';
                message = message || 'Something went wrong on our end';
                break;
              default:
                if (status >= 500) {
                  title = 'Server Error';
                } else if (status >= 400) {
                  title = 'Request Error';
                }
            }
          }
        }

        // Handle network errors
        if (errorObj.code === 'ERR_NETWORK' || errorObj.message === 'Network Error') {
          title = 'Network Error';
          message = 'Unable to connect to the server. Please check your internet connection.';
        }

        // Handle timeout
        if (errorObj.code === 'ECONNABORTED') {
          title = 'Request Timeout';
          message = 'The request took too long. Please try again.';
        }
      }

      showError(title, message);
    },
    [showError]
  );

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const value: ErrorContextType = {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    handleApiError,
    clearToasts,
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ErrorContext.Provider>
  );
};

export const useError = (): ErrorContextType => {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};

export default ErrorContext;
