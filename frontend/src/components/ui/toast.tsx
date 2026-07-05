'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info, Loader2, X } from 'lucide-react';
import { useUiStore } from '@/store/ui.store';
import { cn } from '@/lib/cn';

const icons = {
  success: <CheckCircle className="w-4 h-4 text-emerald-400" />,
  error: <XCircle className="w-4 h-4 text-red-400" />,
  info: <Info className="w-4 h-4 text-sky-400" />,
  pending: <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />,
};

function ToastItem({ id, type, message }: { id: string; type: string; message: string }) {
  const { removeToast } = useUiStore();
  useEffect(() => {
    if (type !== 'pending') {
      const t = setTimeout(() => removeToast(id), 4000);
      return () => clearTimeout(t);
    }
  }, [id, type, removeToast]);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      className={cn(
        'flex items-start gap-3 rounded-xl border p-3.5 pr-8 text-sm shadow-xl backdrop-blur-sm max-w-sm relative',
        type === 'success' && 'bg-emerald-950/80 border-emerald-500/30 text-emerald-100',
        type === 'error' && 'bg-red-950/80 border-red-500/30 text-red-100',
        type === 'info' && 'bg-bg-surface border-violet-500/30 text-text-primary',
        type === 'pending' && 'bg-bg-surface border-violet-500/30 text-text-primary',
      )}
    >
      {icons[type as keyof typeof icons]}
      <span className="flex-1">{message}</span>
      <button onClick={() => removeToast(id)} className="absolute top-3 right-3 text-text-muted hover:text-text-primary">
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

export function Toaster() {
  const { toasts } = useUiStore();
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <ToastItem key={t.id} {...t} />
        ))}
      </AnimatePresence>
    </div>
  );
}
