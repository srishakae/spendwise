import React, { useState } from 'react';
import {
  TrendingUp,
  CreditCard,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  Search,
  Plus,
  Edit2,
  Trash2,
  Sparkles,
  CheckCircle2,
  Clock,
  Filter,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { DashboardStats, Expense, CurrencyCode } from '../types';
import { CURRENCIES, DEFAULT_CATEGORIES } from '../types';

interface DashboardViewProps {
  stats: DashboardStats | null;
  expenses: Expense[];
  onOpenManualModal: () => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
  currency: CurrencyCode;
}

const CATEGORY_COLORS: Record<string, string> = {
  Food: '#10b981',
  Transport: '#0284c7',
  Shopping: '#f59e0b',
  Education: '#8b5cf6',
  Entertainment: '#ec4899',
  Bills: '#ef4444',
  Health: '#14b8a6',
  Travel: '#6366f1',
  Other: '#64748b',
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  expenses,
  onOpenManualModal,
  onEditExpense,
  onDeleteExpense,
  currency,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const symbol = CURRENCIES[currency]?.symbol || '₹';

  // Filtered expenses
  const filteredExpenses = expenses.filter((e) => {
    if (categoryFilter !== 'All' && e.category.toLowerCase() !== categoryFilter.toLowerCase()) {
      return false;
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        e.description.toLowerCase().includes(q) ||
        (e.merchant && e.merchant.toLowerCase().includes(q)) ||
        e.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Prepare Pie Chart data
  const pieData = Object.entries(stats?.categorySpending || {})
    .filter(([_, val]) => typeof val === 'number' && val > 0)
    .map(([name, value]) => ({ name, value: Number(value) }));

  // Budget color calculation
  const budgetPercent = stats?.budgetPercentage || 0;
  let budgetColor = 'bg-emerald-500 text-emerald-600';
  let budgetBadgeColor = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400';
  if (budgetPercent >= 100) {
    budgetColor = 'bg-rose-500 text-rose-600';
    budgetBadgeColor = 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400';
  } else if (budgetPercent >= 90) {
    budgetColor = 'bg-amber-500 text-amber-600';
    budgetBadgeColor = 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400';
  } else if (budgetPercent >= 70) {
    budgetColor = 'bg-yellow-500 text-yellow-600';
    budgetBadgeColor = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/60 dark:text-yellow-400';
  }

  // Days in month calculation for heatmap
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = now.toLocaleString('default', { month: 'long' });

  return (
    <div className="space-y-6">
      {/* 4 Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Spent */}
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-xs font-semibold">
            <span>Spent This Month</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-2xl font-bold text-stone-900 dark:text-stone-100">
              {symbol} {(stats?.totalSpentMonth || 0).toLocaleString()}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">
            {stats?.expenseCountMonth || 0} transaction{(stats?.expenseCountMonth || 0) === 1 ? '' : 's'} recorded
          </p>
        </div>

        {/* Card 2: Remaining Budget */}
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-xs font-semibold">
            <span>Monthly Budget</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase ${budgetBadgeColor}`}>
              {budgetPercent > 0 ? `${budgetPercent.toFixed(0)}% used` : 'No budget set'}
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-2xl font-bold text-stone-900 dark:text-stone-100">
              {stats?.monthlyBudget ? `${symbol} ${stats.remainingBudget.toLocaleString()}` : '—'}
            </span>
            {stats?.monthlyBudget ? (
              <span className="text-xs text-stone-500">left of {symbol}{stats.monthlyBudget}</span>
            ) : null}
          </div>
          {/* Progress bar */}
          <div className="mt-2 w-full bg-stone-100 dark:bg-stone-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${budgetColor.split(' ')[0]}`}
              style={{ width: `${Math.min(100, budgetPercent)}%` }}
            />
          </div>
        </div>

        {/* Card 3: Projected Spend */}
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-xs font-semibold">
            <span>Projected Month-End</span>
            <div className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-2xl font-bold text-stone-900 dark:text-stone-100">
              {symbol} {Math.round(stats?.projectedMonthEndSpend || 0).toLocaleString()}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-stone-400">
            Estimated from daily trend (~{symbol} {Math.round(stats?.avgDailySpend || 0)}/day)
          </p>
        </div>

        {/* Card 4: Daily Average */}
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-xs font-semibold">
            <span>Daily Average</span>
            <div className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-2xl font-bold text-stone-900 dark:text-stone-100">
              {symbol} {Math.round(stats?.avgDailySpend || 0).toLocaleString()}
            </span>
            <span className="text-xs text-stone-500">/ day</span>
          </div>
          <p className="mt-1 text-[11px] text-stone-400">
            Across {now.getDate()} days in {monthName}
          </p>
        </div>
      </div>

      {/* Graphs Row: Daily Spending & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Spending Chart (2 Cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">Daily Spending Trend</h3>
              <p className="text-[11px] text-stone-500">Expenses over the past 14 days</p>
            </div>
          </div>

          <div className="h-56 w-full">
            {stats && stats.dailySpending && stats.dailySpending.some((d) => d.amount > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.dailySpending} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => d.slice(5)}
                    stroke="#888888"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v) => `${symbol}${v}`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white dark:bg-stone-800 p-2 rounded-xl shadow-lg border border-stone-200 dark:border-stone-700 text-xs">
                            <p className="font-semibold text-stone-700 dark:text-stone-300">{label}</p>
                            <p className="text-emerald-600 dark:text-emerald-400 font-bold">
                              {symbol} {payload[0].value}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400 text-xs">
                <Calendar className="w-8 h-8 mb-2 stroke-[1.5] text-stone-300 dark:text-stone-600" />
                <p>No expenses yet.</p>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Start by telling SpendWise what you spent today in the chat!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Category Breakdown (1 Col) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xs flex flex-col">
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">Category Breakdown</h3>
          <p className="text-[11px] text-stone-500 mb-3">Where your money goes this month</p>

          <div className="flex-1 flex flex-col items-center justify-center">
            {pieData.length > 0 ? (
              <div className="w-full flex flex-col items-center">
                <div className="w-40 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CATEGORY_COLORS[entry.name] || '#10b981'}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="w-full mt-3 grid grid-cols-2 gap-1.5 text-xs">
                  {pieData.slice(0, 6).map((item) => (
                    <div key={item.name} className="flex items-center space-x-1.5 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: CATEGORY_COLORS[item.name] || '#10b981' }}
                      />
                      <span className="truncate text-stone-600 dark:text-stone-400 text-[11px]">
                        {item.name}:
                      </span>
                      <span className="font-semibold text-stone-800 dark:text-stone-200 text-[11px]">
                        {symbol}{item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center p-6 text-stone-400 text-xs">
                <p>No category data yet.</p>
                <p className="text-[11px] text-stone-400 mt-1">
                  Log your food, rides, or bills to see a breakdown.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Calendar Heatmap & Upcoming Recurring Bills */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Heatmap (2 Cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-2">
                <span>{monthName} Spending Heatmap</span>
              </h3>
              <p className="text-[11px] text-stone-500">Visual spend intensity per day</p>
            </div>
            <div className="flex items-center space-x-1 text-[10px] text-stone-400">
              <span>Less</span>
              <div className="w-2.5 h-2.5 rounded-sm bg-stone-100 dark:bg-stone-800" />
              <div className="w-2.5 h-2.5 rounded-sm bg-emerald-200 dark:bg-emerald-900" />
              <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400 dark:bg-emerald-700" />
              <div className="w-2.5 h-2.5 rounded-sm bg-emerald-600" />
              <span>More</span>
            </div>
          </div>

          <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-15 gap-1.5 pt-2">
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const amount = stats?.heatmapData?.[dateStr] || 0;

              let intensityClass = 'bg-stone-100 dark:bg-stone-800 text-stone-400';
              if (amount > 2000) intensityClass = 'bg-emerald-600 text-white font-bold';
              else if (amount > 800) intensityClass = 'bg-emerald-400 text-stone-900 font-bold';
              else if (amount > 0) intensityClass = 'bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200';

              return (
                <div
                  key={day}
                  title={`${dateStr}: ${symbol} ${amount}`}
                  className={`h-8 rounded-lg flex flex-col items-center justify-center text-[10px] transition-transform hover:scale-110 cursor-pointer ${intensityClass}`}
                >
                  <span>{day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Recurring Bills (1 Col) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">Upcoming This Month</h3>
            <span className="text-[10px] font-semibold text-stone-400 uppercase">Recurring</span>
          </div>

          <div className="space-y-2">
            {stats && stats.recurringUpcoming && stats.recurringUpcoming.length > 0 ? (
              stats.recurringUpcoming.slice(0, 4).map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-100 dark:border-stone-750 text-xs"
                >
                  <div className="truncate">
                    <p className="font-semibold text-stone-800 dark:text-stone-200 truncate">{rec.description}</p>
                    <p className="text-[10px] text-stone-400">Due in {rec.daysRemaining} days ({rec.nextDueDate})</p>
                  </div>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                    {symbol} {rec.amount}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-stone-400 text-xs">
                <Clock className="w-5 h-5 mx-auto mb-1 opacity-50" />
                <p>No recurring charges due.</p>
                <p className="text-[10px] text-stone-400 mt-0.5">Manage in the Recurring tab.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions List with Search & Actions */}
      <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">Recent Transactions</h3>
            <p className="text-[11px] text-stone-500">Your logged expenses across all sources</p>
          </div>

          <div className="flex items-center space-x-2">
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold py-1.5 px-2.5 rounded-lg border border-transparent focus:outline-none"
            >
              <option value="All">All Categories</option>
              {DEFAULT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-stone-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="pl-8 pr-3 py-1.5 bg-stone-100 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <button
              id="dashboard-add-expense-button"
              onClick={onOpenManualModal}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Transactions Table / Cards */}
        {filteredExpenses.length === 0 ? (
          <div className="py-12 text-center text-xs text-stone-400 space-y-1">
            <CreditCard className="w-8 h-8 mx-auto text-stone-300 dark:text-stone-700" />
            <p className="font-semibold text-stone-600 dark:text-stone-400">No expenses found</p>
            <p className="text-[11px] text-stone-400">
              Start by typing "Spent ₹250 on lunch" in the AI chat or click Add.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="pb-2.5">Date</th>
                  <th className="pb-2.5">Description</th>
                  <th className="pb-2.5">Category</th>
                  <th className="pb-2.5">Source</th>
                  <th className="pb-2.5 text-right">Amount</th>
                  <th className="pb-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800/60">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
                    <td className="py-2.5 text-stone-500 whitespace-nowrap">{exp.date}</td>
                    <td className="py-2.5 font-medium text-stone-900 dark:text-stone-100">
                      <span>{exp.description}</span>
                      {exp.merchant && (
                        <span className="ml-1.5 text-[10px] text-stone-400 bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded-md">
                          @{exp.merchant}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5">
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{
                          backgroundColor: `${CATEGORY_COLORS[exp.category] || '#10b981'}20`,
                          color: CATEGORY_COLORS[exp.category] || '#10b981',
                        }}
                      >
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-2.5 text-stone-400 text-[11px]">{exp.source}</td>
                    <td className="py-2.5 text-right font-bold text-stone-900 dark:text-stone-100">
                      {symbol} {exp.amount.toLocaleString()}
                    </td>
                    <td className="py-2.5 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => onEditExpense(exp)}
                        className="p-1 rounded-md text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-stone-800"
                        title="Edit expense"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteExpense(exp.id)}
                        className="p-1 rounded-md text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-stone-800"
                        title="Delete expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
