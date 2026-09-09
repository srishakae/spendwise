import type {
  UserProfile,
  Expense,
  MonthlyBudget,
  CategoryBudget,
  RecurringExpense,
  ChatMessage,
  NotificationItem,
  AuditLogItem,
  ReceiptScanResult,
  DashboardStats,
  CurrencyCode,
  SessionInfo,
} from './types';

const TOKEN_KEY = 'spendwise_token';
const OFFLINE_QUEUE_KEY = 'spendwise_offline_queue';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

// Offline queue for expenses created while disconnected
export interface QueuedExpense {
  id: string;
  payload: any;
  timestamp: string;
}

export function getOfflineQueue(): QueuedExpense[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToOfflineQueue(payload: any) {
  const queue = getOfflineQueue();
  queue.push({
    id: 'offline-' + Date.now(),
    payload,
    timestamp: new Date().toISOString(),
  });
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

export function clearOfflineQueue() {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
}

// Generic fetch wrapper with auth header
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const res = await fetch(endpoint, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      // Session expired or invalid
      setAuthToken(null);
      window.dispatchEvent(new Event('spendwise:unauthorized'));
      throw new Error('Authentication required');
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed with status ${res.status}`);
    }

    return await res.json();
  } catch (err: any) {
    if (!navigator.onLine) {
      window.dispatchEvent(new Event('spendwise:offline'));
    }
    throw err;
  }
}

export const api = {
  // Auth
  async signup(data: { email: string; password: string; name?: string; defaultCurrency?: CurrencyCode }) {
    const res = await request<{ token: string; user: UserProfile }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setAuthToken(res.token);
    return res;
  },

  async login(data: { email: string; password: string; totpCode?: string }) {
    const res = await request<{ token?: string; user?: UserProfile; requires2FA?: boolean }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) {
      setAuthToken(res.token);
    }
    return res;
  },

  async googleLogin(email?: string, name?: string) {
    const res = await request<{ token: string; user: UserProfile }>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ email, name }),
    });
    setAuthToken(res.token);
    return res;
  },

  async passkeyRegister() {
    return request<{ success: boolean; hasPasskey: boolean }>('/api/auth/passkey/register', {
      method: 'POST',
    });
  },

  async passkeyLogin(email: string) {
    const res = await request<{ token: string; user: UserProfile }>('/api/auth/passkey/login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    setAuthToken(res.token);
    return res;
  },

  async setupTOTP() {
    return request<{ secret: string; qrSample: string }>('/api/auth/totp/setup', { method: 'POST' });
  },

  async verifyTOTP(code: string) {
    return request<{ success: boolean; totpEnabled: boolean }>('/api/auth/totp/verify', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },

  async disableTOTP() {
    return request<{ success: boolean; totpEnabled: boolean }>('/api/auth/totp/disable', { method: 'POST' });
  },

  async getMe() {
    return request<UserProfile>('/api/auth/me');
  },

  async getProfile() {
    return request<UserProfile>('/api/auth/me');
  },

  async updateProfile(updates: Partial<UserProfile>) {
    return request<UserProfile>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async getSessions() {
    return request<SessionInfo[]>('/api/auth/sessions');
  },

  async revokeSession(id: string) {
    return request<{ success: boolean }>(`/api/auth/sessions/${id}`, { method: 'DELETE' });
  },

  async changePassword(currentPassword: string, newPassword: string) {
    return request<{ success: boolean }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  async deleteAccount() {
    const res = await request<{ success: boolean }>('/api/auth/account', { method: 'DELETE' });
    setAuthToken(null);
    return res;
  },

  async logout() {
    try {
      await request<{ success: boolean }>('/api/auth/logout', { method: 'POST' });
    } catch {}
    setAuthToken(null);
  },

  // Expenses
  async getExpenses(filters?: { category?: string; search?: string; startDate?: string; endDate?: string }) {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    return request<Expense[]>(`/api/expenses?${params.toString()}`);
  },

  async addExpense(expense: Partial<Expense>) {
    // If offline, queue it!
    if (!navigator.onLine) {
      addToOfflineQueue(expense);
      const fakeExpense: Expense = {
        id: 'local-' + Date.now(),
        userId: 'current',
        amount: Number(expense.amount),
        currency: expense.currency || 'INR',
        category: expense.category || 'Other',
        description: expense.description || 'Expense',
        date: expense.date || new Date().toISOString().split('T')[0],
        source: expense.source || 'Manual',
        createdAt: new Date().toISOString(),
      };
      return fakeExpense;
    }
    return request<Expense>('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(expense),
    });
  },

  async updateExpense(id: string, updates: Partial<Expense>) {
    return request<Expense>(`/api/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteExpense(id: string) {
    return request<{ success: boolean; expense: Expense }>(`/api/expenses/${id}`, {
      method: 'DELETE',
    });
  },

  async undoDelete(id: string) {
    return request<{ success: boolean; expense: Expense }>(`/api/expenses/${id}/undo`, {
      method: 'POST',
    });
  },

  // Budgets
  async getBudgets() {
    return request<{ budget?: MonthlyBudget; categoryBudgets: CategoryBudget[] }>('/api/budgets');
  },

  async setBudget(amount: number, currency?: CurrencyCode) {
    return request<MonthlyBudget>('/api/budgets', {
      method: 'POST',
      body: JSON.stringify({ amount, currency }),
    });
  },

  async setMonthlyBudget(amount: number, currency?: CurrencyCode) {
    return this.setBudget(amount, currency);
  },

  async setCategoryBudget(category: string, amount: number, currency?: CurrencyCode) {
    return request<CategoryBudget>('/api/budgets/categories', {
      method: 'POST',
      body: JSON.stringify({ category, amount, currency }),
    });
  },

  async deleteCategoryBudget(id: string) {
    return request<{ success: boolean }>(`/api/budgets/categories/${id}`, { method: 'DELETE' });
  },

  // Recurring
  async getRecurring() {
    return request<RecurringExpense[]>('/api/recurring');
  },

  async addRecurring(data: Partial<RecurringExpense>) {
    return request<RecurringExpense>('/api/recurring', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateRecurring(id: string, updates: Partial<RecurringExpense>) {
    return request<RecurringExpense>(`/api/recurring/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteRecurring(id: string) {
    return request<{ success: boolean }>(`/api/recurring/${id}`, { method: 'DELETE' });
  },

  // Chat
  async getChatHistory() {
    return request<ChatMessage[]>('/api/chat/history');
  },

  async clearChatHistory() {
    return request<{ success: boolean }>('/api/chat/history', { method: 'DELETE' });
  },

  async sendMessage(message: string) {
    return request<{ message: ChatMessage; expense?: Expense; aiResult?: any }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },

  // AI tools
  async scanReceipt(imageBase64: string, mimeType: string) {
    return request<ReceiptScanResult>('/api/ai/scan-receipt', {
      method: 'POST',
      body: JSON.stringify({ imageBase64, mimeType }),
    });
  },

  async getSavingAdvice() {
    return request<{ advice: string }>('/api/ai/suggest-savings');
  },

  async semanticSearch(q: string) {
    return request<Expense[]>(`/api/ai/semantic-search?q=${encodeURIComponent(q)}`);
  },

  // Stats & Analytics
  async getDashboardStats() {
    return request<DashboardStats>('/api/stats/dashboard');
  },

  async getAnalytics() {
    return request<any>('/api/analytics');
  },

  // Notifications & Audits
  async getNotifications() {
    return request<NotificationItem[]>('/api/notifications');
  },

  async markNotificationRead(id: string) {
    return request<{ success: boolean }>(`/api/notifications/${id}/read`, { method: 'PUT' });
  },

  async markAllNotificationsRead() {
    return request<{ success: boolean }>('/api/notifications/read-all', { method: 'POST' });
  },

  async getAuditLogs() {
    return request<AuditLogItem[]>('/api/audit-logs');
  },

  // Realtime subscription
  subscribeToRealtime(onEvent: (event: string, data: any) => void): () => void {
    const token = getAuthToken();
    if (!token) return () => {};

    const es = new EventSource(`/api/realtime?token=${token}`);
    es.addEventListener('expense_added', (e) => onEvent('expense_added', JSON.parse(e.data)));
    es.addEventListener('expense_updated', (e) => onEvent('expense_updated', JSON.parse(e.data)));
    es.addEventListener('expense_deleted', (e) => onEvent('expense_deleted', JSON.parse(e.data)));
    es.addEventListener('expense_restored', (e) => onEvent('expense_restored', JSON.parse(e.data)));
    es.addEventListener('budget_updated', (e) => onEvent('budget_updated', JSON.parse(e.data)));
    es.addEventListener('new_notification', (e) => onEvent('new_notification', JSON.parse(e.data)));

    return () => {
      es.close();
    };
  },

  listenRealtime(onEvent: (data: any) => void): () => void {
    return this.subscribeToRealtime((eventType, data) => onEvent({ type: eventType, ...data }));
  },

  // Sync offline queue when coming back online
  async syncOfflineQueue() {
    const queue = getOfflineQueue();
    if (queue.length === 0) return;

    for (const item of queue) {
      try {
        await request<Expense>('/api/expenses', {
          method: 'POST',
          body: JSON.stringify(item.payload),
        });
      } catch (err) {
        console.error('Failed to sync offline expense item:', err);
      }
    }
    clearOfflineQueue();
  },
};
