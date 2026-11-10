'use client';

import {
  AlertTriangle,
  Award,
  BarChart3,
  CreditCard,
  Download,
  Flame,
  Plus,
} from 'lucide-react';
import {
  ZapchasAnalytics,
  ZapchasPartItem,
  ZapchasSaleItem,
  ZapchasTxItem,
} from './ZapchasTypes';

interface ZapchasAnalyticsPanelProps {
  analytics: ZapchasAnalytics | null;
  parts: ZapchasPartItem[];
  sales: ZapchasSaleItem[];
  transactions: ZapchasTxItem[];
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  onQuickRestock: (part: ZapchasPartItem) => void;
}

export default function ZapchasAnalyticsPanel({
  analytics,
  parts,
  sales,
  transactions,
  selectedMonth,
  onMonthChange,
  onQuickRestock,
}: ZapchasAnalyticsPanelProps) {
  const lowOrOutParts = parts.filter(
    (p) => p.quantity <= 0 || (p.minQuantity > 0 && p.quantity <= p.minQuantity)
  );

  const handleExportExcel = async () => {
    try {
      const XLSX = await import('xlsx');

      const omborRows = parts.map((p, i) => ({
        '#': i + 1,
        Nomi: p.name,
        Birlik: p.unit,
        Qoldiq: p.quantity,
        'Jami Kelgan': p.totalIn || 0,
        'Jami Ketgan': p.totalOut || 0,
        'Narxi (so\'m)': p.price || 0,
        'Qoldiq Qiymati (so\'m)': p.quantity * (p.price || 0),
        Izoh: p.note || '',
      }));

      const salesRows = sales.map((s, i) => ({
        '#': i + 1,
        Sana: new Date(s.createdAt).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' }),
        Sotuvchi: s.user?.name || '',
        Zapchaslar: s.transactions
          .map((t) => `${t.part.name} (${t.quantity} ${t.part.unit})`)
          .join(', '),
        'Jami Summa': s.totalPrice,
        "To'langan": s.advance,
        Qarz: s.balance,
        "To'lov Turi": s.paymentMethod,
        Mijoz: s.customerName || '',
        Telefon: s.customerPhone || '',
        Izoh: s.note || '',
      }));

      const txRows = transactions.map((t, i) => ({
        '#': i + 1,
        Sana: new Date(t.createdAt).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' }),
        Turi: t.type === 'IN' ? 'Keldi' : t.type === 'OUT' ? 'Ketdi' : 'Tuzatish',
        Zapchas: t.part.name,
        "O'zgarish": t.quantityDelta,
        Birlik: t.part.unit,
        'Keyingi Qoldiq': t.balanceAfter,
        Xodim: t.user?.name || '',
        Izoh: t.note || '',
      }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(omborRows), 'Ombor');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(salesRows), 'Sotuvlar');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(txRows), 'Kelgan-Ketgan');

      const suffix = selectedMonth || new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `zapchas-hisobot-${suffix}.xlsx`);
    } catch (e) {
      console.error('Excel export failed:', e);
      alert('Excel yuklab olishda xatolik yuz berdi.');
    }
  };

  const paymentEntries = Object.entries(analytics?.periodPaymentBreakdown || {});

  return (
    <div className="space-y-4">
      {/* Header & Excel Export */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-800 dark:text-white">
              Zapchas Nazorati va Hisobot
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => onMonthChange(e.target.value)}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold dark:text-white outline-none"
            />
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Excel</span>
            </button>
          </div>
        </div>

        {/* Financial KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/50">
            <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-300">
              Savdo Summasi ({analytics?.periodSalesCount || 0} ta)
            </div>
            <div className="text-base font-black text-blue-700 dark:text-blue-200 mt-0.5">
              {(analytics?.periodSalesTotal || 0).toLocaleString()} so&apos;m
            </div>
          </div>

          <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/50">
            <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              Real Tushgan Pul
            </div>
            <div className="text-base font-black text-emerald-600 dark:text-emerald-300 mt-0.5">
              {(analytics?.periodPaidTotal || 0).toLocaleString()} so&apos;m
            </div>
          </div>

          <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/30 rounded-2xl border border-rose-100 dark:border-rose-900/50">
            <div className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">
              Qolgan Qarz
            </div>
            <div className="text-base font-black text-rose-600 dark:text-rose-300 mt-0.5">
              {(analytics?.periodDebtTotal || 0).toLocaleString()} so&apos;m
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-200/70 dark:border-slate-700/60">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Ombor Qiymati
            </div>
            <div className="text-base font-black text-slate-800 dark:text-white mt-0.5">
              {(analytics?.inventoryValue || 0).toLocaleString()} so&apos;m
            </div>
          </div>
        </div>

        {/* Payment method breakdown */}
        {paymentEntries.length > 0 && (
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/60 space-y-2">
            <div className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-blue-500" />
              To&apos;lov Turlari Bo&apos;yicha Tushum
            </div>
            <div className="flex flex-wrap gap-2">
              {paymentEntries.map(([method, amount]) => (
                <div
                  key={method}
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                >
                  <span className="text-slate-500 dark:text-slate-400 font-semibold">
                    {method}:{' '}
                  </span>
                  <b className="text-slate-800 dark:text-white">
                    {amount.toLocaleString()} so&apos;m
                  </b>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Low Stock / Out of Stock Restock Alerts */}
      {lowOrOutParts.length > 0 && (
        <div className="bg-amber-50/70 dark:bg-amber-950/20 rounded-3xl p-5 border border-amber-200 dark:border-amber-900/50 space-y-3">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
            <AlertTriangle className="w-5 h-5" />
            Tugagan va Kam Qolgan Zapchaslar ({lowOrOutParts.length})
          </div>
          <div className="space-y-2">
            {lowOrOutParts.map((part) => (
              <div
                key={part.id}
                className="flex items-center justify-between gap-2 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-amber-200/70 dark:border-amber-800/40"
              >
                <div>
                  <div className="text-sm font-bold text-slate-800 dark:text-white">
                    {part.name}
                  </div>
                  <div className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                    Qoldiq: {part.quantity} {part.unit}{' '}
                    {part.minQuantity > 0 ? `(Min: ${part.minQuantity})` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onQuickRestock(part)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Keldi
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Sellers */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 space-y-3">
        <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white text-sm">
          <Award className="w-5 h-5 text-amber-500" />
          Sotuvchilar Bo&apos;yicha Natijalar
        </div>
        {!analytics || analytics.topSellers.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">
            Tanlangan davrda sotuvlar topilmadi.
          </p>
        ) : (
          <div className="space-y-2">
            {analytics.topSellers.map((s, idx) => (
              <div
                key={s.userId}
                className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-between gap-2"
              >
                <div>
                  <div className="font-bold text-sm text-slate-800 dark:text-white">
                    {idx + 1}. {s.name}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {s.salesCount} ta savdo • To&apos;landi: {s.paidAmount.toLocaleString()} so&apos;m
                    {s.debtAmount > 0 ? ` • Qarz: ${s.debtAmount.toLocaleString()} so'm` : ''}
                  </div>
                </div>
                <div className="font-black text-sm text-emerald-600 dark:text-emerald-400 shrink-0">
                  {s.totalAmount.toLocaleString()} so&apos;m
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Selling Spare Parts */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 space-y-3">
        <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white text-sm">
          <Flame className="w-5 h-5 text-rose-500" />
          Eng Ko&apos;p Sotilgan Zapchaslar
        </div>
        {!analytics || analytics.topParts.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">
            Hali ma&apos;lumot yo&apos;q.
          </p>
        ) : (
          <div className="space-y-2">
            {analytics.topParts.map((p, idx) => (
              <div
                key={p.partId}
                className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-between gap-2"
              >
                <div className="text-sm font-bold text-slate-800 dark:text-white">
                  {idx + 1}. {p.name}
                </div>
                <div className="text-right">
                  <div className="text-xs font-black text-blue-600 dark:text-blue-400">
                    {p.soldQty} {p.unit}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {p.soldRevenue.toLocaleString()} so&apos;m
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
