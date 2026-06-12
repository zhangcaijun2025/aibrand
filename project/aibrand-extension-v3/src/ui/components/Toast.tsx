/**
 * AiBrand Design System — Toast Notifications
 *
 * Non-intrusive notifications that appear in the bottom-right corner.
 * Auto-dismiss with configurable duration. Stacks multiple toasts.
 *
 * Usage:
 *   const toast = useToast();
 *   toast.success("发布成功");
 *   toast.error("发布失败", "请检查网络连接后重试");
 *   toast.info("质检完成", "内容评分 86 分，已通过");
 */

import {
  createContext, useContext, useState, useCallback,
  type ReactNode,
} from 'react';

// ─── Types ────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number; // ms, default 4000
  action?: { label: string; onClick: () => void };
  createdAt: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  toast: (item: Omit<ToastItem, 'id' | 'createdAt'>) => void;
  dismiss: (id: string) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  loading: (title: string, description?: string) => string; // returns id for later dismiss
}

// ─── Context ──────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;
function genId() { return `toast_${++toastId}_${Date.now()}`; }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((item: Omit<ToastItem, 'id' | 'createdAt'>) => {
    const id = genId();
    const newToast: ToastItem = { ...item, id, createdAt: Date.now() };

    setToasts(prev => [...prev, newToast]);

    if (item.type !== 'loading' && item.duration !== 0) {
      setTimeout(() => dismiss(id), item.duration ?? 4000);
    }

    return id;
  }, [dismiss]);

  const ctx: ToastContextValue = {
    toasts,
    toast,
    dismiss,
    success: (t, d) => toast({ type: 'success', title: t, description: d }),
    error:   (t, d) => toast({ type: 'error',   title: t, description: d, duration: 6000 }),
    warning: (t, d) => toast({ type: 'warning', title: t, description: d, duration: 5000 }),
    info:    (t, d) => toast({ type: 'info',    title: t, description: d }),
    loading: (t, d) => toast({ type: 'loading', title: t, description: d, duration: 0 }),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {/* Toast container — fixed bottom-right */}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

// ─── Container ────────────────────────────────────────────────────────────

function ToastContainer({ toasts, dismiss }: { toasts: ToastItem[]; dismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-3 right-3 z-[500] flex flex-col-reverse gap-2 max-w-[380px]"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} item={t} dismiss={dismiss} />
      ))}
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────

const typeConfig: Record<ToastType, { icon: string; border: string; bg: string; text: string }> = {
  success: { icon: '✅', border: 'border-green-800/40', bg: 'bg-green-950/60', text: 'text-green-100' },
  error:   { icon: '❌', border: 'border-red-800/40',   bg: 'bg-red-950/60',   text: 'text-red-100' },
  warning: { icon: '⚠️', border: 'border-amber-800/40', bg: 'bg-amber-950/60', text: 'text-amber-100' },
  info:    { icon: 'ℹ️', border: 'border-blue-800/40',  bg: 'bg-blue-950/60',  text: 'text-blue-100' },
  loading: { icon: '',   border: 'border-zinc-700/40',  bg: 'bg-zinc-900/60',  text: 'text-zinc-100' },
};

function ToastCard({ item, dismiss }: { item: ToastItem; dismiss: (id: string) => void }) {
  const cfg = typeConfig[item.type];

  return (
    <div
      className={`
        flex items-start gap-3 p-3 rounded-lg border backdrop-blur-md
        ${cfg.border} ${cfg.bg} ${cfg.text}
        animate-[slideLeft_0.3s_cubic-bezier(0.16,1,0.3,1)]
        shadow-lg shadow-black/30
      `}
      role="status"
    >
      {/* Icon */}
      {item.type === 'loading' ? (
        <div className="w-5 h-5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin flex-shrink-0 mt-0.5" />
      ) : (
        <span className="text-base flex-shrink-0 mt-0.5">{cfg.icon}</span>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{item.title}</p>
        {item.description && (
          <p className="text-xs mt-0.5 opacity-70">{item.description}</p>
        )}
        {item.action && (
          <button
            onClick={item.action.onClick}
            className="mt-1.5 text-xs font-medium underline hover:no-underline opacity-80 hover:opacity-100"
          >
            {item.action.label}
          </button>
        )}
      </div>

      {/* Dismiss */}
      <button
        onClick={() => dismiss(item.id)}
        className="flex-shrink-0 p-0.5 rounded hover:bg-white/10 transition-colors opacity-50 hover:opacity-100"
        aria-label="Dismiss"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
