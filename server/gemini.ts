import { GoogleGenAI, Type } from '@google/genai';
import type {
  CurrencyCode,
  ChatbotPersonality,
  ReceiptScanResult,
  Expense,
  MonthlyBudget,
} from '../src/types.js';

let genAIClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  if (!genAIClient && process.env.GEMINI_API_KEY) {
    genAIClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return genAIClient;
}

export interface ExtractedExpenseResult {
  intent: 'add_expense' | 'query_expense' | 'set_budget' | 'general_finance' | 'clarification_needed';
  amount?: number;
  currency?: CurrencyCode;
  category?: string;
  date?: string; // YYYY-MM-DD
  description?: string;
  merchant?: string;
  budgetAmount?: number;
  confidence?: {
    amount: number;
    category: number;
    date: number;
  };
  queryType?: 'month_total' | 'category_total' | 'biggest_expense' | 'weekly_total' | 'spending_health' | 'top_categories' | 'saving_advice' | 'custom_search';
  queryFilters?: {
    category?: string;
    timeframe?: string;
  };
  replyMessage: string;
  clarificationQuestion?: string;
}

/**
 * Parses user input using Gemini 3.8 Flash structured output.
 */
export async function processNaturalLanguageChat(params: {
  message: string;
  defaultCurrency: CurrencyCode;
  personality: ChatbotPersonality;
  userCategories: string[];
  userExpenses: Expense[];
  userBudget?: MonthlyBudget;
  currentDate: string; // YYYY-MM-DD
}): Promise<ExtractedExpenseResult> {
  const ai = getGenAI();
  const { message, defaultCurrency, personality, userCategories, userExpenses, userBudget, currentDate } = params;

  // Compute live aggregates from verified database records
  const now = new Date(currentDate);
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthExpenses = userExpenses.filter((e) => e.date.startsWith(currentMonthPrefix));
  const monthTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);

  // Category totals
  const categoryTotals: Record<string, number> = {};
  for (const exp of monthExpenses) {
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
  }
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const biggestExpense = monthExpenses.length > 0 ? [...monthExpenses].sort((a, b) => b.amount - a.amount)[0] : null;

  // Fallback heuristic if API key is not yet set
  if (!ai) {
    return fallbackNLPParser(message, defaultCurrency, personality, currentDate, monthTotal, biggestExpense, sortedCategories);
  }

  const systemInstruction = `You are SpendWise, an intelligent student expense tracking chatbot assistant.
The user's preferred currency is ${defaultCurrency}.
Today's date is ${currentDate}.
Available expense categories: ${userCategories.join(', ')}.
User's Chatbot Personality style: ${personality} (speak in this tone: Professional = courteous & concise; Friendly = encouraging & warm; Casual = chill & relatable; Funny = lighthearted & humorous).

VERIFIED REAL USER DATA (Source of Truth - NEVER invent numbers):
- Current month total spending: ${defaultCurrency} ${monthTotal} across ${monthExpenses.length} expenses.
- Monthly Budget: ${userBudget ? `${userBudget.currency} ${userBudget.amount}` : 'None set yet'}.
- Top categories this month: ${sortedCategories.map(([c, a]) => `${c}: ${defaultCurrency} ${a}`).join(', ') || 'No expenses yet'}.
- Biggest expense this month: ${biggestExpense ? `${biggestExpense.description} (${defaultCurrency} ${biggestExpense.amount} on ${biggestExpense.date})` : 'None'}.
- Total expenses recorded in database: ${userExpenses.length}.

YOUR TASKS:
1. Determine the user's intent:
   - "add_expense": user mentions spending money (e.g. "Spent 250 on dinner", "Paid 800 for Uber yesterday", "Bought notebook for 120", "coffee 4.50", "Spent ₹500 at Starbucks").
   - "query_expense": user asks about their spending (e.g. "How much did I spend this month?", "How much on food?", "What was my biggest expense?", "Where am I spending the most?").
   - "set_budget": user asks to set or change budget (e.g. "Set budget to 15000", "My monthly budget is 500 dollars").
   - "general_finance": user asks for saving tips, budgeting advice, or general finance guidance.
   - "clarification_needed": user mentions spending without specifying amount, or missing essential information.

2. If "add_expense":
   - Extract 'amount' (numeric only, e.g. 250).
   - Extract 'currency' (default to ${defaultCurrency} if symbol not specified, or match ₹=INR, $=USD, €=EUR, £=GBP, ¥=JPY).
   - Select best 'category' from [${userCategories.join(', ')}] or suggest a logical one.
   - Extract 'date' (YYYY-MM-DD; "yesterday" should be the day before ${currentDate}; defaults to ${currentDate}).
   - Extract 'description' (clean title of the item/service).
   - Extract 'merchant' (e.g. Starbucks, Uber, Amazon, McDonald's, or null if not mentioned).
   - Estimate confidence (0.0 to 1.0) for amount, category, date. If category is uncertain or inferred from generic text, set category confidence to 0.6.
   - Generate a brief, personality-appropriate confirmation reply (e.g. "Got it! Added ₹250 for dinner under Food.")

3. If "query_expense" or "general_finance":
   - Answer accurately using ONLY the verified real numbers above!
   - Never invent or fabricate expenses. If no data exists, kindly inform them to start by logging an expense.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: message,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            intent: {
              type: Type.STRING,
              enum: ['add_expense', 'query_expense', 'set_budget', 'general_finance', 'clarification_needed'],
            },
            amount: { type: Type.NUMBER },
            currency: { type: Type.STRING, enum: ['INR', 'USD', 'EUR', 'GBP', 'JPY'] },
            category: { type: Type.STRING },
            date: { type: Type.STRING },
            description: { type: Type.STRING },
            merchant: { type: Type.STRING },
            budgetAmount: { type: Type.NUMBER },
            confidence: {
              type: Type.OBJECT,
              properties: {
                amount: { type: Type.NUMBER },
                category: { type: Type.NUMBER },
                date: { type: Type.NUMBER },
              },
            },
            queryType: {
              type: Type.STRING,
              enum: [
                'month_total',
                'category_total',
                'biggest_expense',
                'weekly_total',
                'spending_health',
                'top_categories',
                'saving_advice',
                'custom_search',
              ],
            },
            replyMessage: { type: Type.STRING },
            clarificationQuestion: { type: Type.STRING },
          },
          required: ['intent', 'replyMessage'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}') as ExtractedExpenseResult;
    return parsed;
  } catch (error) {
    console.error('Error calling Gemini API for chat processing:', error);
    return fallbackNLPParser(message, defaultCurrency, personality, currentDate, monthTotal, biggestExpense, sortedCategories);
  }
}

/**
 * Multimodal Receipt / Bill Scanner using Gemini 3.8 Flash
 */
export async function scanReceiptWithAI(params: {
  imageBase64: string;
  mimeType: string;
  defaultCurrency: CurrencyCode;
}): Promise<ReceiptScanResult> {
  const ai = getGenAI();
  const { imageBase64, mimeType, defaultCurrency } = params;

  if (!ai) {
    return {
      merchant: 'Scanned Merchant',
      total: 150.0,
      currency: defaultCurrency,
      category: 'Food',
      date: new Date().toISOString().split('T')[0],
      items: [{ name: 'Item', price: 150.0 }],
      confidence: {
        merchant: 0.85,
        total: 0.9,
        category: 0.8,
        date: 0.85,
      },
    };
  }

  const prompt = `Analyze this receipt or bill photo and extract structured expense details.
