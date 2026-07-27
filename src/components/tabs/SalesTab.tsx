'use client';

import { useState, useEffect } from 'react';
import { Send, CheckCircle2, Package, List } from 'lucide-react';
import { useTranslation, Language } from '@/lib/i18n';

export default function SalesTab({ user, WebApp }: { user: any, WebApp: any }) {
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [formData, setFormData] = useState({
    categoryId: '',
    itemName: '',
    price: '',
    paymentMethod: 'CASH'
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const t = useTranslation(user?.language as Language);

  useEffect(() => {
    fetchCategories();
    fetchHistory();
  }, [user]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
        if (data.categories?.length > 0) {
          setFormData(prev => ({ ...prev, categoryId: data.categories[0].id }));
        }
      }
    } catch (e) {
      console.error('Failed to fetch categories', e);
    }
  };

  const fetchHistory = async () => {
    if (!user?.telegramId) return;
    try {
      const res = await fetch(`/api/sales/history?telegramId=${user.telegramId}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.sales || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoryId || !formData.itemName || !formData.price) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          telegramId: user?.telegramId,
          userId: user?.id,
          employeeName: user?.name,
        })
      });

      if (res.ok) {
        setSuccess(true);
        if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('success');
        setFormData(prev => ({ ...prev, itemName: '', price: '' }));
        fetchHistory();
        setTimeout(() => setSuccess(false), 3000);
      } else {
        if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('error');
        try {
          const errorData = await res.json();
          alert(`${t('error')}: ${errorData.error}`);
        } catch(e) {
          alert(t('network_error'));
        }
      }
    } catch (e: any) {
      alert(`${t('network_error')}: ${e.message || String(e)}`);
      console.error(e);
      if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('error');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Package className="w-6 h-6 text-blue-600 dark:text-blue-500" />
          {t('add_sale')}
        </h2>
        
        {success ? (
          <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 p-8 rounded-2xl flex flex-col items-center justify-center border border-emerald-100 dark:border-emerald-800 animate-in fade-in zoom-in">
            <CheckCircle2 className="w-16 h-16 mb-4 text-emerald-500" />
            <h3 className="text-lg font-bold">{t('success')}</h3>
            <p className="text-sm mt-1 text-center">{t('success_msg')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('category')}</label>
              <select 
                value={formData.categoryId}
                onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                required
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('item_name')}</label>
              <input 
                type="text" 
                value={formData.itemName}
                onChange={(e) => setFormData({...formData, itemName: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('price')}</label>
              <input 
                type="number" 
                placeholder="0.00"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('payment_method')}</label>
              <select 
                value={formData.paymentMethod}
                onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                required
              >
                <option value="CASH">{t('cash')}</option>
                <option value="CARD">{t('card')}</option>
                <option value="INSTALLMENT">{t('installment')}</option>
              </select>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl p-4 font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Send className="w-5 h-5" />
              {loading ? t('adding') : t('add_btn')}
            </button>
          </form>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
          <List className="w-6 h-6 text-blue-600 dark:text-blue-500" />
          {t('history')}
        </h2>
        
        <div className="space-y-3">
          {history.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-center py-4 text-sm">{t('no_sales')}</p>
          ) : (
            history.map((sale) => (
              <div key={sale.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{sale.itemName}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    {new Date(sale.date).toLocaleDateString('uz-UZ')} {new Date(sale.date).toLocaleTimeString('uz-UZ', {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{sale.price.toLocaleString()} so'm</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase mt-1">
                    {sale.paymentMethod === 'CASH' ? t('cash') : sale.paymentMethod === 'CARD' ? t('card') : t('installment')}
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
