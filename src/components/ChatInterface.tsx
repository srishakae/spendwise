import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Receipt,
  Sparkles,
  Trash2,
  Edit2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import type { ChatMessage, Expense, CurrencyCode } from '../types';
import { DEFAULT_CATEGORIES, CURRENCIES } from '../types';
import { api } from '../api';

interface ChatInterfaceProps {
  onExpenseAddedOrUpdated: () => void;
  onOpenScanModal: () => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
  defaultCurrency: CurrencyCode;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onExpenseAddedOrUpdated,
  onOpenScanModal,
  onEditExpense,
  onDeleteExpense,
  defaultCurrency,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [categoryPickerExpenseId, setCategoryPickerExpenseId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Load chat history
  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    try {
      const history = await api.getChatHistory();
      setMessages(history);
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Voice input setup using Web Speech API
  const toggleVoiceInput = () => {
    setVoiceError(null);
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError('Speech recognition is not supported in this browser. Please type your message.');
      setTimeout(() => setVoiceError(null), 5000);
      return;
    }

    if (isRecording) {
      speechRecognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsRecording(false);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          setVoiceError(`Voice input error (${event.error}). Please type.`);
          setTimeout(() => setVoiceError(null), 4000);
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      setVoiceError('Could not start microphone access.');
      setIsRecording(false);
    }
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || input).trim();
    if (!textToSend || loading) return;

    setInput('');
    setLoading(true);

    // Optimistically show user message
    const tempUserMsg: ChatMessage = {
      id: 'temp-' + Date.now(),
      userId: 'me',
      role: 'user',
      content: textToSend,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const result = await api.sendMessage(textToSend);
      if (result.message) {
        // Stream token-by-token effect
        const fullContent = result.message.content;
        const msgId = result.message.id;

        // Initialize empty assistant bubble
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempUserMsg.id),
          tempUserMsg,
          {
            ...result.message,
            content: '',
            isThinking: false,
          },
        ]);

        // Stream tokens
        const tokens = fullContent.split(' ');
        let currentText = '';
        for (let i = 0; i < tokens.length; i++) {
          currentText += (i === 0 ? '' : ' ') + tokens[i];
          const textSnapshot = currentText;
          setMessages((prev) =>
            prev.map((m) => (m.id === msgId ? { ...m, content: textSnapshot } : m))
          );
          await new Promise((r) => setTimeout(r, 25));
        }