Extract:
1. merchant (store, restaurant, or service name)
2. date in YYYY-MM-DD format (if only DD/MM/YY or MM/DD/YYYY is shown, infer accurately; if missing, use today's date)
3. total amount (final paid amount)
4. currency (INR, USD, EUR, GBP, or JPY; fallback to ${defaultCurrency})
5. category (choose best from Food, Transport, Shopping, Education, Entertainment, Bills, Health, Travel, Other)
6. items array with name and price if clearly visible
7. confidence scores (0.0 to 1.0) for merchant, total, category, date.
If blurry or uncertain, reflect lower confidence.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            data: imageBase64,
            mimeType: mimeType || 'image/jpeg',
          },
        },
        { text: prompt },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            merchant: { type: Type.STRING },
            date: { type: Type.STRING },
            total: { type: Type.NUMBER },
            currency: { type: Type.STRING, enum: ['INR', 'USD', 'EUR', 'GBP', 'JPY'] },
            category: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  price: { type: Type.NUMBER },
                },
              },
            },
            confidence: {
              type: Type.OBJECT,
              properties: {
                merchant: { type: Type.NUMBER },
                total: { type: Type.NUMBER },
                category: { type: Type.NUMBER },
                date: { type: Type.NUMBER },
              },
              required: ['merchant', 'total', 'category', 'date'],
            },
          },
          required: ['total', 'category', 'confidence'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}') as ReceiptScanResult;
    return parsed;
  } catch (error) {
    console.error('Error scanning receipt with Gemini:', error);
    throw new Error('Failed to analyze receipt. Please verify image clarity and try again.');
  }
}

/**
 * AI Financial Insights & Realistic Saving Suggestions grounded in real user expenses
 */
