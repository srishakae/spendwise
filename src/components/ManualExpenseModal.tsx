import React, { useState, useEffect } from 'react';
import { X, Plus, AlertCircle, Calendar, DollarSign, Tag, Store, FileText } from 'lucide-react';
import type { Expense, CurrencyCode } from '../types';
import { CURRENCIES, DEFAULT_CATEGORIES } from '../types';
import { api } from '../api';

interface ManualExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpenseSaved: () => void;
  expenseToEdit: Expense | null;
  defaultCurrency: CurrencyCode;
  customCategories?: Array<{ id: string; name: string }>;
}

export const ManualExpenseModal: React.FC<ManualExpenseModalProps> = ({
  isOpen,
  onClose,
  onExpenseSaved,
  expenseToEdit,
  defaultCurrency,
  customCategories = [],
}) => {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>(defaultCurrency);
  const [category, setCategory] = useState('Food');
  const [description, setDescription] = useState('');
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (expenseToEdit) {
      setAmount(expenseToEdit.amount.toString());
      setCurrency(expenseToEdit.currency);
      setCategory(expenseToEdit.category);
      setDescription(expenseToEdit.description);
      setMerchant(expenseToEdit.merchant || '');
      setDate(expenseToEdit.date);
    } else {
      setAmount('');
      setCurrency(defaultCurrency);
      setCategory('Food');
      setDescription('');
      setMerchant('');
      setDate(new Date().toISOString().split('T')[0]);
    }
    setError(null);
  }, [expenseToEdit, isOpen, defaultCurrency]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }

    if (!description.trim()) {
      setError('Please provide a short description.');
      return;
    }

    setSaving(true);
    try {
      if (expenseToEdit) {
        await api.updateExpense(expenseToEdit.id, {
          amount: numAmount,
          currency,
          category,
          description: description.trim(),
          merchant: merchant.trim() || undefined,
          date,
        });
      } else {
        await api.addExpense({
          amount: numAmount,
          currency,
          category,
          description: description.trim(),
          merchant: merchant.trim() || undefined,
          date,
          source: 'Manual',
        });
      }

      onExpenseSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories.map((c) => c.name)];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 max-w-md w-full p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
          <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
            {expenseToEdit ? 'Edit Expense' : 'Add Expense Manually'}
          </h3>
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

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Amount & Currency */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Amount
              </label>
              <input
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="250.00"
                autoFocus
                required
                className="w-full px-3 py-2 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs sm:text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="w-full px-2.5 py-2 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs sm:text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
              >
                {Object.values(CURRENCIES).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} {c.code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Lunch at Cafeteria, Uber to Campus, Notebook"
              required
              className="w-full px-3 py-2 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs sm:text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Category & Date */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {allCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Merchant (optional) */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Merchant / Store (Optional)
            </label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="e.g. Starbucks, Amazon, Uber, Bookstore"
              className="w-full px-3 py-2 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-stone-100 dark:border-stone-800">
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
              {saving ? 'Saving...' : expenseToEdit ? 'Update Expense' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
