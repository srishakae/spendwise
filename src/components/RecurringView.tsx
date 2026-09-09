import React, { useState, useEffect } from 'react';
import {
  CalendarClock,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Calendar,
  DollarSign,
  AlertCircle,
  Play,
  Pause,
} from 'lucide-react';
import type { RecurringExpense, CurrencyCode } from '../types';
import { CURRENCIES, DEFAULT_CATEGORIES } from '../types';
import { api } from '../api';

interface RecurringViewProps {
  currency: CurrencyCode;
  onRefreshStats: () => void;
}

export const RecurringView: React.FC<RecurringViewProps> = ({ currency, onRefreshStats }) => {
  const [recurring, setRecurring] = useState<RecurringExpense[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Bills');
  const [frequency, setFrequency] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Yearly'>('Monthly');
  const [nextDueDate, setNextDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const symbol = CURRENCIES[currency]?.symbol || '₹';

  useEffect(() => {
    loadRecurring();
  }, []);

  const loadRecurring = async () => {
    try {
      const data = await api.getRecurring();
      setRecurring(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) {
      setError('Please provide a description and amount');
      return;
    }

    try {
      await api.addRecurring({
        description,
        amount: parseFloat(amount),
        currency,
        category,
        frequency,
        nextDueDate: nextDueDate || new Date().toISOString().split('T')[0],
      });
      setShowAddModal(false);
      setDescription('');
      setAmount('');
      setError(null);
      loadRecurring();
      onRefreshStats();
    } catch (err: any) {
      setError(err.message || 'Failed to add recurring expense');
    }
  };

  const handleToggleActive = async (rec: RecurringExpense) => {
    await api.updateRecurring(rec.id, { active: !rec.active });
    loadRecurring();
    onRefreshStats();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this recurring expense?')) {
      await api.deleteRecurring(id);
      loadRecurring();
      onRefreshStats();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-2">
            <CalendarClock className="w-5 h-5 text-emerald-600" />
            <span>Recurring Expenses & Subscriptions</span>
          </h2>
          <p className="text-xs text-stone-500">
            Track college tuition, Netflix, Spotify, gym memberships, and rent
          </p>
        </div>

        <button
          id="add-recurring-btn"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Recurring</span>
        </button>
      </div>

      {/* List of Recurring Expenses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recurring.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-stone-400 p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
            <Clock className="w-8 h-8 mx-auto mb-2 text-stone-300 dark:text-stone-700" />
            <p className="font-semibold text-stone-600 dark:text-stone-400">No recurring expenses setup</p>
            <p className="text-[11px] text-stone-400 mt-0.5">
              Add recurring subscriptions like Spotify or monthly rent to anticipate cash flow.
            </p>
          </div>
        ) : (
          recurring.map((rec) => (
            <div
              key={rec.id}
              className={`p-4 rounded-2xl border transition-all ${
                rec.active
                  ? 'bg-white dark:bg-stone-900 border-stone-200/90 dark:border-stone-800 shadow-xs'
                  : 'bg-stone-50/50 dark:bg-stone-950/40 border-dashed border-stone-300 dark:border-stone-800 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">{rec.description}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      {rec.frequency}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">Category: {rec.category}</p>
                  <p className="text-[11px] text-stone-400 mt-2 flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>Next due: {rec.nextDueDate}</span>
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {symbol} {rec.amount.toLocaleString()}
                  </span>
                  <div className="flex items-center space-x-1 mt-3 justify-end">
                    <button
                      onClick={() => handleToggleActive(rec)}
                      className={`p-1.5 rounded-lg border text-xs ${
                        rec.active
                          ? 'border-amber-200 text-amber-600 hover:bg-amber-50'
                          : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                      }`}
                      title={rec.active ? 'Pause' : 'Activate'}
                    >
                      {rec.active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDelete(rec.id)}
                      className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-stone-800 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Recurring Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 max-w-md w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Add Recurring Expense
            </h3>

            {error && (
              <div className="p-2 rounded-lg bg-rose-50 text-rose-700 text-xs flex items-center space-x-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleAddRecurring} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Netflix, Campus Wifi, Spotify"
                  required
                  className="w-full px-3 py-2 bg-stone-100 dark:bg-stone-800 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Amount ({symbol})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="499"
                    required
                    className="w-full px-3 py-2 bg-stone-100 dark:bg-stone-800 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="w-full px-3 py-2 bg-stone-100 dark:bg-stone-800 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Daily">Daily</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-100 dark:bg-stone-800 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {DEFAULT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Next Due Date
                  </label>
                  <input
                    type="date"
                    value={nextDueDate}
                    onChange={(e) => setNextDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-100 dark:bg-stone-800 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                >
                  Save Recurring
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
