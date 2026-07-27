'use client';

import { useState, useEffect } from 'react';
import { Send, CheckCircle2, Package, Plus, Trash2, FileText, List } from 'lucide-react';
import { useTranslation, Language } from '@/lib/i18n';

export default function SalesTab({ user, WebApp }: { user: any, WebApp: any }) {
  const [items, setItems] = useState<{name: string, price: string}[]>([{ name: '', price: '' }]);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  const t = useTranslation(user?.language as Language);

  useEffect(() => {
    fetchHistory();
  }, [user]);

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

  const handleAddItem = () => {
    setItems(prev => [...prev, { name: '', price: '' }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: 'name' | 'price', value: string) => {
    setItems(prev => {
      const newItems = [...prev];
      newItems[index][field] = value;
      return newItems;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validItems = items.filter(item => item.name.trim() !== '' && item.price.trim() !== '');
    if (validItems.length === 0) {
      alert("Kamida bitta mebel kiriting!");
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: validItems,
          paymentMethod,
          telegramId: user?.telegramId,
          userId: user?.id,
          employeeName: user?.name,
        })
      });

      if (res.ok) {
        const newSale = await res.json();
        setLastSale(newSale);
        setSuccess(true);
        if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('success');
        setItems([{ name: '', price: '' }]);
        fetchHistory();
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

  const openPDF = (saleId?: string) => {
    const id = saleId || lastSale?.id;
    if (id) {
      WebApp?.openLink(`${window.location.origin}/api/sales/${id}/pdf`);
    }
  };

  return (
    <div className="space-y-6 pb-6">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Yangi Savdo</h2>
            <p className="text-sm text-slate-500">{t('sales_desc')}</p>
          </div>
        </div>

        {success ? (
          <div className="flex flex-col items-center animate-in fade-in zoom-in">
            <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 p-6 rounded-2xl flex flex-col items-center justify-center border border-emerald-100 dark:border-emerald-800 w-full mb-4">
              <CheckCircle2 className="w-12 h-12 mb-2 text-emerald-500" />
              <h3 className="text-lg font-bold">{t('success')}</h3>
              <p className="text-sm mt-2 text-center">Savdo muvaffaqiyatli saqlandi.</p>
            </div>
            
            <div className="mb-6 flex flex-col items-center w-full">
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 text-center">
                🧾 <b>Chek tayyor!</b><br/>PDF botingizga yuborildi. Yoki uni shu yerdan ko'rishingiz mumkin:
              </p>
              <button 
                onClick={() => openPDF()}
                className="w-full bg-blue-600 text-white font-bold p-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all mb-3 shadow-md shadow-blue-600/20"
              >
                <FileText className="w-5 h-5" />
                PDF Chekni O'qish
              </button>
            </div>

            <div className="w-full">
              <button 
                onClick={() => {
                  setSuccess(false);
                  setLastSale(null);
                }}
                className="w-full bg-slate-800 text-white font-bold p-4 rounded-xl active:scale-95 transition-all"
              >
                Yangi Savdo Kiritish
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                Sotilgan Tovarlar
              </label>
              
              {items.map((item, index) => (
                <div key={index} className="flex gap-2 items-start relative animate-in slide-in-from-bottom-2">
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      required
                      value={item.name}
                      onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                      placeholder="Mebel nomi (masalan: Lider Stol)"
                    />
                    <input
                      type="number"
                      required
                      min="0"
                      value={item.price}
                      onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 dark:text-white font-bold text-lg"
                      placeholder="Narxi (so'm)"
                    />
                  </div>
                  
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-colors mt-0"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
              
              <button
                type="button"
                onClick={handleAddItem}
                className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-500 font-semibold flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Yana Tovar Qo'shish
              </button>
            </div>

            {items.length > 0 && items.some(i => i.price) && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl flex justify-between items-center mt-2 mb-4">
                <span className="text-blue-600 dark:text-blue-400 font-semibold">Umumiy Summa:</span>
                <span className="text-xl font-black text-blue-700 dark:text-blue-300">
                  {items.reduce((acc, curr) => acc + (parseFloat(curr.price) || 0), 0).toLocaleString()} so'm
                </span>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                {t('payment_method')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`p-3 rounded-2xl font-bold text-sm transition-all ${
                    paymentMethod === 'CASH' 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  Naqd
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CARD')}
                  className={`p-3 rounded-2xl font-bold text-sm transition-all ${
                    paymentMethod === 'CARD' 
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  Karta
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('INSTALLMENT')}
                  className={`p-3 rounded-2xl font-bold text-sm transition-all ${
                    paymentMethod === 'INSTALLMENT' 
                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  Muddatli
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
              <div key={sale.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {sale.items?.length || 0} ta mebel
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs">
                    <span className="text-blue-600 font-medium bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                      {sale.paymentMethod === 'CASH' ? t('cash') : sale.paymentMethod === 'CARD' ? t('card') : t('installment')}
                    </span>
                    <span className="text-slate-400">{new Date(sale.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-emerald-600 dark:text-emerald-400">
                    {(sale.totalPrice || 0).toLocaleString()} <span className="text-xs font-normal text-emerald-600/70">so'm</span>
                  </div>
                  <button 
                    onClick={() => openPDF(sale.id)}
                    className="text-xs text-blue-600 font-bold hover:underline inline-flex items-center gap-1 mt-1 cursor-pointer"
                  >
                    <FileText className="w-3 h-3" /> PDF Ko'rish
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
