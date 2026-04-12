'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const toastConfig = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-400',
    iconColor: 'text-green-600',
    titleColor: 'text-green-800',
    messageColor: 'text-green-700',
  },
  error: {
    icon: AlertCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-400',
    iconColor: 'text-red-600',
    titleColor: 'text-red-800',
    messageColor: 'text-red-700',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-400',
    iconColor: 'text-yellow-600',
    titleColor: 'text-yellow-800',
    messageColor: 'text-yellow-700',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-400',
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-800',
    messageColor: 'text-blue-700',
  },
};

function ToastItem({ toast, onRemove }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);
  const config = toastConfig[toast.type];
  const Icon = config.icon;

  const handleRemove = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  }, [toast.id, onRemove]);

  useEffect(() => {
    if (toast.duration !== 0) {
      const timer = setTimeout(handleRemove, toast.duration || 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, handleRemove]);

  return (
    <div
      className={`
        relative w-full max-w-sm bg-white rounded-lg shadow-lg border-l-4 ${config.borderColor}
        transform transition-all duration-300 ease-in-out
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
      `}
      role="alert"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 ${config.iconColor}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${config.titleColor}`}>
              {toast.title}
            </p>
            {toast.message && (
              <p className={`mt-1 text-sm ${config.messageColor}`}>
                {toast.message}
              </p>
            )}
            {toast.action && (
              <button
                onClick={toast.action.onClick}
                className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition"
              >
                {toast.action.label}
              </button>
            )}
          </div>
          <button
            onClick={handleRemove}
            className="flex-shrink-0 p-1 rounded hover:bg-gray-100 transition focus:ring-2 focus:ring-gray-400"
            aria-label="Close notification"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>
      {/* Auto-dismiss progress bar */}
      {toast.duration !== 0 && (
        <div
          className={`absolute bottom-0 left-0 h-0.5 ${config.iconColor} opacity-20`}
          style={{
            animation: `shrink ${toast.duration || 4000}ms linear`,
            width: '100%',
          }}
        />
      )}
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
      <style jsx global>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}

// Global toast manager
class ToastManager {
  private listeners: Set<(toasts: Toast[]) => void> = new Set();
  private toasts: Toast[] = [];

  subscribe(listener: (toasts: Toast[]) => void) {
    this.listeners.add(listener);
    listener(this.toasts);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.toasts));
  }

  add(toast: Omit<Toast, 'id'>) {
    const id = Math.random().toString(36).substring(7);
    const newToast = { ...toast, id };
    this.toasts = [newToast, ...this.toasts].slice(0, 5); // Max 5 toasts
    this.notify();
    return id;
  }

  remove(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }

  success(title: string, options?: Omit<Toast, 'id' | 'type' | 'title'>) {
    return this.add({ type: 'success', title, ...options });
  }

  error(title: string, options?: Omit<Toast, 'id' | 'type' | 'title'>) {
    return this.add({ type: 'error', title, ...options });
  }

  warning(title: string, options?: Omit<Toast, 'id' | 'type' | 'title'>) {
    return this.add({ type: 'warning', title, ...options });
  }

  info(title: string, options?: Omit<Toast, 'id' | 'type' | 'title'>) {
    return this.add({ type: 'info', title, ...options });
  }
}

export const toastManager = new ToastManager();

// Hook to use toast manager
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    return toastManager.subscribe(setToasts);
  }, []);

  const removeToast = useCallback((id: string) => {
    toastManager.remove(id);
  }, []);

  return { toasts, removeToast };
}
