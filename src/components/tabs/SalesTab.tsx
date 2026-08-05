'use client';

import { useState, useEffect } from 'react';
import { Send, CheckCircle2, Package, Plus, Trash2, FileText, List } from 'lucide-react';
import { useTranslation, Language } from '@/lib/i18n';

export default function SalesTab({ user, WebApp }: { user: any, WebApp: any }) {
  const [items, setItems] = useState<{name: string, price: string, isOrder: boolean, description: string, deadline: string, assignedToId: string}[]>([{ name: '', price: '', isOrder: false, description: '', deadline: '', assignedToId: '' }]);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [employees, setEmployees] = useState<{id: string, name: string}[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<{id: string, name: string}[]>([]);

  const t = useTranslation(user?.language as Language);

  useEffect(() => {
    fetchHistory();
    fetch('/api/employees').then(res => res.json()).then(data => setEmployees(data)).catch(() => {});
    fetch('/api/payment-methods').then(res => res.json()).then(data => {
      setPaymentMethods(data);
      if (data.length > 0 && paymentMethod === 'CASH') {
        setPaymentMethod(data[0].name);
      }
    }).catch(() => {});
  }, [user, selectedMonth]);

  const fetchHistory = async () => {
    if (!user?.telegramId) return;
    try {
      const url = `/api/sales/history?telegramId=${user.telegramId}${selectedMonth ? `&month=${selectedMonth}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.sales || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddItem = () => {
    setItems(prev => [...prev, { name: '', price: '', isOrder: false, description: '', deadline: '', assignedToId: '' }]);
  };

  const formatNumber = (val: string) => {
    const raw = val.replace(/\D/g, '');
    if (!raw) return '';
    return Number(raw).toLocaleString('uz-UZ').replace(/,/g, ' ');
  };

  const parseNumber = (val: string) => parseFloat(val.replace(/\s/g, '')) || 0;

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setItems(prev => {
      const newItems = [...prev];
      (newItems[index] as any)[field] = value;
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
          items: validItems.map(item => ({ ...item, price: item.price.replace(/\s/g, '') })),
          paymentMethod,
          advance: paymentMethod.toLowerCase().includes('avans') || paymentMethod.toLowerCase().includes('nasiya') || paymentMethod === 'INSTALLMENT' ? advanceAmount.replace(/\s/g, '') : undefined,
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
        setItems([{ name: '', price: '', isOrder: false, description: '', deadline: '', assignedToId: '' }]);
        setAdvanceAmount('');
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

  const completeSale = async (id: string) => {
    if (!confirm("Rostdan ham ushbu savdo bo'yicha to'liq to'lov qilindimi?")) return;
    try {
      const res = await fetch(`/api/sales/${id}/complete`, { method: 'PUT' });
      if (res.ok) {
        fetchHistory();
      } else {
        alert("Xatolik yuz berdi");
      }
    } catch (e) {
      alert("Tarmoq xatosi");
    }
  };

  const openPDF = (saleId?: string) => {
    const id = saleId || lastSale?.id;
    if (id) {
      WebApp?.openLink(`${window.location.origin}/receipt/${id}`);
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
                🧾 <b>Chek tayyor!</b><br/>Chekni ko'rish tugmasini bosing:
              </p>
              <button 
                onClick={() => openPDF()}
                className="w-full bg-blue-600 text-white font-bold p-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all mb-3 shadow-md shadow-blue-600/20"
              >
                <FileText className="w-5 h-5" />
                Veb Chekni O'qish
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
                <div key={index} className="flex flex-col gap-2 relative animate-in slide-in-from-bottom-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <div className="flex gap-2 items-start w-full">
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        required
                        value={item.name}
                        onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                        className="w-full p-4 bg-white dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                        placeholder="Mebel nomi (masalan: Lider Stol)"
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        required
                        value={item.price}
                        onChange={(e) => handleItemChange(index, 'price', formatNumber(e.target.value))}
                        className="w-full p-4 bg-white dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 dark:text-white font-bold text-lg"
                        placeholder="Narxi (so'm)"
                      />
                    </div>
                    
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-colors mt-0 h-fit"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  
                  <div className="w-full mt-2">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={item.isOrder} 
                        onChange={(e) => handleItemChange(index, 'isOrder', e.target.checked)}
                        className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      📦 Buyurtmaga berish
                    </label>
                  </div>
                  
                  {item.isOrder && (
                    <div className="w-full space-y-3 mt-3 animate-in slide-in-from-top-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                      <div>
                        <label className="block text-xs font-bold text-blue-700 dark:text-blue-300 mb-1">Izoh (Rang, o'lcham, mato)</label>
                        <textarea
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          className="w-full p-3 bg-white dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm dark:text-white"
                          placeholder="Mebel bo'yicha maxsus talablar..."
                          rows={2}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-blue-700 dark:text-blue-300 mb-1">Muddat</label>
                          <input
                            type="date"
                            value={item.deadline}
                            onChange={(e) => handleItemChange(index, 'deadline', e.target.value)}
                            className="w-full p-3 bg-white dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-blue-700 dark:text-blue-300 mb-1">Usta biriktirish</label>
                          <select
                            value={item.assignedToId}
                            onChange={(e) => handleItemChange(index, 'assignedToId', e.target.value)}
                            className="w-full p-3 bg-white dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm dark:text-white"
                          >
                            <option value="">- Tanlang -</option>
                            {employees.map(emp => (
                              <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
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
                  {items.reduce((acc, curr) => acc + parseNumber(curr.price), 0).toLocaleString()} so'm
                </span>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                {t('payment_method')}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {paymentMethods.length > 0 ? paymentMethods.map(pm => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPaymentMethod(pm.name)}
                    className={`p-3 rounded-2xl font-bold text-sm transition-all ${
                      paymentMethod === pm.name
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {pm.name}
                  </button>
                )) : (
                  <div className="text-slate-400 text-sm py-2">To'lov turlari mavjud emas. Admindan qo'shishni so'rang.</div>
                )}
              </div>
            </div>

            {(paymentMethod.toLowerCase().includes('avans') || paymentMethod.toLowerCase().includes('nasiya') || paymentMethod === 'INSTALLMENT') && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                  To'lanayotgan Avans Summasi
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(formatNumber(e.target.value))}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-purple-500 dark:text-white font-bold text-lg"
                  placeholder="Avans (so'm)"
                />
                
                {advanceAmount && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-2xl flex justify-between items-center mt-2">
                    <span className="text-purple-600 dark:text-purple-400 font-semibold">Qoldiq (Qarz):</span>
                    <span className="text-xl font-black text-red-600 dark:text-red-400">
                      {(items.reduce((acc, curr) => acc + parseNumber(curr.price), 0) - parseNumber(advanceAmount)).toLocaleString()} so'm
                    </span>
                  </div>
                )}
              </div>
            )}

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
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <List className="w-6 h-6 text-blue-600 dark:text-blue-500" />
            {t('history')}
          </h2>
          <div className="flex flex-col items-end gap-2">
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-semibold border-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            />
            {history.length > 0 && (
              <div className="text-right">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Umumiy Savdo</div>
                <div className="text-sm font-bold text-emerald-600">
                  {history.reduce((sum, item) => sum + (item.totalPrice || 0), 0).toLocaleString()} so'm
                </div>
              </div>
            )}
          </div>
        </div>
        
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
                  <div className="flex items-center gap-2 mt-1 text-xs flex-wrap">
                    <span className="text-blue-600 font-medium bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                      {sale.paymentMethod === 'CASH' ? t('cash') : sale.paymentMethod === 'CARD' ? 'Karparativ' : sale.paymentMethod === 'INSTALLMENT' ? 'Avans' : sale.paymentMethod}
                    </span>
                    <span className="text-slate-400">{new Date(sale.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  
                  {(sale.status === 'INCOMPLETE' || ((sale.paymentMethod?.toLowerCase().includes('avans') || sale.paymentMethod?.toLowerCase().includes('nasiya') || sale.paymentMethod === 'INSTALLMENT') && sale.balance > 0)) && (
                    <div className="mt-3 flex flex-col gap-1">
                      <div className="text-[10px] font-black text-rose-600 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800/50 inline-block w-fit shadow-sm">
                        ⚠️ Qarz: {sale.balance?.toLocaleString()} so'm
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-right flex flex-col items-end">
                  <div className="font-black text-emerald-600 dark:text-emerald-400 text-lg">
                    {(sale.totalPrice || 0).toLocaleString()} <span className="text-xs font-normal text-emerald-600/70">so'm</span>
                  </div>
                  
                  {(sale.status === 'INCOMPLETE' || ((sale.paymentMethod?.toLowerCase().includes('avans') || sale.paymentMethod?.toLowerCase().includes('nasiya') || sale.paymentMethod === 'INSTALLMENT') && sale.balance > 0)) && (
                    <button 
                      onClick={() => completeSale(sale.id)}
                      className="mt-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold px-4 py-2 rounded-xl active:scale-95 transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1 w-full"
                    >
                      <CheckCircle2 className="w-4 h-4" /> To'liq to'landi
                    </button>
                  )}
                  
                  <button 
                    onClick={() => openPDF(sale.id)}
                    className="text-xs text-blue-600 font-bold hover:underline flex items-center justify-end gap-1 mt-3 cursor-pointer w-full"
                  >
                    <FileText className="w-4 h-4" /> Chekni ko'rish
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
