import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { subscribeToToasts, ToastMessage } from '../lib/toast';

const AUTO_DISMISS_MS = 5000;

// Mounted once at the App root, always present regardless of which page is active — the
// single subscriber to the global showToast() pub/sub in lib/toast.ts.
export const ToastHost: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    return subscribeToToasts((toast) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, AUTO_DISMISS_MS);
    });
  }, []);

  if (toasts.length === 0) return null;

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className="fixed top-20 inset-x-0 z-[200] flex flex-col items-center gap-2 px-4 pointer-events-none">
      {toasts.map((t) => {
        const Icon = t.type === 'success' ? CheckCircle2 : t.type === 'error' ? XCircle : Info;
        const accent =
          t.type === 'success'
            ? 'border-emerald-800 bg-emerald-950/95'
            : t.type === 'error'
              ? 'border-red-900 bg-red-950/95'
              : 'border-zinc-700 bg-zinc-900/95';
        const iconColor =
          t.type === 'success' ? 'text-emerald-400' : t.type === 'error' ? 'text-red-400' : 'text-zinc-300';

        return (
          <div
            key={t.id}
            className={`pointer-events-auto w-full max-w-sm flex items-start gap-2.5 px-4 py-3 rounded-xl border ${accent} backdrop-blur-sm shadow-2xl animate-fade-in`}
          >
            <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
            <p className="text-xs text-zinc-100 leading-relaxed flex-1">{t.text}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 text-zinc-500 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
