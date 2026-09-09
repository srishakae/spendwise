import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  LayoutDashboard,
  MessageSquare,
  BarChart3,
  CalendarClock,
  Settings,
  Sun,
  Moon,
  LogOut,
  Bell,
  Wifi,
  WifiOff,
  Plus,
  Receipt,
  User as UserIcon,
} from 'lucide-react';
import type { UserProfile, CurrencyCode, NotificationItem } from '../types';
import { CURRENCIES } from '../types';
import { api } from '../api';

interface NavbarProps {
  currentTab: 'dashboard' | 'chat' | 'analytics' | 'recurring' | 'settings';
  setCurrentTab: (tab: 'dashboard' | 'chat' | 'analytics' | 'recurring' | 'settings') => void;
  user: UserProfile | null;
  onLogout: () => void;
  onOpenManualModal: () => void;
  onOpenScanModal: () => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  isOnline: boolean;
  currency: CurrencyCode;
  onCurrencyChange: (c: CurrencyCode) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  user,
  onLogout,
  onOpenManualModal,
  onOpenScanModal,
  isDarkMode,
  setIsDarkMode,
  isOnline,
  currency,
  onCurrencyChange,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    if (user) {
      api.getNotifications().then(setNotifications).catch(() => {});
    }
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    await api.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200/80 dark:border-stone-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center space-x-6">
            <button
              id="brand-logo-btn"
              onClick={() => setCurrentTab('dashboard')}
              className="flex items-center space-x-2.5 text-left focus:outline-none group"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 text-emerald-100" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100">
                  SpendWise
                </span>
                <span className="hidden sm:inline-block ml-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-md">
                  Student AI
                </span>
              </div>
            </button>

            {/* Desktop Navigation Tabs */}
            <nav className="hidden md:flex items-center space-x-1">
              <button
                id="nav-tab-dashboard"
                onClick={() => setCurrentTab('dashboard')}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentTab === 'dashboard'
                    ? 'bg-stone-100 dark:bg-stone-800 text-emerald-600 dark:text-emerald-400'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800/50'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </button>

              <button
                id="nav-tab-chat"
                onClick={() => setCurrentTab('chat')}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentTab === 'chat'
                    ? 'bg-stone-100 dark:bg-stone-800 text-emerald-600 dark:text-emerald-400'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800/50'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>AI Chat</span>
              </button>

              <button
                id="nav-tab-analytics"
                onClick={() => setCurrentTab('analytics')}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentTab === 'analytics'
                    ? 'bg-stone-100 dark:bg-stone-800 text-emerald-600 dark:text-emerald-400'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800/50'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Analytics</span>
              </button>

