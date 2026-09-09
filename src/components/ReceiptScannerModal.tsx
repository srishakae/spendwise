import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Edit2,
  DollarSign,
  Calendar,
  Store,
  Tag,
} from 'lucide-react';
import type { ReceiptScanResult, CurrencyCode } from '../types';
import { CURRENCIES, DEFAULT_CATEGORIES } from '../types';
import { api } from '../api';

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpenseSaved: () => void;
  defaultCurrency: CurrencyCode;
}

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  isOpen,
  onClose,
  onExpenseSaved,
  defaultCurrency,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ReceiptScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Editable fields before saving
  const [merchant, setMerchant] = useState('');
  const [total, setTotal] = useState('');
  const [category, setCategory] = useState('Food');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);
      setError(null);
      setScanResult(null);

      // Extract base64 part
      const base64Data = dataUrl.split(',')[1];
      await performScan(base64Data, file.type);
    };
    reader.readAsDataURL(file);
  };

  const performScan = async (base64Data: string, mimeType: string) => {
    setScanning(true);
    setError(null);
    try {
      const result = await api.scanReceipt(base64Data, mimeType);
      setScanResult(result);
      setMerchant(result.merchant || 'Store');
      setTotal(result.total?.toString() || '');
      setCategory(result.category || 'Food');
      setDate(result.date || new Date().toISOString().split('T')[0]);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze receipt. Please verify image clarity.');
    } finally {
      setScanning(false);
    }
  };

  const handleConfirmAddExpense = async () => {
    const numAmount = parseFloat(total);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please provide a valid total amount.');
      return;
    }

    setSaving(true);
    try {
      await api.addExpense({
        amount: numAmount,
        currency: scanResult?.currency || defaultCurrency,
        category,
        description: merchant ? `Receipt from ${merchant}` : 'Receipt Scan',
        merchant: merchant || undefined,
        date,
        source: 'Bill Scan',
        confidence: scanResult?.confidence,
      });

      onExpenseSaved();
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save scanned expense');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setImagePreview(null);
    setScanResult(null);
    setError(null);
    setIsEditing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 max-w-lg w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              AI Receipt & Bill Scanner
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2 border border-rose-200 dark:border-rose-900">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Upload Dropzone */}
        {!imagePreview ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl p-8 text-center cursor-pointer transition-colors space-y-3 bg-stone-50/50 dark:bg-stone-850/50"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-800 dark:text-stone-200">
                Click to upload bill photo or receipt
              </p>
              <p className="text-[11px] text-stone-500 mt-1">
                PNG, JPG, WebP up to 10MB. AI automatically detects amount, merchant, and items.
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Image Preview & Scanning Indicator */}
            <div className="relative rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800 max-h-48 flex items-center justify-center border border-stone-200 dark:border-stone-700">
              <img
                src={imagePreview}
                alt="Receipt preview"
                className="max-h-48 object-contain w-full"
              />
              {scanning && (
                <div className="absolute inset-0 bg-stone-950/60 backdrop-blur-2xs flex flex-col items-center justify-center text-white space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                  <p className="text-xs font-semibold">Gemini Vision is analyzing receipt...</p>
                </div>
              )}
            </div>

            {/* Extracted Details Card */}
            {scanResult && !scanning && (
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-850 border border-stone-200/90 dark:border-stone-750 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Extracted Details</span>
                  </span>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center space-x-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>{isEditing ? 'Done Editing' : 'Edit Details'}</span>
                  </button>
                </div>

                {/* Form Fields / Review */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
                      Merchant / Store
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={merchant}
                        onChange={(e) => setMerchant(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-xs"
                      />
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-stone-800 dark:text-stone-200">{merchant}</span>
                        {scanResult.confidence?.merchant < 0.8 && (
                          <span className="text-[9px] text-amber-600 font-bold bg-amber-50 dark:bg-amber-950/40 px-1 py-0.5 rounded">
                            Uncertain
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
                      Total Amount
                    </label>
                    {isEditing ? (
                      <input
                        type="number"
                        step="any"
                        value={total}
                        onChange={(e) => setTotal(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-xs font-bold"
                      />
                    ) : (
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {scanResult.currency || defaultCurrency} {total}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
                      Category
                    </label>
                    {isEditing ? (
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-xs"
                      >
                        {DEFAULT_CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                        {category}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
                      Date
                    </label>
                    {isEditing ? (
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-xs"
                      />
                    ) : (
                      <span className="text-stone-700 dark:text-stone-300 font-medium">{date}</span>
                    )}
                  </div>
                </div>

                {/* Extracted items preview if available */}
                {scanResult.items && scanResult.items.length > 0 && (
                  <div className="pt-2 border-t border-stone-200 dark:border-stone-750">
                    <p className="text-[10px] uppercase font-bold text-stone-400 mb-1">Line Items:</p>
                    <div className="space-y-1 max-h-24 overflow-y-auto text-[11px] text-stone-600 dark:text-stone-400">
                      {scanResult.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>{item.name}</span>
                          {item.price && <span>{item.price}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => {
                  setImagePreview(null);
                  setScanResult(null);
                }}
                className="text-xs text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
              >
                Scan Another
              </button>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAddExpense}
                  disabled={saving || scanning || !scanResult}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {saving ? 'Adding...' : 'Add Expense'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
