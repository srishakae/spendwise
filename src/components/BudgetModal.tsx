import React, { useState } from 'react';
import { X, Target, DollarSign, AlertCircle } from 'lucide-react';
import type { CurrencyCode } from '../types';
import { CURRENCIES } from '../types';
import { api } from '../api';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBudget?: number;
  currency: CurrencyCode;
  onBudgetUpdated: () => void;
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
  isOpen,
  onClose,
  currentBudget,
  currency,
  onBudgetUpdated,
}) => {
  const [amount, setAmount] = useState(currentBudget?.toString() || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const symbol = CURRENCIES[currency]?.symbol || '₹';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num < 0) {
      setError('Please provide a valid budget amount.');
      return;
    }

    setSaving(true);
    try {
      await api.setMonthlyBudget(num, currency);
      onBudgetUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update budget');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 max-w-sm w-full p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Set Monthly Budget
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2 border border-rose-200 dark:border-rose-900">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Monthly Budget ({currency})
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2 text-stone-400 font-bold text-sm">
                {symbol}
              </span>
              <input
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="15000"
                autoFocus
                required
                className="w-full pl-8 pr-3 py-2 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm font-bold rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <p className="text-[11px] text-stone-400 mt-1">
              SpendWise will warn you when you pass 70%, 90%, and 100% of this budget.
            </p>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Budget'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
