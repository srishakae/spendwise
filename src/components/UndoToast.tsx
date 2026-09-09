import React, { useEffect, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import type { Expense } from '../types';

interface UndoToastProps {
  deletedExpense: Expense | null;
  onUndo: (expense: Expense) => void;
  onDismiss: () => void;
}

export const UndoToast: React.FC<UndoToastProps> = ({
  deletedExpense,
  onUndo,
  onDismiss,
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!deletedExpense) return;

    setProgress(100);
    const duration = 6000;
    const interval = 50;
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          onDismiss();
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [deletedExpense]);

  if (!deletedExpense) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in">
      <div className="bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900 px-4 py-3 rounded-2xl shadow-xl border border-stone-750 flex items-center space-x-3 text-xs overflow-hidden relative max-w-sm">
        <div className="flex-1 truncate">
          <p className="font-semibold truncate">
            Deleted "{deletedExpense.description}" ({deletedExpense.currency} {deletedExpense.amount})
          </p>
        </div>

        <button
          onClick={() => onUndo(deletedExpense)}
          className="inline-flex items-center space-x-1 font-bold text-emerald-400 dark:text-emerald-600 hover:underline px-2 py-1 rounded-lg bg-stone-800 dark:bg-stone-200"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Undo</span>
        </button>

        <button
          onClick={onDismiss}
          className="text-stone-400 hover:text-white dark:hover:text-black p-0.5"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Linear progress bar */}
        <div
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 transition-all duration-75"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
