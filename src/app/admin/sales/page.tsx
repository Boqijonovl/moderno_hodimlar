'use client';

import { useState, useEffect } from 'react';
import { BarChart2, Trash2, Wallet, Package, Printer } from 'lucide-react';

export default function SalesAnalytics() {
  const [sales, setSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'sales' | 'expenses'>('sales');

  useEffect(() => {
    fetch('/api/sales')
      .then(res => res.json())
      .then(setSales);

    fetch('/api/admin/expenses')
      .then(res => res.json())
      .then(setExpenses);
  }, []);

  const printReport = () => {
    if (activeTab === 'sales') {
      if (sales.length === 0) return alert("Sotuvlar yo'q");
      const url = `${window.location.origin}/print/sales`;
      if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.openLink) {
        (window as any).Telegram.WebApp.openLink(url);
      } else {
        window.open(url, '_blank');
      }
    } else {
      if (expenses.length === 0) return alert("Xarajatlar yo'q");
      const url = `${window.location.origin}/print/expenses`;
      if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.openLink) {
        (window as any).Telegram.WebApp.openLink(url);
      } else {
        window.open(url, '_blank');
      }
    }
  };

  const deleteSale = async (id: string) => {
    if (!confirm("Haqiqatan ham bu savdoni o'chirmoqchimisiz?")) return;
    try {
      const res = await fetch(`/api/admin/sales/${id}`, { method: 'DELETE' });
      if (res.ok) setSales(sales.filter(s => s.id !== id));
      else alert("O'chirishda xatolik yuz berdi");
    } catch (e) {
      console.error(e);
      alert("Tarmoq xatosi");
    }
  };

  const deleteExpense = async (id: string) => {
    if (!confirm("Haqiqatan ham bu xarajatni o'chirmoqchimisiz?")) return;
    try {
      const res = await fetch(`/api/admin/expenses/${id}`, { method: 'DELETE' });
      if (res.ok) setExpenses(expenses.filter(e => e.id !== id));
      else alert("O'chirishda xatolik yuz berdi");
    } catch (e) {
      console.error(e);
      alert("Tarmoq xatosi");
    }
  };

  const groupedSales = sales.reduce((acc: any, sale: any) => {
    const date = new Date(sale.createdAt).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' });
    if (!acc[date]) acc[date] = [];
    acc[date].push(sale);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Kassa Tahlili</h1>
          <p className="text-slate-500 text-sm">Daromad va Xarajatlar ro'yxati</p>
        </div>
        <button 
          onClick={printReport}
          className="bg-blue-600 text-white p-2 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm active:scale-95"
        >
          <Printer className="w-5 h-5" />
          <span className="text-sm font-medium">Chop etish</span>
        </button>
      </div>

      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
        <button
          onClick={() => setActiveTab('sales')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-all ${
            activeTab === 'sales' 
              ? 'bg-white text-emerald-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Package className="w-4 h-4" />
          Daromad
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-all ${
            activeTab === 'expenses' 
              ? 'bg-white text-rose-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Wallet className="w-4 h-4" />
          Xarajat
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          {activeTab === 'sales' ? <BarChart2 className="w-5 h-5 text-emerald-500" /> : <Wallet className="w-5 h-5 text-rose-500" />}
          <h2 className="font-semibold text-slate-800">{activeTab === 'sales' ? 'Sotuvlar Tarixi' : 'Xarajatlar Tarixi'}</h2>
        </div>
        
        <div className="divide-y divide-slate-100">
          {activeTab === 'sales' ? (
            <>
              {sales.length === 0 && <div className="p-8 text-center text-slate-500">Hozircha sotuvlar yo'q</div>}
              {Object.entries(groupedSales).map(([date, dateSales]: [string, any]) => (
                <div key={date} className="border-b border-slate-100 last:border-none">
                  <div className="px-4 py-2 bg-slate-100/50 text-slate-600 font-bold text-xs uppercase sticky top-0 backdrop-blur-sm z-10 border-b border-slate-100">
                    {date}
                  </div>
                  <div className="divide-y divide-slate-50">
                    {dateSales.map((sale: any) => {
                      const allItems = [...(sale.items || []), ...(sale.orders || [])];
                      return (
                        <div key={sale.id} className="p-4 flex justify-between items-start hover:bg-slate-50 transition-colors gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded inline-block text-xs mb-2">{allItems.length} ta mebel</p>
                            <div className="space-y-1.5 mb-2 bg-white border border-slate-100 rounded-lg p-2 shadow-sm">
                              {allItems.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-xs">
                                  <span className="text-slate-700 font-medium">
                                    • {item.name} {item.deadline ? <span className="text-blue-500">(📦 Buyurtma)</span> : ''}
                                  </span>
                                  <span className="text-slate-900 font-bold">{item.price?.toLocaleString()} so'm</span>
                                </div>
                              ))}
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs">
                              <span className="text-slate-500 truncate">Sotuvchi: <span className="font-semibold text-slate-700">{sale.user?.name || 'Noma\'lum'}</span></span>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-2 shrink-0">
                            <div className="flex flex-col items-end">
                              <p className="font-black text-emerald-600 text-sm sm:text-base">{(sale.totalPrice || 0).toLocaleString()} so'm</p>
                              
                              {(sale.status === 'INCOMPLETE' || (sale.paymentMethod === 'INSTALLMENT' && sale.balance > 0)) && (
                                <div className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-md mt-1 shadow-sm border border-rose-100 whitespace-nowrap">
                                  ⚠️ Qarz: {sale.balance?.toLocaleString()} so'm
                                </div>
                              )}

                              <div className="flex gap-1 mt-1 flex-wrap justify-end">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-medium whitespace-nowrap">
                                  {new Date(sale.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium uppercase whitespace-nowrap">
                                  {sale.paymentMethod === 'CASH' ? 'Naqd' : sale.paymentMethod === 'CARD' ? 'Karta' : 'Karparativ'}
                                </span>
                              </div>
                            </div>
                            <button 
                              onClick={() => deleteSale(sale.id)}
                              className="p-1.5 sm:p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors active:scale-95 shrink-0"
                              title="O'chirish"
                            >
                              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              {expenses.length === 0 && <div className="p-8 text-center text-slate-500">Hozircha xarajatlar yo'q</div>}
              {expenses.map(expense => (
                <div key={expense.id} className="p-4 flex justify-between items-start hover:bg-slate-50 transition-colors gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800">{expense.reason}</p>
                    <div className="flex items-center gap-1 mt-1 text-xs">
                      <span className="text-slate-400">Xodim:</span>
                      <span className="text-slate-600 font-medium truncate">{expense.user?.name || 'Noma\'lum'}</span>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2 shrink-0">
                    <div className="flex flex-col items-end">
                      <p className="font-bold text-rose-600 text-sm sm:text-base">
                        -{(expense.amount || 0).toLocaleString()} so'm
                      </p>

                      <div className="flex gap-1 mt-1 flex-wrap justify-end">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-medium whitespace-nowrap">
                          {new Date(expense.createdAt).toLocaleDateString()}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-medium uppercase whitespace-nowrap">
                          {expense.paymentMethod === 'CASH' ? 'Naqd' : expense.paymentMethod === 'CARD' ? 'Karta' : 'Karparativ'}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => deleteExpense(expense.id)}
                      className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors active:scale-95 shrink-0"
                      title="O'chirish"
                    >
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
