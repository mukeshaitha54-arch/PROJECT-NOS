"use client";

import React, { useEffect, useState, useCallback } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

const TOAST_CONFIG: Record<
  ToastType,
  { icon: React.ReactNode; classes: string }
> = {
  success: {
    icon: <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />,
    classes: "border-emerald-500/30 bg-emerald-500/10",
  },
  error: {
    icon: <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />,
    classes: "border-red-500/30 bg-red-500/10",
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />,
    classes: "border-amber-500/30 bg-amber-500/10",
  },
  info: {
    icon: <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />,
    classes: "border-cyan-500/30 bg-cyan-500/10",
  },
};

// Singleton event bus for toast triggering from anywhere
type ToastListener = (toast: Toast) => void;
const listeners: Set<ToastListener> = new Set();

export const toast = {
  success: (title: string, message?: string, duration?: number) =>
    emit({ id: uid(), type: "success", title, message, duration }),
  error: (title: string, message?: string, duration?: number) =>
    emit({ id: uid(), type: "error", title, message, duration }),
  warning: (title: string, message?: string, duration?: number) =>
    emit({ id: uid(), type: "warning", title, message, duration }),
  info: (title: string, message?: string, duration?: number) =>
    emit({ id: uid(), type: "info", title, message, duration }),
};

function uid() {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}
function emit(t: Toast) {
  listeners.forEach((fn) => fn(t));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const listener: ToastListener = (t) => {
      setToasts((prev) => [...prev.slice(-4), t]); // max 5 toasts
      const duration = t.duration ?? 4000;
      setTimeout(() => remove(t.id), duration);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [remove]);

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((t) => {
        const cfg = TOAST_CONFIG[t.type];
        return (
          <div
            key={t.id}
            role="alert"
            className={`pointer-events-auto w-80 max-w-[calc(100vw-2rem)] flex items-start gap-3 px-4 py-3
              rounded-xl border ${cfg.classes}
              bg-slate-900 shadow-xl shadow-slate-950/60
              animate-in slide-in-from-right-4 fade-in duration-300`}
          >
            {cfg.icon}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-200 leading-tight">
                {t.title}
              </p>
              {t.message && (
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  {t.message}
                </p>
              )}
            </div>
            <button
              onClick={() => remove(t.id)}
              className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
