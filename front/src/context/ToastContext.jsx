import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

function iconFor(type) {
  if (type === "success") return <CheckCircle2 size={18} className="icon" />;
  if (type === "error") return <AlertTriangle size={18} className="icon" />;
  return <Info size={18} className="icon" />;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type = "info", title = "", message = "", duration = 2600 } = {}) => {
      const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;

      const toast = { id, type, title, message };
      setToasts((prev) => [toast, ...prev].slice(0, 4));

      if (duration && duration > 0) {
        window.setTimeout(() => removeToast(id), duration);
      }

      return id;
    },
    [removeToast]
  );

  const value = useMemo(() => ({ showToast, removeToast }), [showToast, removeToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="toast-viewport" aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`} role="status">
            <div className="toast-icon" aria-hidden="true">
              {iconFor(t.type)}
            </div>

            <div className="toast-content">
              {t.title && <div className="toast-title">{t.title}</div>}
              {t.message && <div className="toast-msg">{t.message}</div>}
            </div>

            <button
              type="button"
              className="toast-close"
              onClick={() => removeToast(t.id)}
              aria-label="Cerrar"
              title="Cerrar"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider />");
  return ctx;
}