        if (result.expense) {
          onExpenseAddedOrUpdated();
        }
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          userId: 'me',
          role: 'assistant',
          content: "Sorry, I had trouble processing that. Please check your network or try again!",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (confirm('Clear entire conversation history?')) {
      await api.clearChatHistory();
      setMessages([]);
    }
  };

  const handleUpdateCategory = async (expense: Expense, newCat: string) => {
    try {
      await api.updateExpense(expense.id, { category: newCat });
      setCategoryPickerExpenseId(null);
      // Update local message card
      setMessages((prev) =>
        prev.map((m) => {
          if (m.expenseCreated?.id === expense.id) {
            return {
              ...m,
              confidenceFlag: false,
              expenseCreated: { ...m.expenseCreated, category: newCat },
            };
          }
          return m;
        })
      );
      onExpenseAddedOrUpdated();
    } catch (err) {
      console.error('Failed to update category:', err);
    }
  };

  const suggestedPrompts = [
    'Spent ₹250 on dinner',
    'Paid ₹800 for Uber yesterday',
    'Bought a notebook for ₹120',
    'How much did I spend this month?',
    'What was my biggest expense?',
    'Set monthly budget to ₹15000',
    'How can I save ₹2000 this month?',
  ];

  const currencySymbol = CURRENCIES[defaultCurrency]?.symbol || '₹';

  return (
    <div className="flex flex-col h-full bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/90 dark:border-stone-800 shadow-xs overflow-hidden">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-stone-200/80 dark:border-stone-800 flex items-center justify-between bg-stone-50/70 dark:bg-stone-850/50">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-1.5">
              <span>SpendWise AI</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </h2>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              Chat to log expenses & ask financial questions
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            id="chat-scan-button-top"
            onClick={onOpenScanModal}
            className="p-1.5 rounded-lg text-stone-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-stone-800 transition-colors"
            title="Scan Receipt"
          >
            <Receipt className="w-4 h-4" />
          </button>
          <button
            id="chat-clear-history-button"
            onClick={handleClearChat}
            className="p-1.5 rounded-lg text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-stone-800 transition-colors"
            title="Clear Chat History"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Voice feedback banner if any */}
      {voiceError && (
        <div className="px-4 py-2 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2 border-b border-rose-200 dark:border-rose-900">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{voiceError}</span>
        </div>
      )}

      {/* Message History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="py-6 px-3 text-center space-y-4 animate-in fade-in">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Hey! I'm SpendWise 👋
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 max-w-sm mx-auto mt-1 leading-relaxed">
                Tell me what you spent in plain English, and I'll categorize and track it for you. You can also ask me
                about your budget or spending habits!
              </p>
            </div>

            <div className="space-y-1.5 pt-2">
              <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                Try asking or logging:
              </p>
              <div className="flex flex-wrap gap-1.5 justify-center max-w-md mx-auto">
                {suggestedPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className="text-xs bg-stone-100 dark:bg-stone-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600 dark:hover:text-emerald-400 text-stone-700 dark:text-stone-300 py-1.5 px-3 rounded-xl border border-stone-200/70 dark:border-stone-700/60 transition-colors text-left"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                  isUser
                    ? 'bg-emerald-600 text-white rounded-br-xs'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 rounded-bl-xs border border-stone-200/50 dark:border-stone-700/50'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>

                {/* Expense Confirmation Card */}
                {msg.expenseCreated && (
                  <div className="mt-2.5 pt-2.5 border-t border-stone-200 dark:border-stone-700/80 bg-white dark:bg-stone-850 p-2.5 rounded-xl text-xs space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {msg.expenseCreated.currency} {msg.expenseCreated.amount}
                      </span>
                      <span className="text-[11px] text-stone-500 font-medium">
                        {msg.expenseCreated.date}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-stone-700 dark:text-stone-300">
                      <div className="flex items-center space-x-1.5 truncate">
                        <span className="font-medium truncate">
                          {msg.expenseCreated.description}
                        </span>
                        {msg.expenseCreated.merchant && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-stone-750 text-stone-500">
                            @{msg.expenseCreated.merchant}
                          </span>
                        )}
                      </div>

                      {/* Category Badge & Low Confidence flag */}
                      <div className="relative">
                        <button
                          onClick={() =>
                            setCategoryPickerExpenseId(
                              categoryPickerExpenseId === msg.expenseCreated?.id
                                ? null
                                : msg.expenseCreated!.id
                            )
                          }
                          className={`inline-flex items-center space-x-1 text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                            msg.confidenceFlag
                              ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800'
                              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                          }`}
                        >
                          <span>{msg.expenseCreated.category}</span>
                          {msg.confidenceFlag && (
                            <span className="text-[9px] underline">AI guess — tap</span>
                          )}
                          <ChevronDown className="w-2.5 h-2.5" />
                        </button>

                        {/* Category Selector Dropdown */}
                        {categoryPickerExpenseId === msg.expenseCreated.id && (
                          <div className="absolute right-0 top-6 z-30 w-36 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl shadow-lg p-1 max-h-48 overflow-y-auto">
                            {DEFAULT_CATEGORIES.map((cat) => (
                              <button
                                key={cat}
                                onClick={() =>
                                  handleUpdateCategory(msg.expenseCreated!, cat)
                                }
                                className="w-full text-left px-2.5 py-1 text-xs text-stone-800 dark:text-stone-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg"
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center justify-end space-x-2 pt-1 border-t border-stone-100 dark:border-stone-800 text-[11px]">
                      <button
                        onClick={() => onEditExpense(msg.expenseCreated!)}
                        className="inline-flex items-center space-x-1 text-stone-500 hover:text-emerald-600 dark:hover:text-emerald-400"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => onDeleteExpense(msg.expenseCreated!.id)}
                        className="inline-flex items-center space-x-1 text-stone-400 hover:text-rose-500"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-stone-400 px-1">
                {new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center space-x-2 text-stone-500 dark:text-stone-400 text-xs pl-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
            <span>SpendWise is thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Voice recording pulsating indicator */}
      {isRecording && (
        <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-xs flex items-center justify-between border-t border-emerald-200 dark:border-emerald-800/60 animate-pulse">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span className="font-semibold">Listening... speak your expense now</span>
          </div>
          <button
            onClick={toggleVoiceInput}
            className="text-[11px] underline font-bold"
          >
            Done
          </button>
        </div>
      )}

      {/* Chat Input Bar */}
      <div className="p-3 border-t border-stone-200/80 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-850/50">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center space-x-2"
        >
          {/* Bill Scan Upload Button */}
          <button
            type="button"
            id="chat-scan-bill-btn"
            onClick={onOpenScanModal}
            title="Scan Receipt / Bill Photo"
            className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-emerald-600 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors shrink-0"
          >
            <Receipt className="w-4 h-4" />
          </button>

          {/* Voice Input Button */}
          <button
            type="button"
            id="chat-voice-input-btn"
            onClick={toggleVoiceInput}
            title={isRecording ? 'Stop Recording' : 'Speak Expense'}
            className={`p-2.5 rounded-xl border transition-colors shrink-0 ${
              isRecording
                ? 'bg-rose-500 border-rose-600 text-white animate-pulse'
                : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-emerald-600'
            }`}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Text Input */}
          <input
            id="chat-message-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Spent ₹250 on lunch, or ask a question..."
            disabled={loading}
            className="flex-1 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all placeholder:text-stone-400"
          />

          {/* Send Button */}
          <button
            id="chat-send-btn"
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