export async function generateSavingAdvice(params: {
  expenses: Expense[];
  budget?: MonthlyBudget;
  currency: CurrencyCode;
  personality: ChatbotPersonality;
}): Promise<string> {
  const ai = getGenAI();
  const { expenses, budget, currency, personality } = params;

  if (expenses.length === 0) {
    return `You haven't logged any expenses yet! Start by telling me what you spent today so I can analyze your spending patterns and give personalized saving suggestions.`;
  }

  // Calculate stats
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory: Record<string, number> = {};
  for (const exp of expenses) {
    byCategory[exp.category] = (byCategory[exp.category] || 0) + exp.amount;
  }
  const topCategories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  if (!ai) {
    const topCatStr = topCategories.map(([c, a]) => `${c} (${currency} ${a})`).join(', ');
    return `Based on your recent transactions, your highest spending categories are ${topCatStr}. To save money, consider cutting back on discretionary spending like frequent takeout or impulse shopping, and meal-prep on campus!`;
  }

  const prompt = `You are SpendWise's AI financial coach for students.
Tone: ${personality}.
User data:
- Total spending so far: ${currency} ${total}
- Monthly Budget: ${budget ? `${budget.currency} ${budget.amount}` : 'None'}
- Top spending categories: ${topCategories.map(([c, a]) => `${c}: ${currency} ${a}`).join(', ')}
- Total transactions: ${expenses.length}

Provide 3 practical, realistic, actionable student-focused money saving suggestions strictly grounded in their highest spending categories. Keep it encouraging, avoid dangerous or generic advice, and do not invent any numbers.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });
    return response.text || 'Keep tracking your daily expenses to spot opportunities to save!';
  } catch (err) {
    return 'Track your frequent daily purchases like snacks and rides — small daily savings add up quickly over the semester!';
  }
}

/**
 * Local deterministic NLP parser fallback when GEMINI_API_KEY is not configured.
 */
function fallbackNLPParser(
  msg: string,
  currency: CurrencyCode,
  personality: ChatbotPersonality,
  currentDate: string,
  monthTotal: number,
  biggestExpense: Expense | null,
  sortedCategories: Array<[string, number]>
): ExtractedExpenseResult {
  const clean = msg.trim();
  const lower = clean.toLowerCase();

  // Check budget command
  const budgetMatch = lower.match(/(?:set|change|update)?\s*budget\s*(?:to|is|=)?\s*([₹$€£¥])?\s*(\d+(?:\.\d+)?)/i);
  if (budgetMatch && (lower.includes('budget') || lower.includes('limit'))) {
    const amount = parseFloat(budgetMatch[2]);
    return {
      intent: 'set_budget',
      budgetAmount: amount,
      currency,
      replyMessage: `Monthly budget updated to ${currency} ${amount}! I'll track your spending and alert you as you near your limit.`,
    };
  }

  // Check analytical queries
  if (lower.includes('how much') || lower.includes('what was') || lower.includes('am i spending') || lower.includes('where am i') || lower.includes('how can i save') || lower.includes('summary')) {
    if (lower.includes('this month') || lower.includes('total spend') || lower.includes('spent so far')) {
      return {
        intent: 'query_expense',
        queryType: 'month_total',
        replyMessage: `You have spent a total of ${currency} ${monthTotal} this month.`,
      };
    }
    if (lower.includes('biggest') || lower.includes('highest') || lower.includes('most expensive')) {
      if (biggestExpense) {
        return {
          intent: 'query_expense',
          queryType: 'biggest_expense',
          replyMessage: `Your biggest expense this month was ${biggestExpense.description} for ${currency} ${biggestExpense.amount} on ${biggestExpense.date}.`,
        };
      } else {
        return {
          intent: 'query_expense',
          queryType: 'biggest_expense',
          replyMessage: `You have no recorded expenses yet this month!`,
        };
      }
    }
    if (lower.includes('where') || lower.includes('top category') || lower.includes('categories')) {
      if (sortedCategories.length > 0) {
        const topStr = sortedCategories.slice(0, 3).map(([c, a]) => `${c} (${currency} ${a})`).join(', ');
        return {
          intent: 'query_expense',
          queryType: 'top_categories',
          replyMessage: `Here is where your money is going this month: ${topStr}.`,
        };
      } else {
        return {
          intent: 'query_expense',
          queryType: 'top_categories',
          replyMessage: `No expenses logged yet. Once you add expenses, I'll break them down by category!`,
        };
      }
    }
    if (lower.includes('save') || lower.includes('advice')) {
      return {
        intent: 'general_finance',
        replyMessage: `To save money this month, review your non-essential spending on food delivery and subscriptions. Setting a daily allowance is also a great way to stay on track!`,
      };
    }
  }

  // Try extracting expense
  // Patterns: "spent 250 on lunch", "paid ₹800 for uber yesterday", "bought notebook for 120", "coffee 15"
  const amountMatch = clean.match(/(?:[₹$€£¥]\s*(\d+(?:\.\d+)?))|(?:\b(\d+(?:\.\d+)?)\s*(?:rs|rupees|inr|usd|dollars|euro|eur|gbp|pounds|yen)?\b)/i);
  let amount: number | undefined;
  if (amountMatch) {
    amount = parseFloat(amountMatch[1] || amountMatch[2]);
  }

  if (amount !== undefined && !isNaN(amount) && amount > 0) {
    // Detect currency
    let matchedCurrency = currency;
    if (clean.includes('₹') || lower.includes('rs') || lower.includes('rupees') || lower.includes('inr')) matchedCurrency = 'INR';
    else if (clean.includes('$') || lower.includes('dollar') || lower.includes('usd')) matchedCurrency = 'USD';
    else if (clean.includes('€') || lower.includes('euro')) matchedCurrency = 'EUR';
    else if (clean.includes('£') || lower.includes('pound')) matchedCurrency = 'GBP';
    else if (clean.includes('¥') || lower.includes('yen')) matchedCurrency = 'JPY';

    // Detect category & merchant
    let category = 'Food';
    let categoryConfidence = 0.9;
    let description = clean;
    let merchant: string | undefined = undefined;

    if (lower.includes('uber') || lower.includes('ola') || lower.includes('metro') || lower.includes('bus') || lower.includes('cab') || lower.includes('train') || lower.includes('fuel') || lower.includes('petrol') || lower.includes('transport')) {
      category = 'Transport';
      if (lower.includes('uber')) merchant = 'Uber';
      else if (lower.includes('ola')) merchant = 'Ola';
    } else if (lower.includes('book') || lower.includes('notebook') || lower.includes('tuition') || lower.includes('course') || lower.includes('exam') || lower.includes('stationery') || lower.includes('college')) {
      category = 'Education';
    } else if (lower.includes('movie') || lower.includes('netflix') || lower.includes('spotify') || lower.includes('game') || lower.includes('cinema') || lower.includes('entertainment')) {
      category = 'Entertainment';
      if (lower.includes('netflix')) merchant = 'Netflix';
      if (lower.includes('spotify')) merchant = 'Spotify';
    } else if (lower.includes('amazon') || lower.includes('clothes') || lower.includes('shoes') || lower.includes('shopping') || lower.includes('myntra')) {
      category = 'Shopping';
      if (lower.includes('amazon')) merchant = 'Amazon';
      if (lower.includes('myntra')) merchant = 'Myntra';
    } else if (lower.includes('bill') || lower.includes('recharge') || lower.includes('wifi') || lower.includes('electricity') || lower.includes('rent')) {
      category = 'Bills';
    } else if (lower.includes('doctor') || lower.includes('medicine') || lower.includes('pharmacy') || lower.includes('hospital')) {
      category = 'Health';
    } else if (lower.includes('flight') || lower.includes('hotel') || lower.includes('trip') || lower.includes('travel')) {
      category = 'Travel';
    } else if (lower.includes('lunch') || lower.includes('dinner') || lower.includes('breakfast') || lower.includes('coffee') || lower.includes('starbucks') || lower.includes('swiggy') || lower.includes('zomato') || lower.includes('food') || lower.includes('pizza') || lower.includes('burger')) {
      category = 'Food';
      if (lower.includes('starbucks')) merchant = 'Starbucks';
      if (lower.includes('swiggy')) merchant = 'Swiggy';
      if (lower.includes('zomato')) merchant = 'Zomato';
    } else {
      category = 'Other';
      categoryConfidence = 0.6; // Low confidence, trigger "AI guess — tap to confirm"
    }

    // Determine date
    let expDate = currentDate;
    if (lower.includes('yesterday')) {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      expDate = d.toISOString().split('T')[0];
    }

    // Clean description
    const stripped = clean
      .replace(/(?:spent|paid|bought|for|on|yesterday|today|₹|\$|€|£|¥|\d+(?:\.\d+)?)/gi, '')
      .trim();
    if (stripped.length > 1) {
      description = stripped.charAt(0).toUpperCase() + stripped.slice(1);
    } else {
      description = category;
    }

    return {
      intent: 'add_expense',
      amount,
      currency: matchedCurrency,
      category,
      date: expDate,
      description,
      merchant,
      confidence: {
        amount: 0.98,
        category: categoryConfidence,
        date: 0.95,
      },
      replyMessage: `Got it! Added ${matchedCurrency} ${amount} to ${category} for ${expDate === currentDate ? 'today' : 'yesterday'}.`,
    };
  }

  // If no amount found but user is asking or talking
  return {
    intent: 'clarification_needed',
    replyMessage: `I'm SpendWise, your financial assistant! To log an expense, try saying "Spent ₹250 on lunch" or "Paid $40 for Uber". You can also ask me questions like "How much did I spend this month?".`,
  };
}
