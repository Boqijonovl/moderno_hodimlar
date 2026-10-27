'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart2, 
  Trash2, 
  Wallet, 
  Package, 
  Printer, 
  Send, 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle,
  PlusCircle,
  FileCheck2,
  X
} from 'lucide-react';
import { normalizePaymentMethod, getPaymentMethodColor } from '@/lib/formatters';

export default function SalesAnalytics() {
  const [sales, setSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'sales' | 'expenses' | 'shifts' | 'audit'>('sales');

  // Daily telegram report sending state
  const [sendingDailyReport, setSendingDailyReport] = useState(false);

  // Shift states
  const [activeShift, setActiveShift] = useState<any>(null);
  const [shiftStats, setShiftStats] = useState<any>(null);
  const [recentShifts, setRecentShifts] = useState<any[]>([]);
  const [shiftStartAmount, setShiftStartAmount] = useState('');
  const [shiftActualCash, setShiftActualCash] = useState('');
  const [shiftNote, setShiftNote] = useState('');
  const [shiftModal, setShiftModal] = useState<'open' | 'close' | null>(null);
  const [shiftLoading, setShiftLoading] = useState(false);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Pay debt modal state
  const [payDebtSale, setPayDebtSale] = useState<any>(null);
  const [debtPayAmount, setDebtPayAmount] = useState('');
  const [debtPayMethod, setDebtPayMethod] = useState<'Naqd' | 'Karta' | 'Terminal' | 'Karparativ'>('Naqd');
  const [payDebtLoading, setPayDebtLoading] = useState(false);

  const handleOpenPayDebtModal = (sale: any) => {
    setPayDebtSale(sale);
    setDebtPayAmount(sale.balance?.toString() || '');
    setDebtPayMethod('Naqd');
  };

  const handleConfirmPayDebt = async () => {
    if (!payDebtSale || !debtPayAmount) return;
    const amount = parseFloat(debtPayAmount);
    if (isNaN(amount) || amount <= 0 || amount > payDebtSale.balance) {
      alert(`Iltimos, 1 dan ${payDebtSale.balance.toLocaleString()} so'mgacha bo'lgan to'g'ri summa kiriting!`);
      return;
    }

    setPayDebtLoading(true);
    try {
      const res = await fetch(`/api/sales/${payDebtSale.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          method: debtPayMethod,
          user: 'Admin'
        })
      });
      if (res.ok) {
        setPayDebtSale(null);
        setDebtPayAmount('');
        const updated = await fetch('/api/sales').then(r => r.json());
        setSales(updated);
        fetchShifts();
        alert("✅ Qarz to'lovi muvaffaqiyatli qabul qilindi!");
      } else {
        const err = await res.json();
        alert(`Xatolik: ${err.error || 'Qarzni to\'lashda xatolik'}`);
      }
    } catch (e: any) {
      alert("Tarmoq xatosi: " + e.message);
    }
    setPayDebtLoading(false);
  };

  useEffect(() => {
    fetch('/api/sales')
      .then(res => res.json())
      .then(setSales);

    fetch('/api/admin/expenses')
      .then(res => res.json())
      .then(setExpenses);

    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    try {
      const res = await fetch('/api/admin/shifts');
      if (res.ok) {
        const data = await res.json();
        setActiveShift(data.activeShift);
        setShiftStats(data.currentStats);
        setRecentShifts(data.recentShifts || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const res = await fetch('/api/admin/audit');
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingAudit(false);
  };

  const handleTabChange = (tab: 'sales' | 'expenses' | 'shifts' | 'audit') => {
    setActiveTab(tab);
    if (tab === 'shifts') fetchShifts();
    if (tab === 'audit') fetchAuditLogs();
  };

  const handleSendDailyReport = async () => {
    if (!confirm("Bugungi kassa hisobotini barcha adminlarga Telegram orqali yuborasizmi?")) return;
    setSendingDailyReport(true);
    try {
      const res = await fetch('/api/cron/daily-report', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        alert(`✅ Bugungi kassa hisoboti ${data.sentToAdminsCount || 'barcha'} ta adminga Telegram orqali muvaffaqiyatli yuborildi!`);
      } else {
        alert("Hisobot yuborishda xatolik yuz berdi");
      }
    } catch (e) {
      console.error(e);
      alert("Tarmoq xatosi");
    }
    setSendingDailyReport(false);
  };

  const handleOpenShift = async () => {
    setShiftLoading(true);
    try {
      const res = await fetch('/api/admin/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'open',
          startAmount: shiftStartAmount,
          user: { name: 'Admin' }
        })
      });
      if (res.ok) {
        setShiftModal(null);
        setShiftStartAmount('');
        fetchShifts();
        alert("✅ Kassa smenasi ochildi va adminga xabar yuborildi!");
      } else {
        const err = await res.json();
        alert(`Xatolik: ${err.error}`);
      }
    } catch (e) {
      alert("Tarmoq xatosi");
    }
    setShiftLoading(false);
  };

  const handleCloseShift = async () => {
    if (!shiftActualCash && shiftActualCash !== '0') {
      alert("Iltimos, sanab topshirilgan haqiqiy naqd pul summasini kiriting!");
      return;
    }
    setShiftLoading(true);
    try {
      const res = await fetch('/api/admin/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'close',
          actualCash: shiftActualCash,
          note: shiftNote,
          user: { name: 'Admin' }
        })
      });
      if (res.ok) {
        setShiftModal(null);
        setShiftActualCash('');
        setShiftNote('');
        fetchShifts();
        alert("✅ Z-Hisobot tasdiqlandi, smena yopildi va Telegramga to'liq hisobot yuborildi!");
      } else {
        const err = await res.json();
        alert(`Xatolik: ${err.error}`);
      }
    } catch (e) {
      alert("Tarmoq xatosi");
    }
    setShiftLoading(false);
  };

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
    if (!confirm("Haqiqatan ham bu savdoni o'chirmoqchimisiz? (Bu harakat Audit tizimida saqlanadi va adminga bildirishnoma boradi)")) return;
    try {
      const res = await fetch(`/api/admin/sales/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSales(sales.filter(s => s.id !== id));
        alert("Savdo o'chirildi va barcha adminlarga ogohlantirish yuborildi.");
      } else {
        alert("O'chirishda xatolik yuz berdi");
      }
    } catch (e) {
      console.error(e);
      alert("Tarmoq xatosi");
    }
  };

  const deleteExpense = async (id: string) => {
    if (!confirm("Haqiqatan ham bu xarajatni o'chirmoqchimisiz? (Bu harakat Audit tizimida saqlanadi va adminga bildirishnoma boradi)")) return;
    try {
      const res = await fetch(`/api/admin/expenses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setExpenses(expenses.filter(e => e.id !== id));
        alert("Xarajat o'chirildi va barcha adminlarga ogohlantirish yuborildi.");
      } else {
        alert("O'chirishda xatolik yuz berdi");
      }
    } catch (e) {
      console.error(e);
      alert("Tarmoq xatosi");
    }
  };

  const groupedSales = sales.reduce((acc: any, sale: any) => {
    const date = new Date(sale.createdAt).toLocaleDateString('uz-UZ', { timeZone: 'Asia/Tashkent', day: 'numeric', month: 'long', year: 'numeric' });
    if (!acc[date]) acc[date] = [];
    acc[date].push(sale);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header with Title and Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Kassa & Moliya Nazorati</h1>
          <p className="text-slate-500 text-sm">Daromad, Xarajat, Kassa Smenasi (Z-Hisobot) va Xavfsizlik Auditi</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Send 21:00 Daily Telegram Summary */}
          <button 
            onClick={handleSendDailyReport}
            disabled={sendingDailyReport}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-95 text-xs font-bold disabled:opacity-50"
            title="Bugungi kassa hisobotini darhol barcha adminlarga Telegram orqali yuborish"
          >
            <Send className="w-4 h-4" />
            <span>{sendingDailyReport ? "Yuborilmoqda..." : "Telegramga Hisobot (21:00)"}</span>
          </button>

          {/* Print Report */}
          {(activeTab === 'sales' || activeTab === 'expenses') && (
            <button 
              onClick={printReport}
              className="bg-blue-600 text-white p-2 rounded-xl flex items-center gap-1.5 hover:bg-blue-700 transition-colors shadow-sm active:scale-95 text-xs font-bold"
            >
              <Printer className="w-4 h-4" />
              <span>Chop etish</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 p-1 bg-slate-100 rounded-2xl overflow-x-auto no-scrollbar">
        <button
          onClick={() => handleTabChange('sales')}
          className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
            activeTab === 'sales' 
              ? 'bg-white text-emerald-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Daromad ({sales.length})</span>
        </button>

        <button
          onClick={() => handleTabChange('expenses')}
          className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
            activeTab === 'expenses' 
              ? 'bg-white text-rose-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Xarajat ({expenses.length})</span>
        </button>

        <button
          onClick={() => handleTabChange('shifts')}
          className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
            activeTab === 'shifts' 
              ? 'bg-white text-indigo-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Kassa Smenasi (Z-Hisobot)</span>
          {activeShift && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => handleTabChange('audit')}
          className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
            activeTab === 'audit' 
              ? 'bg-white text-amber-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Audit Log</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        
        {/* 1. SALES TAB */}
        {activeTab === 'sales' && (
          <>
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-emerald-500" />
              <h2 className="font-semibold text-slate-800">Sotuvlar Tarixi</h2>
            </div>
            
            <div className="divide-y divide-slate-100">
              {sales.length === 0 && <div className="p-8 text-center text-slate-500">Hozircha sotuvlar yo'q</div>}
              {Object.entries(groupedSales).map(([date, dateSales]: [string, any]) => (
                <div key={date} className="border-b border-slate-100 last:border-none">
                  <div className="px-4 py-2 bg-slate-100/50 text-slate-600 font-bold text-xs uppercase sticky top-0 backdrop-blur-sm z-10 border-b border-slate-100">
                    {date}
                  </div>
                  <div className="divide-y divide-slate-50">
                    {dateSales.map((sale: any) => {
                      const allItems = sale.items || [];
                      return (
                        <div key={sale.id} className="p-4 flex justify-between items-start hover:bg-slate-50 transition-colors gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded inline-block text-xs mb-2">{allItems.length} ta mebel</p>
                            <div className="space-y-1.5 mb-2 bg-white border border-slate-100 rounded-lg p-2 shadow-sm">
                              {allItems.map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-xs">
                                  <span className="text-slate-700 font-medium">
                                    • {item.name}
                                  </span>
                                  <span className="text-slate-900 font-bold">{item.price?.toLocaleString()} so'm</span>
                                </div>
                              ))}
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs">
                              <span className="text-slate-500 truncate">Sotuvchi: <span className="font-semibold text-slate-700">{sale.user?.name || 'Noma\'lum'}</span></span>
                              {(sale.customerPhone || sale.customerName) && (
                                <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                                  📞 {sale.customerName ? `${sale.customerName}: ` : ''}{sale.customerPhone || ''}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-2 shrink-0">
                            <div className="flex flex-col items-end">
                              <p className="font-black text-emerald-600 text-sm sm:text-base">{(sale.totalPrice || 0).toLocaleString()} so'm</p>
                              
                              {sale.balance > 0 && (
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap justify-end">
                                  <div className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md shadow-sm border border-rose-100 whitespace-nowrap">
                                    ⚠️ Qarz: {sale.balance?.toLocaleString()} so'm
                                  </div>
                                  <button
                                    onClick={() => handleOpenPayDebtModal(sale)}
                                    className="text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 rounded-md shadow-sm active:scale-95 transition-all whitespace-nowrap"
                                  >
                                    Qarzni to'lash
                                  </button>
                                </div>
                              )}

                              <div className="flex gap-1 mt-1 flex-wrap justify-end">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-medium whitespace-nowrap">
                                  {new Date(sale.createdAt).toLocaleTimeString('uz-UZ', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {sale.payments && sale.payments.length > 0 ? (
                                  sale.payments.map((p: any, pIdx: number) => {
                                    const color = getPaymentMethodColor(p.method);
                                    return (
                                      <span
                                        key={pIdx}
                                        className={`text-[10px] px-1.5 py-0.5 rounded border font-bold uppercase whitespace-nowrap ${color.bg} ${color.text} ${color.border}`}
                                      >
                                        {normalizePaymentMethod(p.method)}
                                        {sale.payments.length > 1 ? ` (${p.amount.toLocaleString()})` : ''}
                                      </span>
                                    );
                                  })
                                ) : (
                                  <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded border font-bold uppercase whitespace-nowrap ${getPaymentMethodColor(sale.paymentMethod).bg} ${getPaymentMethodColor(sale.paymentMethod).text} ${getPaymentMethodColor(sale.paymentMethod).border}`}
                                  >
                                    {normalizePaymentMethod(sale.paymentMethod)}
                                  </span>
                                )}
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
            </div>
          </>
        )}

        {/* 2. EXPENSES TAB */}
        {activeTab === 'expenses' && (
          <>
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-rose-500" />
              <h2 className="font-semibold text-slate-800">Xarajatlar Tarixi</h2>
            </div>
            
            <div className="divide-y divide-slate-100">
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
                          {new Date(expense.createdAt).toLocaleDateString('uz-UZ', { timeZone: 'Asia/Tashkent' })}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded border font-bold uppercase whitespace-nowrap ${getPaymentMethodColor(expense.paymentMethod).bg} ${getPaymentMethodColor(expense.paymentMethod).text} ${getPaymentMethodColor(expense.paymentMethod).border}`}
                        >
                          {normalizePaymentMethod(expense.paymentMethod)}
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
            </div>
          </>
        )}

        {/* 3. CASH SHIFTS (Z-HISOBOT) TAB */}
        {activeTab === 'shifts' && (
          <div className="p-4 sm:p-6 space-y-6">
            {/* Active Shift Status Card */}
            {activeShift ? (
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap justify-between items-center gap-2 border-b border-indigo-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                    <span className="font-black text-indigo-900 text-base">Hozirgi Kassa Smenasi (OCHIQ)</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-indigo-600 bg-white px-2.5 py-1 rounded-xl border border-indigo-100">
                    Ochilgan: {new Date(activeShift.openedAt).toLocaleTimeString('uz-UZ', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' })} ({activeShift.openedBy})
                  </span>
                </div>

                {/* Shift Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white p-3 rounded-2xl border border-indigo-100 shadow-sm">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Ertalabki Boshlang'ich Kassa</span>
                    <span className="text-base sm:text-lg font-black text-slate-800 font-mono">
                      {activeShift.startAmount.toLocaleString()} so'm
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-2xl border border-indigo-100 shadow-sm">
                    <span className="text-[10px] uppercase font-bold text-emerald-600 block">➕ Naqd Savdo Tushumi</span>
                    <span className="text-base sm:text-lg font-black text-emerald-600 font-mono">
                      +{(shiftStats?.cashIn || 0).toLocaleString()} so'm
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-2xl border border-indigo-100 shadow-sm">
                    <span className="text-[10px] uppercase font-bold text-rose-500 block">➖ Naqd Xarajatlar</span>
                    <span className="text-base sm:text-lg font-black text-rose-500 font-mono">
                      -{(shiftStats?.cashOut || 0).toLocaleString()} so'm
                    </span>
                  </div>

                  <div className="bg-indigo-600 text-white p-3 rounded-2xl shadow-sm">
                    <span className="text-[10px] uppercase font-bold text-indigo-200 block">📊 Kutilayotgan Naqd Pul</span>
                    <span className="text-base sm:text-lg font-black font-mono">
                      {(shiftStats?.expectedCash || activeShift.startAmount).toLocaleString()} so'm
                    </span>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setShiftActualCash(String(shiftStats?.expectedCash || activeShift.startAmount));
                      setShiftModal('close');
                    }}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-2"
                  >
                    <FileCheck2 className="w-4 h-4" />
                    <span>Smenani Yopish (Z-Otchyot va Inkassatsiya)</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center space-y-3">
                <Clock className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-base font-bold text-slate-700">Hozirda kassa smenasi ochilmagan</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Kunlik kassa intizomini ta'minlash va pul kamomadini nazorat qilish uchun ertalabki kassa qoldig'i bilan smenani oching.
                </p>
                <button
                  onClick={() => setShiftModal('open')}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md active:scale-95 transition-all inline-flex items-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Kassa Smenasini Ochish</span>
                </button>
              </div>
            )}

            {/* Closed Shifts Archive Table */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h3 className="font-bold text-sm text-slate-700 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-indigo-500" />
                Yopilgan Smenalar Tarixi (Z-Hisobotlar)
              </h3>

              {recentShifts.filter(s => s.status === 'CLOSED').length === 0 ? (
                <p className="text-xs text-slate-400 py-3">Hozircha yopilgan smenalar mavjud emas.</p>
              ) : (
                <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase">
                      <tr>
                        <th className="p-3">Sana & Vaqt</th>
                        <th className="p-3">Mas'ul</th>
                        <th className="p-3">Boshlang'ich</th>
                        <th className="p-3">Tushum / Chiqim</th>
                        <th className="p-3">Kutilgan Naqd</th>
                        <th className="p-3">Topshirildi</th>
                        <th className="p-3">Farq (Kamomad/Ortiqcha)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {recentShifts.filter(s => s.status === 'CLOSED').map(shift => {
                        const dateStr = new Date(shift.closedAt || shift.createdAt).toLocaleDateString('uz-UZ', { timeZone: 'Asia/Tashkent' });
                        const openTime = new Date(shift.openedAt).toLocaleTimeString('uz-UZ', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' });
                        const closeTime = shift.closedAt ? new Date(shift.closedAt).toLocaleTimeString('uz-UZ', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' }) : '—';
                        const diff = shift.difference || 0;

                        return (
                          <tr key={shift.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-mono font-bold text-slate-900">
                              {dateStr}
                              <span className="block text-[10px] text-slate-400 font-normal">{openTime} — {closeTime}</span>
                            </td>
                            <td className="p-3">{shift.closedBy || shift.openedBy}</td>
                            <td className="p-3 font-mono">{(shift.startAmount || 0).toLocaleString()}</td>
                            <td className="p-3 font-mono text-[11px]">
                              <span className="text-emerald-600 block">+{(shift.cashIn || 0).toLocaleString()}</span>
                              <span className="text-rose-500 block">-{(shift.cashOut || 0).toLocaleString()}</span>
                            </td>
                            <td className="p-3 font-mono font-bold text-slate-800">{(shift.expectedCash || 0).toLocaleString()} so'm</td>
                            <td className="p-3 font-mono font-black text-indigo-600">{(shift.actualCash || 0).toLocaleString()} so'm</td>
                            <td className="p-3 font-mono font-bold">
                              {diff === 0 && <span className="text-emerald-600">0 (Aniq ✅)</span>}
                              {diff > 0 && <span className="text-blue-600">+{diff.toLocaleString()} (Ortiqcha)</span>}
                              {diff < 0 && <span className="text-rose-600">{diff.toLocaleString()} (Kamomad ⚠️)</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. AUDIT LOG TAB */}
        {activeTab === 'audit' && (
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  Kassa Xavfsizligi va O'chirishlar Auditi (Audit Log)
                </h3>
                <p className="text-xs text-slate-500">Tizimda o'chirilgan barcha savdolar, xarajatlar va muhim kassa amallari qaydlari</p>
              </div>
              <button 
                onClick={fetchAuditLogs}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
              >
                Yangilash
              </button>
            </div>

            {loadingAudit ? (
              <p className="text-xs text-slate-400 py-6 text-center">Audit qaydlari yuklanmoqda...</p>
            ) : auditLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">Hozircha audit qaydlari mavjud emas.</p>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                {auditLogs.map((log: any) => {
                  let parsedDetails: any = null;
                  try {
                    parsedDetails = JSON.parse(log.details);
                  } catch (e) {
                    parsedDetails = null;
                  }

                  const timeStr = new Date(log.createdAt).toLocaleTimeString('uz-UZ', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' });
                  const dateStr = new Date(log.createdAt).toLocaleDateString('uz-UZ', { timeZone: 'Asia/Tashkent', day: 'numeric', month: 'long' });

                  return (
                    <div key={log.id} className="p-3.5 hover:bg-slate-50 flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                            log.action === 'DELETE_SALE' 
                              ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                              : log.action === 'DELETE_EXPENSE'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                          }`}>
                            {log.action === 'DELETE_SALE' ? '🗑 Savdo O\'chirildi' : log.action === 'DELETE_EXPENSE' ? '🗑 Xarajat O\'chirildi' : log.action}
                          </span>
                          <span className="font-semibold text-slate-800">
                            Mas'ul: {log.user || 'Admin'}
                          </span>
                        </div>

                        {parsedDetails ? (
                          <div className="text-slate-600 space-y-0.5 pl-1">
                            {parsedDetails.totalPrice !== undefined && (
                              <p>💰 Summa: <span className="font-bold text-slate-900">{parsedDetails.totalPrice.toLocaleString()} so'm</span> (To'lov: {parsedDetails.paymentMethod})</p>
                            )}
                            {parsedDetails.amount !== undefined && (
                              <p>💸 Summa: <span className="font-bold text-rose-600">-{parsedDetails.amount.toLocaleString()} so'm</span> (Sabab: {parsedDetails.reason})</p>
                            )}
                            {parsedDetails.items && (
                              <p className="text-slate-500">🛍 Tovarlar: {parsedDetails.items}</p>
                            )}
                            {parsedDetails.customerPhone && (
                              <p className="text-slate-500">📞 Mijoz: {parsedDetails.customerName ? `${parsedDetails.customerName} ` : ''}({parsedDetails.customerPhone})</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-slate-600">{log.details}</p>
                        )}
                      </div>

                      <div className="text-right shrink-0 font-mono text-[11px] text-slate-400">
                        {dateStr}
                        <span className="block text-slate-500 font-bold">{timeStr}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SHIFT OPEN MODAL */}
      {shiftModal === 'open' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-indigo-600" />
                Kassa Smenasini Ochish
              </h3>
              <button onClick={() => setShiftModal(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Ertalab kassada mavjud bo'lgan boshlang'ich naqd pul qoldig'ini kiriting (agar qoldiq bo'lmasa, 0 qoldiring):
            </p>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Boshlang'ich kassa summasi (so'm)</label>
              <input
                type="number"
                value={shiftStartAmount}
                onChange={e => setShiftStartAmount(e.target.value)}
                placeholder="Masalan: 500000"
                className="w-full p-3 rounded-xl border border-slate-200 text-sm font-mono font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShiftModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleOpenShift}
                disabled={shiftLoading}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md active:scale-95 disabled:opacity-50"
              >
                {shiftLoading ? "Ochilmoqda..." : "Smenani Ochish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHIFT CLOSE MODAL (Z-REPORT) */}
      {shiftModal === 'close' && activeShift && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-rose-600" />
                Smenani Yopish (Z-Otchyot)
              </h3>
              <button onClick={() => setShiftModal(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Boshlang'ich kassa:</span>
                <span className="font-mono font-bold">{activeShift.startAmount.toLocaleString()} so'm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-600 font-bold">➕ Naqd tushum:</span>
                <span className="font-mono font-bold text-emerald-600">+{(shiftStats?.cashIn || 0).toLocaleString()} so'm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-rose-500 font-bold">➖ Naqd xarajat:</span>
                <span className="font-mono font-bold text-rose-500">-{(shiftStats?.cashOut || 0).toLocaleString()} so'm</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-slate-900">
                <span>Kassada bo'lishi kerak:</span>
                <span className="font-mono text-indigo-600">{(shiftStats?.expectedCash || activeShift.startAmount).toLocaleString()} so'm</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Sanab topshirilgan haqiqiy naqd pul (so'm)</label>
              <input
                type="number"
                value={shiftActualCash}
                onChange={e => setShiftActualCash(e.target.value)}
                placeholder="Haqiqiy sanalgan pul..."
                className="w-full p-3 rounded-xl border border-slate-200 text-sm font-mono font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              {shiftActualCash && (
                <div className="mt-1 text-xs font-mono font-bold">
                  {parseFloat(shiftActualCash) - (shiftStats?.expectedCash || activeShift.startAmount) === 0 ? (
                    <span className="text-emerald-600">✅ Farq: 0 so'm (To'liq mos keldi)</span>
                  ) : parseFloat(shiftActualCash) - (shiftStats?.expectedCash || activeShift.startAmount) > 0 ? (
                    <span className="text-blue-600">📈 Ortiqcha: +{(parseFloat(shiftActualCash) - (shiftStats?.expectedCash || activeShift.startAmount)).toLocaleString()} so'm</span>
                  ) : (
                    <span className="text-rose-600">⚠️ Kamomad: {(parseFloat(shiftActualCash) - (shiftStats?.expectedCash || activeShift.startAmount)).toLocaleString()} so'm</span>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Izoh (ixtiyoriy)</label>
              <input
                type="text"
                value={shiftNote}
                onChange={e => setShiftNote(e.target.value)}
                placeholder="Kamomad/Ortiqcha sababi yoki izoh..."
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShiftModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleCloseShift}
                disabled={shiftLoading}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md active:scale-95 disabled:opacity-50"
              >
                {shiftLoading ? "Yopilmoqda..." : "Z-Otchyotni Tasdiqlash"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Debt Modal */}
      {payDebtSale && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Qarzni To'lash</h3>
                <p className="text-xs text-slate-500">
                  {payDebtSale.customerName ? `Mijoz: ${payDebtSale.customerName}` : `Savdo #${payDebtSale.id.slice(0, 8)}`}
                </p>
              </div>
              <button 
                onClick={() => setPayDebtSale(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Umumiy savdo summasi:</span>
                <span className="font-bold text-slate-800 font-mono">{(payDebtSale.totalPrice || 0).toLocaleString()} so'm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">To'langan (avans):</span>
                <span className="font-bold text-emerald-600 font-mono">{(payDebtSale.advance || 0).toLocaleString()} so'm</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1 font-bold">
                <span className="text-rose-600">Qolgan qarz miqdori:</span>
                <span className="text-rose-600 font-mono">{(payDebtSale.balance || 0).toLocaleString()} so'm</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">To'lov Summasi (so'm)</label>
              <input
                type="number"
                value={debtPayAmount}
                onChange={e => setDebtPayAmount(e.target.value)}
                placeholder="Summani kiriting..."
                className="w-full p-3 rounded-xl border border-slate-200 text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setDebtPayAmount(payDebtSale.balance?.toString() || '')}
                  className="flex-1 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold transition-colors"
                >
                  To'liq (100%)
                </button>
                <button
                  type="button"
                  onClick={() => setDebtPayAmount(Math.round((payDebtSale.balance || 0) / 2).toString())}
                  className="flex-1 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors"
                >
                  Yarmi (50%)
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">To'lov Usuli</label>
              <div className="grid grid-cols-2 gap-2">
                {(['Naqd', 'Karta', 'Terminal', 'Karparativ'] as const).map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setDebtPayMethod(method)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      debtPayMethod === method
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPayDebtSale(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={handleConfirmPayDebt}
                disabled={payDebtLoading || !debtPayAmount}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-200 active:scale-95 disabled:opacity-50"
              >
                {payDebtLoading ? "Saqlanmoqda..." : "To'lovni Qabul Qilish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
