import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext({
  showToast: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const success = useCallback((msg, duration) => showToast(msg, 'success', duration), [showToast]);
  const error = useCallback((msg, duration) => showToast(msg, 'error', duration), [showToast]);
  const info = useCallback((msg, duration) => showToast(msg, 'info', duration), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info }}>
      {children}
      {/* Toast Render Container */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '24px',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
          maxWidth: '380px',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => {
          const isSuccess = t.type === 'success';
          const isError = t.type === 'error';

          return (
            <div
              key={t.id}
              className="glass-panel"
              style={{
                pointerEvents: 'auto',
                borderRadius: '12px',
                padding: '0.75rem 1rem',
                background: 'rgba(18, 20, 30, 0.95)',
                border: `1px solid ${isSuccess ? '#22c55e' : isError ? '#ef4444' : '#ffb800'}`,
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.7)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                color: '#fff',
                fontSize: '0.88rem',
                animation: 'fade-in 0.2s ease',
              }}
            >
              {isSuccess ? (
                <CheckCircle2 size={18} color="#22c55e" style={{ flexShrink: 0 }} />
              ) : isError ? (
                <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
              ) : (
                <Info size={18} color="#ffb800" style={{ flexShrink: 0 }} />
              )}
              <span style={{ flex: 1 }}>{t.message}</span>
              <button
                onClick={() => removeToast(t.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#888',
                  cursor: 'pointer',
                  padding: '2px',
                }}
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

