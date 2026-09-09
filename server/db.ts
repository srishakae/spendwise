import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  UserProfile,
  Expense,
  MonthlyBudget,
  CategoryBudget,
  RecurringExpense,
  ChatMessage,
  NotificationItem,
  AuditLogItem,
  CurrencyCode,
  SessionInfo,
} from '../src/types.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'spendwise_db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface StoredUser extends UserProfile {
  passwordHash?: string;
  totpSecret?: string;
}

interface StoredSession {
  id: string;
  userId: string;
  device: string;
  ip: string;
  userAgent: string;
  createdAt: string;
  expiresAt: string;
}

interface DatabaseSchema {
  users: StoredUser[];
  sessions: StoredSession[];
  expenses: Expense[];
  budgets: MonthlyBudget[];
  categoryBudgets: CategoryBudget[];
  recurringExpenses: RecurringExpense[];
  chatMessages: ChatMessage[];
  notifications: NotificationItem[];
  auditLogs: AuditLogItem[];
}

const defaultData: DatabaseSchema = {
  users: [],
  sessions: [],
  expenses: [],
  budgets: [],
  categoryBudgets: [],
  recurringExpenses: [],
  chatMessages: [],
  notifications: [],
  auditLogs: [],
};

class Database {
  private data: DatabaseSchema;
  private sseClients: Map<string, Array<(event: string, data: any) => void>> = new Map();

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Error loading database file, falling back to empty:', e);
    }
    return JSON.parse(JSON.stringify(defaultData));
  }

  private save(): void {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error persisting database:', e);
    }
  }

  // Real-time SSE subscriptions
  public subscribe(userId: string, send: (event: string, data: any) => void): () => void {
    if (!this.sseClients.has(userId)) {
      this.sseClients.set(userId, []);
    }
    this.sseClients.get(userId)!.push(send);
    return () => {
      const clients = this.sseClients.get(userId) || [];
      const idx = clients.indexOf(send);
      if (idx !== -1) clients.splice(idx, 1);
    };
  }

  public notifyUser(userId: string, event: string, payload: any) {
    const clients = this.sseClients.get(userId) || [];
    for (const send of clients) {
      try {
        send(event, payload);
      } catch (err) {
        // Ignored disconnected client
      }
    }
  }

  public logAudit(userId: string, action: string, details: string) {
    const log: AuditLogItem = {
      id: crypto.randomUUID(),
      userId,
      action,
      details,
      timestamp: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(log);
    // Keep max 500 logs
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
    this.save();
  }

  // Auth & Users
  public getUserByEmail(email: string): StoredUser | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public getUserById(id: string): StoredUser | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public createUser(user: StoredUser): StoredUser {
    this.data.users.push(user);
    this.save();
    this.logAudit(user.id, 'User Registered', `Account created with email ${user.email}`);
    return user;
  }

  public updateUser(id: string, updates: Partial<StoredUser>): StoredUser | undefined {
    const user = this.getUserById(id);
    if (!user) return undefined;
    Object.assign(user, updates);
    this.save();
    return user;
  }

  public deleteUserAccount(userId: string): boolean {
    this.data.users = this.data.users.filter((u) => u.id !== userId);
    this.data.sessions = this.data.sessions.filter((s) => s.userId !== userId);
    this.data.expenses = this.data.expenses.filter((e) => e.userId !== userId);
    this.data.budgets = this.data.budgets.filter((b) => b.userId !== userId);
    this.data.categoryBudgets = this.data.categoryBudgets.filter((cb) => cb.userId !== userId);
    this.data.recurringExpenses = this.data.recurringExpenses.filter((r) => r.userId !== userId);
    this.data.chatMessages = this.data.chatMessages.filter((m) => m.userId !== userId);
    this.data.notifications = this.data.notifications.filter((n) => n.userId !== userId);
    this.data.auditLogs = this.data.auditLogs.filter((a) => a.userId !== userId);
    this.save();
    return true;
  }

  // Sessions
  public createSession(userId: string, device: string, ip: string, userAgent: string): StoredSession {
    const session: StoredSession = {
      id: crypto.randomBytes(32).toString('hex'),
      userId,
      device: device || 'Web Browser',
      ip: ip || '127.0.0.1',
      userAgent: userAgent || 'Mozilla/5.0',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    };
    this.data.sessions.push(session);
    this.save();
    return session;
  }

  public getSession(token: string): StoredSession | undefined {
    const session = this.data.sessions.find((s) => s.id === token);
    if (session && new Date(session.expiresAt) > new Date()) {
      return session;
    }
    return undefined;
  }

  public getUserSessions(userId: string, currentToken: string): SessionInfo[] {
    return this.data.sessions
      .filter((s) => s.userId === userId && new Date(s.expiresAt) > new Date())
      .map((s) => ({
        id: s.id,
        device: s.device,
        ip: s.ip,
        userAgent: s.userAgent,
        createdAt: s.createdAt,
        isCurrent: s.id === currentToken,
      }));
  }

  public revokeSession(userId: string, sessionId: string): boolean {
    const initialLen = this.data.sessions.length;
    this.data.sessions = this.data.sessions.filter((s) => !(s.userId === userId && s.id === sessionId));
    if (this.data.sessions.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // Expenses (Row-Level Security guaranteed by scoping to userId)
  public getExpenses(
    userId: string,
    filters?: {
      category?: string;
      search?: string;
      startDate?: string;
      endDate?: string;
      minAmount?: number;
      maxAmount?: number;
      includeDeleted?: boolean;
    }
  ): Expense[] {
    let result = this.data.expenses.filter((e) => e.userId === userId);

    if (!filters?.includeDeleted) {
      result = result.filter((e) => !e.deletedAt);
    }

    if (filters?.category && filters.category !== 'All') {
      result = result.filter((e) => e.category.toLowerCase() === filters.category!.toLowerCase());
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          (e.merchant && e.merchant.toLowerCase().includes(q)) ||
          e.category.toLowerCase().includes(q)
      );
    }

    if (filters?.startDate) {
      result = result.filter((e) => e.date >= filters.startDate!);
    }

    if (filters?.endDate) {
      result = result.filter((e) => e.date <= filters.endDate!);
    }

    if (filters?.minAmount !== undefined) {
      result = result.filter((e) => e.amount >= filters.minAmount!);
    }

    if (filters?.maxAmount !== undefined) {
      result = result.filter((e) => e.amount <= filters.maxAmount!);
    }

    // Sort descending by date, then createdAt
    return result.sort((a, b) => {
      const cmp = b.date.localeCompare(a.date);
      if (cmp !== 0) return cmp;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }

  public getExpenseById(userId: string, id: string): Expense | undefined {
    return this.data.expenses.find((e) => e.id === id && e.userId === userId);
  }

  public addExpense(expense: Omit<Expense, 'id' | 'createdAt' | 'deletedAt'>): Expense {
    const newExpense: Expense = {
      ...expense,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      deletedAt: null,
    };
    this.data.expenses.push(newExpense);
    this.save();
    this.logAudit(
      newExpense.userId,
      'Expense Added',
      `${newExpense.currency} ${newExpense.amount} for ${newExpense.description} (${newExpense.category}) via ${newExpense.source}`
    );
    this.notifyUser(newExpense.userId, 'expense_added', newExpense);
    this.checkBudgetThreshold(newExpense.userId);
    return newExpense;
  }

  public updateExpense(userId: string, id: string, updates: Partial<Expense>): Expense | undefined {
    const expense = this.getExpenseById(userId, id);
    if (!expense) return undefined;
    Object.assign(expense, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    this.save();
    this.logAudit(userId, 'Expense Updated', `Updated expense ID ${id} (${expense.description})`);
    this.notifyUser(userId, 'expense_updated', expense);
    return expense;
  }

  public softDeleteExpense(userId: string, id: string): Expense | undefined {
    const expense = this.getExpenseById(userId, id);
    if (!expense) return undefined;
    expense.deletedAt = new Date().toISOString();
    this.save();
    this.logAudit(userId, 'Expense Soft Deleted', `Deleted ${expense.currency} ${expense.amount} - ${expense.description}`);
    this.notifyUser(userId, 'expense_deleted', { id, undoable: true });
    return expense;
  }

  public restoreExpense(userId: string, id: string): Expense | undefined {
    const expense = this.data.expenses.find((e) => e.id === id && e.userId === userId);
    if (!expense) return undefined;
    expense.deletedAt = null;
    expense.updatedAt = new Date().toISOString();
    this.save();
    this.logAudit(userId, 'Expense Restored', `Restored expense ID ${id} (${expense.description})`);
    this.notifyUser(userId, 'expense_restored', expense);
    return expense;
  }

  // Budget
  public getBudget(userId: string): MonthlyBudget | undefined {
    return this.data.budgets.find((b) => b.userId === userId);
  }

  public setBudget(userId: string, amount: number, currency: CurrencyCode): MonthlyBudget {
    let budget = this.getBudget(userId);
    if (budget) {
      budget.amount = amount;
      budget.currency = currency;
      budget.updatedAt = new Date().toISOString();
    } else {
      budget = {
        userId,
        amount,
        currency,
        updatedAt: new Date().toISOString(),
      };
      this.data.budgets.push(budget);
    }
    this.save();
    this.logAudit(userId, 'Budget Updated', `Monthly budget set to ${currency} ${amount}`);
    this.notifyUser(userId, 'budget_updated', budget);
    return budget;
  }

  public getCategoryBudgets(userId: string): CategoryBudget[] {
    return this.data.categoryBudgets.filter((cb) => cb.userId === userId);
  }

  public setCategoryBudget(userId: string, category: string, amount: number, currency: CurrencyCode): CategoryBudget {
    let cb = this.data.categoryBudgets.find((c) => c.userId === userId && c.category.toLowerCase() === category.toLowerCase());
    if (cb) {
      cb.amount = amount;
      cb.currency = currency;
    } else {
      cb = {
        id: crypto.randomUUID(),
        userId,
        category,
        amount,
        currency,
      };
      this.data.categoryBudgets.push(cb);
    }
    this.save();
    this.logAudit(userId, 'Category Budget Updated', `${category} budget set to ${currency} ${amount}`);
    this.notifyUser(userId, 'category_budget_updated', cb);
    return cb;
  }

  public deleteCategoryBudget(userId: string, id: string): boolean {
    const initial = this.data.categoryBudgets.length;
    this.data.categoryBudgets = this.data.categoryBudgets.filter((cb) => !(cb.userId === userId && cb.id === id));
    if (this.data.categoryBudgets.length !== initial) {
      this.save();
      this.notifyUser(userId, 'category_budget_deleted', { id });
      return true;
    }
    return false;
  }

  private checkBudgetThreshold(userId: string) {
    const budget = this.getBudget(userId);
    if (!budget || budget.amount <= 0) return;

    // Current month total
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthlyExpenses = this.getExpenses(userId, { startDate: `${monthPrefix}-01`, endDate: `${monthPrefix}-31` });
    const totalSpent = monthlyExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    const percentage = (totalSpent / budget.amount) * 100;

    if (percentage >= 100) {
      this.createNotification(
        userId,
        'budget_warning',
        'Monthly Budget Exceeded! ⚠️',
        `You have reached ${percentage.toFixed(0)}% of your ${budget.currency} ${budget.amount} budget (Spent: ${budget.currency} ${totalSpent.toFixed(0)}).`
      );
    } else if (percentage >= 90) {
      this.createNotification(
        userId,
        'budget_warning',
        '90% Budget Warning 🚨',
        `You have used ${percentage.toFixed(0)}% of your monthly budget. Only ${budget.currency} ${(budget.amount - totalSpent).toFixed(0)} remaining.`
      );
    } else if (percentage >= 70) {
      this.createNotification(
        userId,
        'budget_warning',
        '70% Budget Alert 💡',
        `Heads up: You've spent 70% of your ${budget.currency} ${budget.amount} monthly budget.`
      );
    }
  }

  // Recurring Expenses
  public getRecurringExpenses(userId: string): RecurringExpense[] {
    return this.data.recurringExpenses.filter((r) => r.userId === userId);
  }

  public addRecurringExpense(rec: Omit<RecurringExpense, 'id' | 'createdAt'>): RecurringExpense {
    const newRec: RecurringExpense = {
      ...rec,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.data.recurringExpenses.push(newRec);
    this.save();
    this.logAudit(rec.userId, 'Recurring Expense Created', `${rec.description} (${rec.frequency}) - ${rec.currency} ${rec.amount}`);
    this.notifyUser(rec.userId, 'recurring_updated', newRec);
    return newRec;
  }

  public updateRecurringExpense(userId: string, id: string, updates: Partial<RecurringExpense>): RecurringExpense | undefined {
    const rec = this.data.recurringExpenses.find((r) => r.id === id && r.userId === userId);
    if (!rec) return undefined;
    Object.assign(rec, updates);
    this.save();
    this.notifyUser(userId, 'recurring_updated', rec);
    return rec;
  }

  public deleteRecurringExpense(userId: string, id: string): boolean {
    const initial = this.data.recurringExpenses.length;
    this.data.recurringExpenses = this.data.recurringExpenses.filter((r) => !(r.id === id && r.userId === userId));
    if (this.data.recurringExpenses.length !== initial) {
      this.save();
      this.notifyUser(userId, 'recurring_deleted', { id });
      return true;
    }
    return false;
  }

  // Chat History
  public getChatMessages(userId: string): ChatMessage[] {
    return this.data.chatMessages
      .filter((m) => m.userId === userId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  public addChatMessage(msg: Omit<ChatMessage, 'id' | 'createdAt'>): ChatMessage {
    const newMsg: ChatMessage = {
      ...msg,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.data.chatMessages.push(newMsg);
    this.save();
    return newMsg;
  }

  public clearChatHistory(userId: string): void {
    this.data.chatMessages = this.data.chatMessages.filter((m) => m.userId !== userId);
    this.save();
    this.logAudit(userId, 'Chat History Cleared', 'User cleared conversation history');
  }

  // Notifications
  public getNotifications(userId: string): NotificationItem[] {
    return this.data.notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public createNotification(userId: string, type: NotificationItem['type'], title: string, message: string): NotificationItem {
    const notif: NotificationItem = {
      id: crypto.randomUUID(),
      userId,
      type,
      title,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.data.notifications.unshift(notif);
    if (this.data.notifications.length > 200) {
      this.data.notifications = this.data.notifications.slice(0, 200);
    }
    this.save();
    this.notifyUser(userId, 'new_notification', notif);
    return notif;
  }

  public markNotificationRead(userId: string, id: string): boolean {
    const notif = this.data.notifications.find((n) => n.id === id && n.userId === userId);
    if (notif) {
      notif.read = true;
      this.save();
      return true;
    }
    return false;
  }

  public markAllNotificationsRead(userId: string): void {
    this.data.notifications
      .filter((n) => n.userId === userId)
      .forEach((n) => (n.read = true));
    this.save();
  }

  // Audit Logs
  public getAuditLogs(userId: string): AuditLogItem[] {
    return this.data.auditLogs
      .filter((a) => a.userId === userId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  // Full Account Export (GDPR)
  public exportUserData(userId: string) {
    const user = this.getUserById(userId);
    if (!user) return null;
    const { passwordHash, totpSecret, ...cleanUser } = user;
    return {
      user: cleanUser,
      expenses: this.getExpenses(userId, { includeDeleted: true }),
      budget: this.getBudget(userId),
      categoryBudgets: this.getCategoryBudgets(userId),
      recurringExpenses: this.getRecurringExpenses(userId),
      chatMessages: this.getChatMessages(userId),
      auditLogs: this.getAuditLogs(userId),
      notifications: this.getNotifications(userId),
      exportedAt: new Date().toISOString(),
    };
  }
}

export const db = new Database();
