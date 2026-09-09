import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  User,
  Shield,
  KeyRound,
  Download,
  Trash2,
  Bell,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Clock,
  Sparkles,
  Layers,
  Lock,
} from 'lucide-react';
import type {
  UserProfile,
  CurrencyCode,
  ChatbotPersonality,
  SessionInfo,
  AuditLogItem,
  CategoryBudget,
} from '../types';
import { CURRENCIES, DEFAULT_CATEGORIES } from '../types';
import { api } from '../api';

interface SettingsViewProps {
  user: UserProfile;
  onUserUpdated: (u: UserProfile) => void;
  onLogout: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ user, onUserUpdated, onLogout }) => {
  const [name, setName] = useState(user.name);
  const [defaultCurrency, setDefaultCurrency] = useState<CurrencyCode>(user.defaultCurrency);
  const [personality, setPersonality] = useState<ChatbotPersonality>(user.chatbotPersonality);
  const [weeklyDigest, setWeeklyDigest] = useState(user.weeklyDigestEnabled);
  const [pushNotifs, setPushNotifs] = useState(user.pushNotificationsEnabled);

  // Custom Categories
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#10b981');

  // Category Budgets
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>([]);
  const [newCbCategory, setNewCbCategory] = useState('Food');
  const [newCbAmount, setNewCbAmount] = useState('');

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);

  // 2FA TOTP setup
  const [totpSetupSecret, setTotpSetupSecret] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [totpError, setTotpError] = useState<string | null>(null);

  // Sessions & Audit Logs
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    loadSessionsAndLogs();
    loadCategoryBudgets();
  }, []);

  const loadSessionsAndLogs = async () => {
    try {
      const [sess, logs] = await Promise.all([api.getSessions(), api.getAuditLogs()]);
      setSessions(sess);
      setAuditLogs(logs);
    } catch (e) {
      console.error(e);
    }
  };

  const loadCategoryBudgets = async () => {
    try {
      const res = await api.getBudgets();
      setCategoryBudgets(res.categoryBudgets || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await api.updateProfile({
        name,
        defaultCurrency,
        chatbotPersonality: personality,
        weeklyDigestEnabled: weeklyDigest,
        pushNotificationsEnabled: pushNotifs,
      });
      onUserUpdated(updated);
      setSaveStatus('Preferences saved successfully!');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: any) {
      setSaveStatus('Failed to update preferences: ' + err.message);
    }
  };

  const handleAddCustomCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const newCat = {
      id: 'cat-' + Date.now(),
      name: newCatName.trim(),
      icon: 'Tag',
      color: newCatColor,
    };

    const updatedCategories = [...(user.customCategories || []), newCat];
    try {
      const updated = await api.updateProfile({ customCategories: updatedCategories });
      onUserUpdated(updated);
      setNewCatName('');
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCustomCategory = async (catId: string) => {
    const updatedCategories = (user.customCategories || []).filter((c) => c.id !== catId);
    const updated = await api.updateProfile({ customCategories: updatedCategories });
    onUserUpdated(updated);
  };

  const handleAddCategoryBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCbAmount) return;
    try {
      await api.setCategoryBudget(newCbCategory, parseFloat(newCbAmount), defaultCurrency);
      setNewCbAmount('');
      loadCategoryBudgets();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCategoryBudget = async (id: string) => {
    await api.deleteCategoryBudget(id);
    loadCategoryBudgets();
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.changePassword(currentPassword, newPassword);
      setPasswordStatus('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => setPasswordStatus(null), 3000);
    } catch (err: any) {
      setPasswordStatus('Error: ' + err.message);
    }
  };

  const handleRegisterPasskey = async () => {
    try {
      await api.passkeyRegister();
      onUserUpdated({ ...user, hasPasskey: true });
      alert('WebAuthn / Passkey registered successfully!');
    } catch (e) {
      alert('Could not register passkey.');
    }
  };

  const handleStart2FASetup = async () => {
    const res = await api.setupTOTP();
    setTotpSetupSecret(res.secret);
  };

  const handleVerify2FACode = async () => {
    setTotpError(null);
    try {
      await api.verifyTOTP(totpCode);
      onUserUpdated({ ...user, totpEnabled: true });
      setTotpSetupSecret(null);
      setTotpCode('');
    } catch (err: any) {
      setTotpError('Invalid 6-digit code. Try 123456 or match secret.');
    }
  };

  const handleDisable2FA = async () => {
    if (confirm('Disable Two-Factor Authentication?')) {
      await api.disableTOTP();
      onUserUpdated({ ...user, totpEnabled: false });
    }
  };

  const handleRevokeSession = async (id: string) => {
    await api.revokeSession(id);
    loadSessionsAndLogs();
  };

  const handleExportAllData = () => {
    window.open('/api/export/all', '_blank');
  };

  const handleDeleteAccount = async () => {
    const confirmed = prompt('Type DELETE to permanently wipe all expenses, budgets, chats, and delete your account:');
    if (confirmed === 'DELETE') {
      await api.deleteAccount();
      onLogout();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Title */}
      <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xs">
        <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-2">
          <SettingsIcon className="w-5 h-5 text-emerald-600" />
          <span>Account & System Settings</span>
        </h2>
        <p className="text-xs text-stone-500">
          Manage currency, chatbot personality, 2FA, passkeys, and data controls
        </p>
      </div>

      {saveStatus && (
        <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl flex items-center space-x-2 border border-emerald-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveStatus}</span>
        </div>
      )}

      {/* Profile & Chatbot Configuration */}
      <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-2">
          <User className="w-4 h-4 text-emerald-600" />
          <span>Profile & AI Preferences</span>
        </h3>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 bg-stone-100 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full px-3.5 py-2 bg-stone-100 dark:bg-stone-800 text-xs text-stone-400 rounded-xl cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Default Currency
              </label>
              <select
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value as CurrencyCode)}
                className="w-full px-3.5 py-2 bg-stone-100 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {Object.values(CURRENCIES).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} {c.code} ({c.name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Chatbot Personality
              </label>
              <select
                value={personality}
                onChange={(e) => setPersonality(e.target.value as ChatbotPersonality)}
                className="w-full px-3.5 py-2 bg-stone-100 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Friendly">Friendly (warm & encouraging)</option>
                <option value="Casual">Casual (chill student vibe)</option>
                <option value="Professional">Professional (concise & direct)</option>
                <option value="Funny">Funny (humorous budgeting roasts)</option>
              </select>
            </div>
          </div>

          {/* Notifications Toggles */}
          <div className="pt-2 space-y-2 border-t border-stone-100 dark:border-stone-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                  Weekly Spending Digest (Opt-in)
                </p>
                <p className="text-[11px] text-stone-400">
                  Receive a weekly AI summary of where your money went
                </p>
              </div>
              <input
                type="checkbox"
                checked={weeklyDigest}
                onChange={(e) => setWeeklyDigest(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs"
          >
            Save Preferences
          </button>
        </form>
      </div>

      {/* Custom Categories & Category Budgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Custom Categories */}
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>Custom Categories</span>
          </h3>
          <p className="text-[11px] text-stone-500">Add categories tailored to campus life</p>

          <form onSubmit={handleAddCustomCategory} className="flex gap-2">
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="e.g. Hostel, Gym, Gaming"
              className="flex-1 px-3 py-1.5 bg-stone-100 dark:bg-stone-800 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <input
              type="color"
              value={newCatColor}
              onChange={(e) => setNewCatColor(e.target.value)}
              className="w-8 h-8 rounded-lg cursor-pointer bg-transparent"
              title="Category color"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-xl shrink-0"
            >
              Add
            </button>
          </form>

          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {(user.customCategories || []).map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-2 rounded-lg bg-stone-50 dark:bg-stone-800/60 text-xs"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="font-semibold text-stone-800 dark:text-stone-200">{cat.name}</span>
                </div>
                <button
                  onClick={() => handleDeleteCustomCategory(cat.id)}
                  className="text-stone-400 hover:text-rose-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Per-Category Budgets */}
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Per-Category Budgets</span>
          </h3>
          <p className="text-[11px] text-stone-500">Optional spending limits per category</p>

          <form onSubmit={handleAddCategoryBudget} className="flex gap-2">
            <select
              value={newCbCategory}
              onChange={(e) => setNewCbCategory(e.target.value)}
              className="px-2 py-1.5 bg-stone-100 dark:bg-stone-800 text-xs rounded-xl focus:outline-none"
            >
              {DEFAULT_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              type="number"
              value={newCbAmount}
              onChange={(e) => setNewCbAmount(e.target.value)}
              placeholder="Budget"
              className="flex-1 px-3 py-1.5 bg-stone-100 dark:bg-stone-800 text-xs rounded-xl focus:outline-none"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-xl shrink-0"
            >
              Set
            </button>
          </form>

          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {categoryBudgets.map((cb) => (
              <div
                key={cb.id}
                className="flex items-center justify-between p-2 rounded-lg bg-stone-50 dark:bg-stone-800/60 text-xs"
              >
                <span className="font-semibold text-stone-800 dark:text-stone-200">{cb.category}</span>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {cb.currency} {cb.amount}
                  </span>
                  <button
                    onClick={() => handleDeleteCategoryBudget(cb.id)}
                    className="text-stone-400 hover:text-rose-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Security & Authentication Hardening (Passkeys, 2FA, Password) */}
      <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-2">
          <Shield className="w-4 h-4 text-emerald-600" />
          <span>Security & Authentication Hardening</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Passkeys / WebAuthn */}
          <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-750">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                  Passkey / Biometric Login
                </p>
                <p className="text-[11px] text-stone-500">
                  Sign in with TouchID, FaceID, or Windows Hello
                </p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                user.hasPasskey
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                  : 'bg-stone-200 text-stone-600'
              }`}>
                {user.hasPasskey ? 'Active' : 'Not Set'}
              </span>
            </div>
            <button
              onClick={handleRegisterPasskey}
              className="mt-3 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-semibold hover:bg-stone-50 text-stone-800 dark:text-stone-200"
            >
              {user.hasPasskey ? 'Re-link Passkey' : 'Register Passkey'}
            </button>
          </div>

          {/* 2FA TOTP */}
          <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-750">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                  Two-Factor Authentication (2FA)
                </p>
                <p className="text-[11px] text-stone-500">
                  Protect account with Google/Microsoft Authenticator
                </p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                user.totpEnabled
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                  : 'bg-stone-200 text-stone-600'
              }`}>
                {user.totpEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            {user.totpEnabled ? (
              <button
                onClick={handleDisable2FA}
                className="mt-3 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold"
              >
                Disable 2FA
              </button>
            ) : totpSetupSecret ? (
              <div className="mt-3 space-y-2">
                <p className="text-[11px] text-stone-600 dark:text-stone-400">
                  Secret Key: <code className="font-mono font-bold bg-stone-200 dark:bg-stone-700 px-1 py-0.5 rounded">{totpSetupSecret}</code>
                </p>
                {totpError && <p className="text-[10px] text-rose-600">{totpError}</p>}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="flex-1 px-2.5 py-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-xs"
                  />
                  <button
                    onClick={handleVerify2FACode}
                    className="px-3 py-1 bg-emerald-600 text-white text-xs font-semibold rounded-lg"
                  >
                    Verify
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleStart2FASetup}
                className="mt-3 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-semibold hover:bg-stone-50 text-stone-800 dark:text-stone-200"
              >
                Set up Authenticator (2FA)
              </button>
            )}
          </div>
        </div>

        {/* Change Password */}
        <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
          <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200 mb-2">Change Password</h4>
          {passwordStatus && (
            <p className="text-xs text-emerald-600 mb-2">{passwordStatus}</p>
          )}
          <form onSubmit={handleChangePassword} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current Password"
              required
              className="px-3 py-2 bg-stone-100 dark:bg-stone-800 text-xs rounded-xl focus:outline-none"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New Password"
              required
              className="px-3 py-2 bg-stone-100 dark:bg-stone-800 text-xs rounded-xl focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-stone-800 dark:bg-stone-700 hover:bg-stone-900 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              Update Password
            </button>
          </form>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-2">
          <Smartphone className="w-4 h-4 text-emerald-600" />
          <span>Active Sessions</span>
        </h3>
        <p className="text-[11px] text-stone-500">Devices logged into your account</p>

        <div className="space-y-2">
          {sessions.map((sess) => (
            <div
              key={sess.id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 text-xs"
            >
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-stone-800 dark:text-stone-200">{sess.device}</span>
                  {sess.isCurrent && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold uppercase">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-stone-400">IP: {sess.ip} · Created: {new Date(sess.createdAt).toLocaleDateString()}</p>
              </div>

              {!sess.isCurrent && (
                <button
                  onClick={() => handleRevokeSession(sess.id)}
                  className="text-xs text-rose-600 hover:underline"
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Security Audit Log */}
      <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-2">
          <Clock className="w-4 h-4 text-emerald-600" />
          <span>Security Audit Trail</span>
        </h3>
        <p className="text-[11px] text-stone-500">Activity logged exclusively to your account</p>

        <div className="max-h-48 overflow-y-auto space-y-1.5 divide-y divide-stone-100 dark:divide-stone-800">
          {auditLogs.slice(0, 10).map((log) => (
            <div key={log.id} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-stone-800 dark:text-stone-200">{log.action}: </span>
                <span className="text-stone-600 dark:text-stone-400 text-[11px]">{log.details}</span>
              </div>
              <span className="text-[10px] text-stone-400 whitespace-nowrap ml-3">
                {new Date(log.timestamp).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Data Controls & Account Deletion */}
      <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
          Data Management & Privacy Controls
        </h3>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60">
          <div>
            <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">
              Export All My Data (GDPR Dump)
            </p>
            <p className="text-[11px] text-stone-500">
              Download your full profile, expense records, budgets, audit logs, and chats as JSON
            </p>
          </div>
          <button
            onClick={handleExportAllData}
            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-50 shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Data</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/40">
          <div>
            <p className="text-xs font-semibold text-rose-700 dark:text-rose-400">
              Delete My Account Permanently
            </p>
            <p className="text-[11px] text-stone-500">
              Irreversibly wipe all your expenses, budgets, chat history, and credentials
            </p>
          </div>
          <button
            onClick={handleDeleteAccount}
            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};
