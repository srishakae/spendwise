export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'JPY';

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  name: string;
  rateToUSD: number; // For multi-currency estimation
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', rateToUSD: 0.012 },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', rateToUSD: 1.0 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', rateToUSD: 1.09 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', rateToUSD: 1.28 },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', rateToUSD: 0.0067 },
};

export const DEFAULT_CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Education',
  'Entertainment',
  'Bills',
  'Health',
  'Travel',
  'Other',
] as const;

export interface CustomCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export type ChatbotPersonality = 'Professional' | 'Friendly' | 'Casual' | 'Funny';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  defaultCurrency: CurrencyCode;
  chatbotPersonality: ChatbotPersonality;
  totpEnabled: boolean;
  weeklyDigestEnabled: boolean;
  pushNotificationsEnabled: boolean;
  hasPasskey: boolean;
  customCategories: CustomCategory[];
  createdAt: string;
}

export interface SessionInfo {
  id: string;
  device: string;
  ip: string;
  userAgent: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface ExpenseConfidence {
  amount: number;
  category: number;
  date: number;
}

export interface Expense {
  id: string;
  userId: string;
  amount: number;
  currency: CurrencyCode;
  category: string;
  description: string;
  merchant?: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
  source: 'Chat' | 'Manual' | 'Bill Scan' | 'Voice' | 'Recurring';
  confidence?: ExpenseConfidence;
  isRecurringInstance?: boolean;
}

export interface MonthlyBudget {
  userId: string;
  amount: number;
  currency: CurrencyCode;
  updatedAt: string;
}

export interface CategoryBudget {
  id: string;
  userId: string;
  category: string;
  amount: number;
  currency: CurrencyCode;
}

export interface RecurringExpense {
  id: string;
  userId: string;
  description: string;
  amount: number;
  currency: CurrencyCode;
  category: string;
  frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
  startDate: string;
  endDate?: string;
  nextDueDate: string;
  active: boolean;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  conversationId?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  expenseCreated?: Expense;
  isThinking?: boolean;
  confidenceFlag?: boolean;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: 'budget_warning' | 'recurring_due' | 'weekly_digest' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  userId: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface ReceiptScanResult {
  merchant?: string;
  date?: string;
  total?: number;
  currency?: CurrencyCode;
  category?: string;
  items?: Array<{ name: string; price?: number }>;
  confidence: {
    merchant: number;
    total: number;
    category: number;
    date: number;
  };
}

export interface DashboardStats {
  totalSpentMonth: number;
  monthlyBudget: number;
  remainingBudget: number;
  budgetPercentage: number;
  expenseCountMonth: number;
  avgDailySpend: number;
  projectedMonthEndSpend: number;
  currency: CurrencyCode;
  categorySpending: Record<string, number>;
  dailySpending: Array<{ date: string; amount: number; count: number }>;
  recentExpenses: Expense[];
  heatmapData: Record<string, number>; // date -> amount
  recurringUpcoming: Array<RecurringExpense & { daysRemaining: number }>;
}