              <button
                id="nav-tab-recurring"
                onClick={() => setCurrentTab('recurring')}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentTab === 'recurring'
                    ? 'bg-stone-100 dark:bg-stone-800 text-emerald-600 dark:text-emerald-400'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800/50'
                }`}
              >
                <CalendarClock className="w-4 h-4" />
                <span>Recurring</span>
              </button>

              <button
                id="nav-tab-settings"
                onClick={() => setCurrentTab('settings')}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentTab === 'settings'
                    ? 'bg-stone-100 dark:bg-stone-800 text-emerald-600 dark:text-emerald-400'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800/50'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </button>
            </nav>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Quick Add Buttons */}
            <button
              id="header-scan-bill-btn"
              onClick={onOpenScanModal}
              title="Scan Bill / Receipt with AI"
              className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 text-xs font-semibold hover:bg-stone-50 dark:hover:bg-stone-750 transition-colors shadow-xs"
            >
              <Receipt className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Scan Bill</span>
            </button>

            <button
              id="header-add-expense-btn"
              onClick={onOpenManualModal}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>

            {/* Currency Selector */}
            <div className="relative">
              <select
                id="currency-select-dropdown"
                value={currency}
                onChange={(e) => onCurrencyChange(e.target.value as CurrencyCode)}
                className="bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-semibold py-1.5 px-2.5 rounded-lg border border-transparent hover:border-stone-300 dark:hover:border-stone-700 focus:outline-none cursor-pointer"
              >
                {Object.values(CURRENCIES).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} {c.code}
                  </option>
                ))}
              </select>
            </div>

            {/* Online / Offline status */}
            <div
              title={isOnline ? 'Online & synced' : 'Offline mode — expenses will queue and sync'}
              className="flex items-center"
            >
              {isOnline ? (
                <Wifi className="w-4 h-4 text-emerald-500" />
              ) : (
                <div className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-[10px] font-bold">
                  <WifiOff className="w-3 h-3" />
                  <span className="hidden sm:inline">Offline</span>
                </div>
              )}
            </div>

            {/* Dark / Light Toggle */}
            <button
              id="dark-mode-toggle-btn"
              onClick={() => setIsDarkMode(!isDarkMode)}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-2 rounded-lg text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notifications Popover Toggle */}
            <div className="relative">
              <button
                id="notifications-toggle-btn"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-stone-200 dark:border-stone-800 p-3 z-50 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      Notifications ({unreadCount})
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800/60 mt-1">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-stone-500 dark:text-stone-400">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.slice(0, 5).map((n) => (
                        <div
                          key={n.id}
                          className={`py-2 px-1 text-xs ${!n.read ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''}`}
                        >
                          <p className="font-semibold text-stone-800 dark:text-stone-200">{n.title}</p>
                          <p className="text-stone-600 dark:text-stone-400 text-[11px] mt-0.5">{n.message}</p>
                          <span className="text-[9px] text-stone-400 mt-1 block">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile / Menu */}
            {user && (
              <div className="relative">
                <button
                  id="user-profile-menu-btn"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors focus:outline-none"
                >
                  <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-stone-200 dark:border-stone-800 py-1.5 z-50">
                    <div className="px-3 py-2 border-b border-stone-100 dark:border-stone-800">
                      <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">{user.name}</p>
                      <p className="text-[11px] text-stone-500 truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setCurrentTab('settings');
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/70"
                    >
                      <Settings className="w-3.5 h-3.5 text-stone-400" />
                      <span>Account Settings</span>
                    </button>
                    <button
                      onClick={onLogout}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 flex justify-around py-2 px-1">
        <button
          onClick={() => setCurrentTab('dashboard')}
          className={`flex flex-col items-center py-1 px-3 text-[11px] font-medium ${
            currentTab === 'dashboard' ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-500'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Dashboard</span>
        </button>
        <button
          onClick={() => setCurrentTab('chat')}
          className={`flex flex-col items-center py-1 px-3 text-[11px] font-medium ${
            currentTab === 'chat' ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-500'
          }`}
        >
          <MessageSquare className="w-5 h-5 mb-0.5" />
          <span>AI Chat</span>
        </button>
        <button
          onClick={() => setCurrentTab('analytics')}
          className={`flex flex-col items-center py-1 px-3 text-[11px] font-medium ${
            currentTab === 'analytics' ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-500'
          }`}
        >
          <BarChart3 className="w-5 h-5 mb-0.5" />
          <span>Analytics</span>
        </button>
        <button
          onClick={() => setCurrentTab('recurring')}
          className={`flex flex-col items-center py-1 px-3 text-[11px] font-medium ${
            currentTab === 'recurring' ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-500'
          }`}
        >
          <CalendarClock className="w-5 h-5 mb-0.5" />
          <span>Recurring</span>
        </button>
        <button
          onClick={() => setCurrentTab('settings')}
          className={`flex flex-col items-center py-1 px-3 text-[11px] font-medium ${
            currentTab === 'settings' ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-500'
          }`}
        >
          <Settings className="w-5 h-5 mb-0.5" />
          <span>Settings</span>
        </button>
      </div>
    </header>
  );
};
