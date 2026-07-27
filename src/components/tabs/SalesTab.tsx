'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, CheckCircle2, Package, List, Download } from 'lucide-react';
import { useTranslation, Language } from '@/lib/i18n';
import html2canvas from 'html2canvas';

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
  const [lastSale, setLastSale] = useState<any>(null);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const t = useTranslation(user?.language as Language);

  useEffect(() => {
    fetchCategories();
    fetchHistory();
  }, [user]);

  useEffect(() => {
    if (success && receiptRef.current && !receiptImage) {
      // Allow DOM to settle before capturing
      setTimeout(async () => {
        try {
          if (!receiptRef.current) return;
          const canvas = await html2canvas(receiptRef.current, { scale: 3, backgroundColor: '#ffffff' });
          setReceiptImage(canvas.toDataURL("image/png"));
        } catch (err) {
          console.error("Failed to generate receipt", err);
        }
      }, 500);
    }
  }, [success, receiptImage]);

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
        const newSale = await res.json();
        setLastSale(newSale);
        setReceiptImage(null);
        setSuccess(true);
        if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('success');
        setFormData(prev => ({ ...prev, itemName: '', price: '' }));
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

  const downloadReceiptDesktop = () => {
    if (receiptImage) {
      const link = document.createElement('a');
      link.href = receiptImage;
      link.download = `Chek_${lastSale?.itemName || 'Savdo'}.png`;
      link.click();
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Package className="w-6 h-6 text-blue-600 dark:text-blue-500" />
          {t('add_sale')}
        </h2>
        
        {success ? (
          <div className="flex flex-col items-center animate-in fade-in zoom-in">
            <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 p-6 rounded-2xl flex flex-col items-center justify-center border border-emerald-100 dark:border-emerald-800 w-full mb-4">
              <CheckCircle2 className="w-12 h-12 mb-2 text-emerald-500" />
              <h3 className="text-lg font-bold">{t('success')}</h3>
            </div>
            
            {/* The actual visible image that users can long press */}
            {receiptImage ? (
              <div className="mb-4 flex flex-col items-center w-full">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 text-center animate-pulse">
                  Rasmni ustiga uzoqroq bosib saqlab oling (yoki pastdagi tugmani bosing)
                </p>
                <img src={receiptImage} alt="Chek" className="w-[300px] rounded-xl shadow-md border border-slate-200" />
              </div>
            ) : (
              <div className="mb-4 w-[300px] h-[400px] bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl flex items-center justify-center text-sm text-slate-400">
                Chek tayyorlanmoqda...
              </div>
            )}

            {/* Hidden DOM Receipt to capture */}
            <div className="absolute left-[-9999px] top-[-9999px]">
              <div ref={receiptRef} className="w-[350px] bg-white p-6 shadow-none text-slate-900 font-sans">
                <div className="text-center mb-6 border-b border-dashed border-slate-300 pb-4">
                  <h1 className="text-2xl font-black tracking-tight text-slate-800">MODERNO MEBEL</h1>
                  <p className="text-sm text-slate-500 mt-1">Sifat va Qulaylik</p>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sana:</span>
                    <span className="font-semibold">{new Date().toLocaleString('uz-UZ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sotuvchi:</span>
                    <span className="font-semibold">{user?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">To'lov turi:</span>
                    <span className="font-semibold uppercase">{lastSale?.paymentMethod === 'CASH' ? 'Naqd' : lastSale?.paymentMethod === 'CARD' ? 'Karta' : 'Muddatli'}</span>
                  </div>
                </div>
                <div className="mt-6 mb-6 border-t border-b border-dashed border-slate-300 py-4">
                  <div className="font-bold text-slate-800 mb-1">{lastSale?.itemName}</div>
                  <div className="text-xs text-slate-500 mb-2">{lastSale?.category?.name || 'Kategoriya'}</div>
                  <div className="text-right text-lg font-black text-slate-800">
                    {lastSale?.price ? lastSale.price.toLocaleString() : '0'} so'm
                  </div>
                </div>
                <div className="text-center text-xs text-slate-500 italic">
                  Xaridingiz uchun rahmat!<br/>
                  Yana kutib qolamiz.
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full">
              <button 
                onClick={downloadReceiptDesktop}
                disabled={!receiptImage}
                className="bg-slate-800 disabled:bg-slate-400 text-white font-bold p-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Download className="w-5 h-5" />
                Saqlash
              </button>
              <button 
                onClick={() => {
                  setSuccess(false);
                  setLastSale(null);
                  setReceiptImage(null);
                }}
                className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold p-3 rounded-xl active:scale-95 transition-all"
              >
                Yangi Savdo
              </button>
            </div>
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
                    {new Date(sale.date || sale.createdAt || new Date()).toLocaleDateString('uz-UZ')} {new Date(sale.date || sale.createdAt || new Date()).toLocaleTimeString('uz-UZ', {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{(sale.price || 0).toLocaleString()} so'm</div>
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
