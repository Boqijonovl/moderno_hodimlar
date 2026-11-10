'use client';

import { useState } from 'react';
import { CheckCircle2, List, Phone, Trash2 } from 'lucide-react';
import { getPaymentMethodColor, normalizePaymentMethod } from '@/lib/formatters';
import {
  PaymentMethodOption,
  ZapchasSaleItem,
  formatAmountInput,
  parseNumericInput,
} from './ZapchasTypes';

interface ZapchasSalesListProps {
  telegramId: string;
  sales: ZapchasSaleItem[];
  paymentMethods: PaymentMethodOption[];
  canManage: boolean;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  onUpdated: () => void;
}

export default function ZapchasSalesList({
  telegramId,
  sales,
  paymentMethods,
  canManage,
  selectedMonth,
  onMonthChange,
  onUpdated,
}: ZapchasSalesListProps) {
  const [payDebtModal, setPayDebtModal] = useState<{
    saleId: string;
    balance: number;
  } | null>(null);
  const [debtPayAmount, setDebtPayAmount] = useState('');
  const [debtPayMethod, setDebtPayMethod] = useState<string>(
    paymentMethods[0]?.name || 'Naqd'
  );
  const [payDebtLoading, setPayDebtLoading] = useState(false);

  const groupedSales = sales.reduce<Record<string, ZapchasSaleItem[]>>((acc, sale) => {
    const dateLabel = new Date(sale.createdAt).toLocaleDateString('uz-UZ', {
      timeZone: 'Asia/Tashkent',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    if (!acc[dateLabel]) acc[dateLabel] = [];
    acc[dateLabel].push(sale);
    return acc;
  }, {});

  const handleOpenPayModal = (sale: ZapchasSaleItem) => {
    setPayDebtModal({ saleId: sale.id, balance: sale.balance });
    setDebtPayAmount(formatAmountInput(String(Math.round(sale.balance))));
    if (paymentMethods.length > 0) {
      setDebtPayMethod(paymentMethods[0].name);
    }
  };

  const handlePayDebt = async () => {
    if (!payDebtModal || !debtPayAmount) return;
    const amount = parseNumericInput(debtPayAmount);
    if (amount <= 0 || amount > payDebtModal.balance) {
      alert(`Iltimos, 1 dan ${payDebtModal.balance.toLocaleString()} so'mgacha summa kiriting.`);
      return;
    }

    setPayDebtLoading(true);
    try {
      const res = await fetch(`/api/zapchas/sales/${payDebtModal.saleId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId,
          amount,
          method: debtPayMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Qarzni to'lashda xatolik");
      } else {
        setPayDebtModal(null);
        setDebtPayAmount('');
        onUpdated();
      }
    } catch {
      alert('Tarmoq xatosi');
    }
    setPayDebtLoading(false);
  };

  const handleDeleteSale = async (sale: ZapchasSaleItem) => {
    if (
      !confirm(
        `Ushbu ${sale.totalPrice.toLocaleString()} so'mlik zapchas savdosini o'chirib, sotilgan zapchaslarni omborga qaytarasizmi?`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(
        `/api/zapchas/sales/${sale.id}?telegramId=${encodeURIComponent(telegramId)}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "O'chirishda xatolik");
      } else {
        onUpdated();
      }
    } catch {
      alert('Tarmoq xatosi');
    }
  };

  const totalSalesSum = sales.reduce((sum, s) => sum + (s.totalPrice || 0), 0);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <List className="w-5 h-5 text-blue-600 dark:text-blue-500" />
          {canManage ? 'Zapchas Sotuvlari va To\'lovlar' : 'Mening Zapchas Sotuvlarim'}
        </h2>
        <div className="flex flex-col items-end gap-1.5">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold border-none focus:ring-2 focus:ring-blue-500 dark:text-white"
          />
          {sales.length > 0 && (
            <div className="text-right">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">
                Umumiy Savdo
              </div>
              <div className="text-sm font-bold text-emerald-600">
                {totalSalesSum.toLocaleString()} so&apos;m
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {sales.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400 text-center py-6 text-sm">
            Hali zapchas sotuvlari qayd etilmagan.
          </p>
        ) : (
          Object.entries(groupedSales).map(([date, dateSales]) => (
            <div
              key={date}
              className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm"
            >
              <div className="bg-slate-100/70 dark:bg-slate-800/60 px-4 py-2 font-bold text-slate-600 dark:text-slate-300 text-xs uppercase border-b border-slate-100 dark:border-slate-800">
                {date}
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {dateSales.map((sale) => {
                  const methodColors = getPaymentMethodColor(sale.paymentMethod);
                  return (
                    <div
                      key={sale.id}
                      className="p-4 bg-white dark:bg-slate-900 flex justify-between items-start gap-3"
                    >
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {sale.transactions.length} xil zapchas
                          </span>
                          {canManage && sale.user?.name && (
                            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                              👤 {sale.user.name}
                            </span>
                          )}
                        </div>

                        <div className="space-y-1">
                          {sale.transactions.map((item) => (
                            <div
                              key={item.id}
                              className="flex flex-col sm:flex-row sm:justify-between text-xs sm:items-center gap-0.5"
                            >
                              <span className="text-slate-700 dark:text-slate-300 font-medium">
                                • {item.part.name} × <b>{item.quantity} {item.part.unit}</b>
                              </span>
                              <span className="text-slate-900 dark:text-slate-100 font-bold">
                                {(item.totalPrice || 0).toLocaleString()} so&apos;m
                              </span>
                            </div>
                          ))}
                        </div>

                        {(sale.customerPhone || sale.customerName) && (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg w-fit">
                            <Phone className="w-3.5 h-3.5" />
                            <span>
                              {sale.customerName ? `${sale.customerName}: ` : ''}
                              {sale.customerPhone || ''}
                            </span>
                          </div>
                        )}

                        {sale.note && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                            📝 {sale.note}
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-xs flex-wrap">
                          <span
                            className={`font-semibold px-2.5 py-0.5 rounded-full border ${methodColors.bg} ${methodColors.text} ${methodColors.border}`}
                          >
                            {normalizePaymentMethod(sale.paymentMethod)}
                          </span>
                          <span className="text-slate-400">
                            {new Date(sale.createdAt).toLocaleTimeString('uz-UZ', {
                              timeZone: 'Asia/Tashkent',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {sale.payments && sale.payments.length > 0 && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 flex flex-col gap-0.5">
                            {sale.payments.map((p) => (
                              <span key={p.id}>
                                • {normalizePaymentMethod(p.method)}: {p.amount.toLocaleString()} so&apos;m
                              </span>
                            ))}
                          </div>
                        )}

                        {(sale.status === 'INCOMPLETE' || sale.balance > 0) && (
                          <div className="text-[10px] font-black text-rose-600 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400 px-3 py-1 rounded-xl border border-rose-200 dark:border-rose-800/50 inline-block w-fit">
                            ⚠️ Qarz: {sale.balance.toLocaleString()} so&apos;m
                          </div>
                        )}
                      </div>

                      <div className="text-right flex flex-col items-end gap-2 shrink-0">
                        <div className="font-black text-emerald-600 dark:text-emerald-400 text-base">
                          {sale.totalPrice.toLocaleString()}{' '}
                          <span className="text-xs font-normal text-emerald-600/70">so&apos;m</span>
                        </div>

                        {(sale.status === 'INCOMPLETE' || sale.balance > 0) && (
                          <button
                            type="button"
                            onClick={() => handleOpenPayModal(sale)}
                            className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl active:scale-95 transition-all shadow-sm flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            To&apos;lash
                          </button>
                        )}

                        {canManage && (
                          <button
                            type="button"
                            onClick={() => handleDeleteSale(sale)}
                            className="p-1.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-100"
                            title="Savdoni o'chirish va omborga qaytarish"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pay Debt Modal */}
      {payDebtModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">
              Zapchas Qarzini To&apos;lash
            </h3>

            <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl">
              <div className="text-xs text-rose-600 dark:text-rose-400 font-bold uppercase">
                To&apos;lanishi kerak:
              </div>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                {payDebtModal.balance.toLocaleString()} so&apos;m
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                  To&apos;lov Turi
                </label>
                <select
                  value={debtPayMethod}
                  onChange={(e) => setDebtPayMethod(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm font-semibold dark:text-white"
                >
                  {paymentMethods.length > 0 ? (
                    paymentMethods.map((pm) => (
                      <option key={pm.id} value={pm.name}>
                        {pm.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Naqd">Naqd</option>
                      <option value="Karta">Karta</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Qancha pul to&apos;lanmoqda?
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={debtPayAmount}
                  onChange={(e) => setDebtPayAmount(formatAmountInput(e.target.value))}
                  placeholder="Summani kiriting..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500 font-bold text-lg dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayDebtModal(null)}
                  className="flex-1 p-3 rounded-xl font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200"
                >
                  Bekor
                </button>
                <button
                  type="button"
                  onClick={handlePayDebt}
                  disabled={payDebtLoading}
                  className="flex-1 p-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/30 disabled:opacity-70 flex justify-center items-center"
                >
                  {payDebtLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Saqlash'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
