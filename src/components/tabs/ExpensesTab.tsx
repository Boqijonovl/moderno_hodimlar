'use client';

import { useState, useEffect } from 'react';
import { Send, List, Wallet } from 'lucide-react';
import { useTranslation, Language } from '@/lib/i18n';

export default function ExpensesTab({ user, WebApp }: { user: any, WebApp: any }) {
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'ADVANCE'>('CASH');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const t = useTranslation(user?.language as Language);

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const fetchHistory = async () => {
    if (!user?.telegramId) return;
    try {
      const res = await fetch(`/api/expenses?telegramId=${user.telegramId}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.expenses || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || !amount) {
      if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: user?.telegramId,
          reason,
          amount,
          paymentMethod
        })
      });
      if (res.ok) {
        if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('success');
        setReason('');
        setAmount('');
        setPaymentMethod('CASH');
        fetchHistory();
      } else {
        if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('error');
      }
    } catch (e) {
      if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('error');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Wallet className="w-6 h-6 text-blue-600 dark:text-blue-500" />
          {t('add_expense')}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              {t('expense_reason')}
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 dark:text-white font-medium"
              placeholder={t('expense_reason_placeholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              {t('price')}
            </label>
            <input
              type="number"
              required
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 dark:text-white font-bold text-lg"
              placeholder={t('expense_amount_placeholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              {t('payment_method')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`p-3 rounded-2xl text-sm font-bold transition-all ${
                  paymentMethod === 'CASH' 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {t('cash')}
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('CARD')}
                className={`p-3 rounded-2xl text-sm font-bold transition-all ${
                  paymentMethod === 'CARD' 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {t('card')}
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('ADVANCE')}
                className={`p-3 rounded-2xl text-sm font-bold transition-all ${
                  paymentMethod === 'ADVANCE' 
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                Karparativ
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 dark:bg-blue-600 text-white font-bold p-4 rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20 disabled:opacity-70 mt-4"
          >
            {loading ? (
              <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5" />
                {t('save')}
              </>
            )}
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
          <List className="w-6 h-6 text-blue-600 dark:text-blue-500" />
          {t('history')}
        </h2>
        
        <div className="space-y-3">
          {history.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-center py-4 text-sm">{t('expense_no_history')}</p>
          ) : (
            history.map((expense) => (
              <div key={expense.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {expense.reason}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs flex-wrap">
                    <span className="text-blue-600 font-medium bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                      {expense.paymentMethod === 'CASH' ? t('cash') : expense.paymentMethod === 'CARD' ? t('card') : 'Karparativ'}
                    </span>
                    <span className="text-slate-400">{new Date(expense.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-rose-600 dark:text-rose-400">
                    -{(expense.amount || 0).toLocaleString()} <span className="text-xs font-normal text-rose-600/70">so'm</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
