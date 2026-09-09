import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ChatInterface } from './components/ChatInterface';
import { DashboardView } from './components/DashboardView';
import { AnalyticsView } from './components/AnalyticsView';
import { RecurringView } from './components/RecurringView';
import { SettingsView } from './components/SettingsView';
import { ManualExpenseModal } from './components/ManualExpenseModal';
import { ReceiptScannerModal } from './components/ReceiptScannerModal';
import { BudgetModal } from './components/BudgetModal';
import { AuthModal } from './components/AuthModal';
import { UndoToast } from './components/UndoToast';
import type { UserProfile, DashboardStats, Expense } from './types';
import { api } from './api';
import { Sparkles, LayoutDashboard, MessageSquare, SplitSquareVertical } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'dashboard' | 'analytics' | 'recurring' | 'settings'>('dashboard');
  const [splitView, setSplitView] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Modals state
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);

  // Undo delete state
  const [recentlyDeletedExpense, setRecentlyDeletedExpense] = useState<Expense | null>(null);

  // Theme setup
  useEffect(() => {
    const savedTheme = localStorage.getItem('spendwise_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('spendwise_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('spendwise_theme', 'light');
      }
      return next;
    });
  };

  // Auth bootstrap
  useEffect(() => {
    api
      .getProfile()
      .then((profile) => {
        setUser(profile);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setAuthChecked(true);
      });
  }, []);

  // Real-time updates & initial data load
  useEffect(() => {
    if (!user) return;

    loadData();

    // SSE connection for multi-tab / real-time updates
    const cleanupSSE = api.listenRealtime((data) => {
      if (data.type === 'expense_created' || data.type === 'expense_updated' || data.type === 'expense_deleted' || data.type === 'budget_updated') {
        loadData();
      }
    });

    return () => {
      cleanupSSE();
    };
  }, [user]);

  const loadData = async () => {
    try {
      const [fetchedStats, fetchedExpenses] = await Promise.all([
        api.getDashboardStats(),
        api.getExpenses(),
      ]);
      setStats(fetchedStats);
      setExpenses(fetchedExpenses);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setExpenseToEdit(expense);
    setIsManualModalOpen(true);
  };

  const handleDeleteExpense = async (expenseId: string) => {
    const toDelete = expenses.find((e) => e.id === expenseId);
    if (!toDelete) return;

    try {
      await api.deleteExpense(expenseId);
      setRecentlyDeletedExpense(toDelete);
      loadData();
    } catch (err) {
      console.error('Failed to delete expense:', err);
    }
  };

  const handleUndoDelete = async (expense: Expense) => {
    try {
      await api.addExpense(expense);
      setRecentlyDeletedExpense(null);
      loadData();
    } catch (err) {
      console.error('Failed to undo delete:', err);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    setStats(null);
    setExpenses([]);
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white animate-pulse">
            <Sparkles className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-stone-500">Loading SpendWise...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
        <AuthModal
          onSuccess={(loggedInUser) => {
            setUser(loggedInUser);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50/80 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans transition-colors">
      {/* Top Navigation */}
      <Navbar
        user={user}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (splitView && tab !== 'chat' && tab !== 'dashboard') {
            setSplitView(false);
          }
        }}
        onOpenAddExpense={() => {
          setExpenseToEdit(null);
          setIsManualModalOpen(true);
        }}
        onOpenScanModal={() => setIsScanModalOpen(true)}
        onOpenBudgetModal={() => setIsBudgetModalOpen(true)}
        onLogout={handleLogout}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        monthlyBudget={stats?.monthlyBudget}
        totalSpent={stats?.totalSpentMonth}
        currency={user.defaultCurrency}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {/* Split View Toggle for wide screens (only when in chat or dashboard) */}
        <div className="hidden lg:flex justify-end mb-3">
          <button
            onClick={() => setSplitView(!splitView)}
            className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
              splitView
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-50'
            }`}
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            <span>{splitView ? 'Dual View Active' : 'Enable Dual View (Chat + Dashboard)'}</span>
          </button>
        </div>

        {/* Dual Split View (Chat side-by-side with Dashboard) */}
        {splitView ? (
          <div className="grid grid-cols-12 gap-6 items-start">
            <div className="col-span-12 lg:col-span-5 h-[calc(100vh-140px)] sticky top-20">
              <ChatInterface
                onExpenseAddedOrUpdated={loadData}
                onOpenScanModal={() => setIsScanModalOpen(true)}
                onEditExpense={handleEditExpense}
                onDeleteExpense={handleDeleteExpense}
                defaultCurrency={user.defaultCurrency}
              />
            </div>
            <div className="col-span-12 lg:col-span-7">
              <DashboardView
                stats={stats}
                expenses={expenses}
                onOpenManualModal={() => {
                  setExpenseToEdit(null);
                  setIsManualModalOpen(true);
                }}
                onEditExpense={handleEditExpense}
                onDeleteExpense={handleDeleteExpense}
                currency={user.defaultCurrency}
              />
            </div>
          </div>
        ) : (
          /* Single Tab View */
          <>
            {activeTab === 'chat' && (
              <div className="h-[calc(100vh-140px)] max-w-4xl mx-auto">
                <ChatInterface
                  onExpenseAddedOrUpdated={loadData}
                  onOpenScanModal={() => setIsScanModalOpen(true)}
                  onEditExpense={handleEditExpense}
                  onDeleteExpense={handleDeleteExpense}
                  defaultCurrency={user.defaultCurrency}
                />
              </div>
            )}

            {activeTab === 'dashboard' && (
              <DashboardView
                stats={stats}
                expenses={expenses}
                onOpenManualModal={() => {
                  setExpenseToEdit(null);
                  setIsManualModalOpen(true);
                }}
                onEditExpense={handleEditExpense}
                onDeleteExpense={handleDeleteExpense}
                currency={user.defaultCurrency}
              />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsView expenses={expenses} currency={user.defaultCurrency} />
            )}

            {activeTab === 'recurring' && (
              <RecurringView currency={user.defaultCurrency} onRefreshStats={loadData} />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                user={user}
                onUserUpdated={(updatedUser) => {
                  setUser(updatedUser);
                  loadData();
                }}
                onLogout={handleLogout}
              />
            )}
          </>
        )}
      </main>

      {/* Modals & Toasts */}
      <ManualExpenseModal
        isOpen={isManualModalOpen}
        onClose={() => {
          setIsManualModalOpen(false);
          setExpenseToEdit(null);
        }}
        onExpenseSaved={loadData}
        expenseToEdit={expenseToEdit}
        defaultCurrency={user.defaultCurrency}
        customCategories={user.customCategories}
      />

      <ReceiptScannerModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onExpenseSaved={loadData}
        defaultCurrency={user.defaultCurrency}
      />

      <BudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        currentBudget={stats?.monthlyBudget}
        currency={user.defaultCurrency}
        onBudgetUpdated={loadData}
      />

      <UndoToast
        deletedExpense={recentlyDeletedExpense}
        onUndo={handleUndoDelete}
        onDismiss={() => setRecentlyDeletedExpense(null)}
      />
    </div>
  );
}
