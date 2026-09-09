import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  FileText,
  Sparkles,
  Search,
  CheckCircle2,
  Calendar,
  CreditCard,
  PieChart as PieIcon,
  Loader2,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import type { Expense, CurrencyCode } from '../types';
import { CURRENCIES } from '../types';
import { api } from '../api';

interface AnalyticsViewProps {
  expenses: Expense[];
  currency: CurrencyCode;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ expenses, currency }) => {
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [savingAdvice, setSavingAdvice] = useState<string | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [semanticQuery, setSemanticQuery] = useState('');
  const [semanticResults, setSemanticResults] = useState<Expense[] | null>(null);
  const [searchingSemantic, setSearchingSemantic] = useState(false);

  const symbol = CURRENCIES[currency]?.symbol || '₹';

  useEffect(() => {
    api.getAnalytics().then(setAnalyticsData).catch(console.error);
  }, [expenses]);

  const handleGetSavingAdvice = async () => {
    setLoadingAdvice(true);
    try {
      const res = await api.getSavingAdvice();
      setSavingAdvice(res.advice);
    } catch (e) {
      setSavingAdvice('Failed to load advice. Please try again.');
    } finally {
      setLoadingAdvice(false);
    }
  };

  const handleSemanticSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!semanticQuery.trim()) {
      setSemanticResults(null);
      return;
    }
    setSearchingSemantic(true);
    try {
      const results = await api.semanticSearch(semanticQuery);
      setSemanticResults(results);
    } catch (e) {
      console.error(e);
    } finally {
      setSearchingSemantic(false);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (expenses.length === 0) {
      alert('No expense records to export.');
      return;
    }

    const headers = ['Date', 'Description', 'Merchant', 'Category', 'Amount', 'Currency', 'Source'];
    const rows = expenses.map((e) => [
      e.date,
      `"${e.description.replace(/"/g, '""')}"`,
      `"${(e.merchant || '').replace(/"/g, '""')}"`,
      `"${e.category}"`,
      e.amount,
      e.currency,
      e.source,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SpendWise_Expenses_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF Export using jsPDF
  const handleExportPDF = () => {
    if (expenses.length === 0) {
      alert('No expense records to export.');
      return;
    }

    const doc = new jsPDF();
    const now = new Date();
    const dateStr = now.toLocaleDateString();

    // Document Title & Header
    doc.setFontSize(20);
    doc.setTextColor(16, 185, 129); // Emerald
    doc.text('SpendWise Expense Report', 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${dateStr} | Currency: ${currency}`, 14, 28);
    doc.text(`Student Finance & Spending Analytics`, 14, 34);

    // Summary Box
    const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 40, 182, 22, 3, 3, 'FD');

    doc.setFontSize(11);
    doc.setTextColor(30);
    doc.text(`Total Recorded Spend: ${symbol} ${totalAmount.toLocaleString()}`, 20, 50);
    doc.text(`Total Transactions: ${expenses.length}`, 20, 56);

    // Transactions Table
    doc.setFontSize(12);
    doc.setTextColor(30);
    doc.text('Expense Transactions', 14, 72);

    let y = 80;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text('Date', 14, y);
    doc.text('Description', 42, y);
    doc.text('Category', 115, y);
    doc.text('Amount', 170, y, { align: 'right' });

    doc.setDrawColor(200);
    doc.line(14, y + 2, 196, y + 2);
    y += 8;

    doc.setTextColor(40);
    expenses.slice(0, 35).forEach((e) => {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      doc.text(e.date, 14, y);
      doc.text(e.description.slice(0, 35), 42, y);
      doc.text(e.category, 115, y);
      doc.text(`${e.currency} ${e.amount}`, 170, y, { align: 'right' });
      y += 6;
    });

    if (expenses.length > 35) {
      y += 4;
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(`...and ${expenses.length - 35} more transactions`, 14, y);
    }

    doc.save(`SpendWise_Report_${now.toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Header & Export Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <span>Spending Analytics & Reports</span>
          </h2>
          <p className="text-xs text-stone-500">
            Deep financial breakdown and exportable student records
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            id="export-csv-button"
            onClick={handleExportCSV}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold hover:bg-stone-50 dark:hover:bg-stone-750 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-stone-500" />
            <span>Export CSV</span>
          </button>

          <button
            id="export-pdf-button"
            onClick={handleExportPDF}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-2xs"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export PDF Report</span>
          </button>
        </div>
      </div>

      {/* Semantic Search Bar */}
      <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xs">
        <div className="mb-2">
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-1.5">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span>Semantic & Fuzzy Expense Search</span>
          </h3>
          <p className="text-[11px] text-stone-500">
            Search naturally: e.g. "trip items", "coffee and snacks", "campus books", "diwali shopping", "subscriptions"
          </p>
        </div>

        <form onSubmit={handleSemanticSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
            <input
              type="text"
              value={semanticQuery}
              onChange={(e) => setSemanticQuery(e.target.value)}
              placeholder="e.g. that thing I bought for the hackathon / dinner with friends..."
              className="w-full pl-9 pr-4 py-2 bg-stone-100 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={searchingSemantic}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors shrink-0"
          >
            {searchingSemantic ? 'Searching...' : 'Search'}
          </button>
        </form>

        {semanticResults && (
          <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800">
            <p className="text-xs font-bold text-stone-700 dark:text-stone-300 mb-2">
              Found {semanticResults.length} matching expense{semanticResults.length === 1 ? '' : 's'}:
            </p>
            {semanticResults.length === 0 ? (
              <p className="text-xs text-stone-400">No semantic matches found for "{semanticQuery}".</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {semanticResults.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-stone-50 dark:bg-stone-800/60 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-stone-800 dark:text-stone-200">{r.description}</span>
                      <span className="ml-2 text-[10px] text-stone-400">({r.category} · {r.date})</span>
                    </div>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {symbol} {r.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Analytics Metric Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Comparison with last month */}
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xs">
          <p className="text-xs text-stone-500 font-medium">Month-over-Month Change</p>
          {analyticsData && analyticsData.lastTotal > 0 ? (
            <div className="mt-2 flex items-center space-x-2">
              {analyticsData.percentChangeVsLastMonth >= 0 ? (
                <div className="flex items-center space-x-1 text-rose-600 text-lg font-bold">
                  <TrendingUp className="w-5 h-5" />
                  <span>+{analyticsData.percentChangeVsLastMonth.toFixed(1)}%</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-emerald-600 text-lg font-bold">
                  <TrendingDown className="w-5 h-5" />
                  <span>{analyticsData.percentChangeVsLastMonth.toFixed(1)}%</span>
                </div>
              )}
              <span className="text-[11px] text-stone-400">vs last month</span>
            </div>
          ) : (
            <p className="mt-2 text-xs text-stone-400">
              Needs previous month data to compare trends.
            </p>
          )}
        </div>

        {/* Highest Expense */}
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xs">
          <p className="text-xs text-stone-500 font-medium">Highest Single Expense</p>
          {analyticsData?.highestExpense ? (
            <div className="mt-1">
              <span className="text-xl font-bold text-stone-900 dark:text-stone-100">
                {symbol} {analyticsData.highestExpense.amount}
              </span>
              <p className="text-[11px] text-stone-500 truncate mt-0.5">
                {analyticsData.highestExpense.description} ({analyticsData.highestExpense.category})
              </p>
            </div>
          ) : (
            <p className="mt-2 text-xs text-stone-400">No expenses recorded yet.</p>
          )}
        </div>

        {/* Most Expensive Category */}
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xs">
          <p className="text-xs text-stone-500 font-medium">Top Category</p>
          {analyticsData?.topCategories && analyticsData.topCategories.length > 0 ? (
            <div className="mt-1">
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {analyticsData.topCategories[0].name}
              </span>
              <p className="text-[11px] text-stone-500 mt-0.5">
                {symbol} {analyticsData.topCategories[0].amount} ({analyticsData.topCategories[0].percentage.toFixed(0)}% of month)
              </p>
            </div>
          ) : (
            <p className="mt-2 text-xs text-stone-400">No expenses recorded yet.</p>
          )}
        </div>
      </div>

      {/* AI Financial Insights Section */}
      <div className="p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/60 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                AI Budgeting Coach & Saving Suggestions
              </h3>
              <p className="text-[11px] text-stone-600 dark:text-stone-400">
                Actionable student financial advice calculated directly from your actual spending
              </p>
            </div>
          </div>

          <button
            onClick={handleGetSavingAdvice}
            disabled={loadingAdvice}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs"
          >
            {loadingAdvice ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>Analyze & Advise</span>
          </button>
        </div>

        {savingAdvice && (
          <div className="mt-3.5 p-3.5 rounded-xl bg-white dark:bg-stone-850 border border-emerald-200/60 dark:border-emerald-800/60 text-xs text-stone-800 dark:text-stone-200 leading-relaxed whitespace-pre-line animate-in fade-in">
            {savingAdvice}
          </div>
        )}
      </div>

      {/* Category Percentage Breakdown Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xs">
        <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-3">
          Spending Share by Category
        </h3>

        {analyticsData?.topCategories && analyticsData.topCategories.length > 0 ? (
          <div className="space-y-3">
            {analyticsData.topCategories.map((c: any) => (
              <div key={c.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-stone-700 dark:text-stone-300">{c.name}</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100">
                    {symbol} {c.amount.toLocaleString()} ({c.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${c.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-stone-400 py-6 text-center">
            No category spending recorded yet this month.
          </p>
        )}
      </div>
    </div>
  );
};
