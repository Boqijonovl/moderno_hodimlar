'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  Minus,
  Package,
  Phone,
  Plus,
  Send,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import ZapchasPartPicker from './ZapchasPartPicker';
import {
  PaymentMethodOption,
  TelegramWebAppProp,
  ZapchasPartItem,
  ZapchasSaleItem,
  formatAmountInput,
  formatPhoneNumberInput,
  parseNumericInput,
} from './ZapchasTypes';

interface SellRow {
  partId: string;
  quantity: string;
  unitPrice: string;
}

interface ZapchasSellFormProps {
  telegramId: string;
  parts: ZapchasPartItem[];
  paymentMethods: PaymentMethodOption[];
  WebApp: TelegramWebAppProp | null;
  onSuccess: () => void;
}

export default function ZapchasSellForm({
  telegramId,
  parts,
  paymentMethods,
  WebApp,
  onSuccess,
}: ZapchasSellFormProps) {
  const [rows, setRows] = useState<SellRow[]>([
    { partId: '', quantity: '1', unitPrice: '' },
  ]);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [batchNote, setBatchNote] = useState('');
  const [selectedMethods, setSelectedMethods] = useState<string[]>(() =>
    paymentMethods.length > 0 ? [paymentMethods[0].name] : []
  );
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>({});
  const [isPartial, setIsPartial] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastSale, setLastSale] = useState<ZapchasSaleItem | null>(null);

  // Sync default selected payment method if paymentMethods arrived after mount
  const effectiveSelectedMethods =
    selectedMethods.length === 0 && paymentMethods.length > 0 && !isPartial
      ? [paymentMethods[0].name]
      : selectedMethods;

  const updateRow = (index: number, patch: Partial<SellRow>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    setRows((prev) => [...prev, { partId: '', quantity: '1', unitPrice: '' }]);
  };

  const removeRow = (index: number) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const stepQuantity = (index: number, delta: number) => {
    const row = rows[index];
    const part = parts.find((p) => p.id === row.partId);
    const current = parseInt(row.quantity || '1', 10) || 0;
    let next = Math.max(1, current + delta);
    if (part && part.quantity > 0) {
      next = Math.min(part.quantity, next);
    }
    updateRow(index, { quantity: String(next) });
  };

  const calculateTotalItems = () => {
    return rows.reduce((sum, r) => {
      if (!r.partId) return sum;
      const qty = parseInt(r.quantity || '0', 10) || 0;
      const price = parseNumericInput(r.unitPrice);
      return sum + qty * price;
    }, 0);
  };

  const calculateTotalPaid = () => {
    const total = calculateTotalItems();
    if (effectiveSelectedMethods.length === 0) return 0;
    if (effectiveSelectedMethods.length === 1 && !isPartial) return total;
    return effectiveSelectedMethods.reduce(
      (sum, method) => sum + parseNumericInput(paymentAmounts[method] || ''),
      0
    );
  };

  const toggleMethod = (name: string) => {
    const base = effectiveSelectedMethods;
    if (base.includes(name)) {
      const next = base.filter((m) => m !== name);
      setSelectedMethods(next);
      if (next.length === 0) {
        setIsPartial(true);
      }
    } else {
      setSelectedMethods([...base, name]);
    }
  };

  const handlePaymentAmountChange = (method: string, val: string) => {
    setPaymentAmounts((prev) => ({
      ...prev,
      [method]: formatAmountInput(val),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = rows.filter((r) => r.partId);
    if (validRows.length === 0) {
      alert("Iltimos, ro'yxatdan kamida bitta zapchas tanlang.");
      return;
    }

    for (const r of validRows) {
      const part = parts.find((p) => p.id === r.partId);
      const qty = parseInt(r.quantity, 10);
      if (!qty || qty <= 0) {
        alert(`"${part?.name || 'Zapchas'}" uchun sonini to'g'ri kiriting.`);
        return;
      }
      if (part && qty > part.quantity) {
        alert(
          `"${part.name}" uchun omborda yetarli qoldiq yo'q (Mavjud: ${part.quantity} ${part.unit}).`
        );
        return;
      }
      if (!r.unitPrice.trim()) {
        alert(`"${part?.name || 'Zapchas'}" uchun sotuv narxini kiriting (so'mda).`);
        return;
      }
    }

    const totalAmount = calculateTotalItems();
    const paymentDetails = effectiveSelectedMethods
      .map((method) => {
        const amount =
          effectiveSelectedMethods.length === 1 && !isPartial
            ? totalAmount
            : parseNumericInput(paymentAmounts[method] || '');
        return { method, amount };
      })
      .filter((p) => p.amount > 0);

    const paidTotal = paymentDetails.reduce((s, p) => s + p.amount, 0);
    if (paidTotal > totalAmount) {
      alert("To'langan summa umumiy savdo summasidan ko'p bo'lishi mumkin emas!");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/zapchas/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId,
          customerPhone: customerPhone.trim() || undefined,
          customerName: customerName.trim() || undefined,
          note: batchNote.trim() || undefined,
          paymentDetails,
          items: validRows.map((r) => ({
            partId: r.partId,
            quantity: parseInt(r.quantity, 10),
            unitPrice: r.unitPrice.replace(/\s/g, ''),
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        WebApp?.HapticFeedback?.notificationOccurred('error');
        alert(data.error || 'Sotuvni saqlashda xatolik yuz berdi.');
      } else {
        WebApp?.HapticFeedback?.notificationOccurred('success');
        setLastSale(data.sale || null);
        setRows([{ partId: '', quantity: '1', unitPrice: '' }]);
        setPaymentAmounts({});
        setSelectedMethods(paymentMethods.length > 0 ? [paymentMethods[0].name] : []);
        setIsPartial(false);
        setCustomerPhone('');
        setCustomerName('');
        setBatchNote('');
        onSuccess();
      }
    } catch (err: unknown) {
      WebApp?.HapticFeedback?.notificationOccurred('error');
      const msg = err instanceof Error ? err.message : '';
      alert('Tarmoq xatosi: ' + msg);
    }
    setLoading(false);
  };

  const totalItemsAmount = calculateTotalItems();
  const totalPaidAmount = calculateTotalPaid();

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 dark:border-slate-800 space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl">
          <Package className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Zapchas Sotish
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sotilgan zapchaslar va to&apos;lov turini tizimga kiritish
          </p>
        </div>
      </div>

      {/* Clear 3-step visual guide for employees */}
      <div className="grid grid-cols-3 gap-2 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-2xl p-3 text-[11px]">
        <div className="font-semibold text-blue-800 dark:text-blue-200">
          <span className="inline-block w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] text-center leading-4 mr-1 font-bold">
            1
          </span>
          Nomini yozib tanlang
        </div>
        <div className="font-semibold text-blue-800 dark:text-blue-200">
          <span className="inline-block w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] text-center leading-4 mr-1 font-bold">
            2
          </span>
          Soni va narxini yozing
        </div>
        <div className="font-semibold text-blue-800 dark:text-blue-200">
          <span className="inline-block w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] text-center leading-4 mr-1 font-bold">
            3
          </span>
          To&apos;lov turini tanlang
        </div>
      </div>

      {lastSale ? (
        <div className="flex flex-col items-center space-y-4 animate-in fade-in zoom-in-95">
          <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 p-6 rounded-2xl flex flex-col items-center border border-emerald-200 dark:border-emerald-800 w-full text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            <h3 className="text-lg font-bold">Qabul qilindi!</h3>
            <p className="text-sm">
              Zapchas sotuvi muvaffaqiyatli saqlandi va ombor qoldig&apos;i yangilandi.
            </p>
            <div className="w-full pt-3 mt-2 border-t border-emerald-200/70 dark:border-emerald-800 text-xs space-y-1">
              <div className="flex justify-between">
                <span>Jami summa:</span>
                <b>{lastSale.totalPrice.toLocaleString()} so&apos;m</b>
              </div>
              <div className="flex justify-between">
                <span>To&apos;landi ({lastSale.paymentMethod}):</span>
                <b>{lastSale.advance.toLocaleString()} so&apos;m</b>
              </div>
              {lastSale.balance > 0 && (
                <div className="flex justify-between text-rose-600 dark:text-rose-400">
                  <span>Qarz (Nasiya):</span>
                  <b>{lastSale.balance.toLocaleString()} so&apos;m</b>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setLastSale(null)}
            className="w-full bg-slate-900 dark:bg-blue-600 text-white font-bold p-4 rounded-2xl active:scale-95 transition-all"
          >
            Yangi Zapchas Sotish
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. Sotilgan zapchaslar */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
              1. Sotilgan Zapchaslar
            </label>

            {rows.map((row, idx) => {
              const selectedPart = parts.find((p) => p.id === row.partId);
              const qtyNum = parseInt(row.quantity || '0', 10) || 0;
              const unitPriceNum = parseNumericInput(row.unitPrice);
              const lineTotal = qtyNum * unitPriceNum;

              return (
                <div
                  key={idx}
                  className="p-3.5 bg-slate-50/90 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Zapchas #{idx + 1}
                    </span>
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-1.5 rounded-lg transition-colors"
                        title="O'chirish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <ZapchasPartPicker
                    parts={parts}
                    selectedPartId={row.partId}
                    mode="sell"
                    placeholder="Zapchas nomini yozing (masalan: Petlya)..."
                    onSelectExisting={(part) =>
                      updateRow(idx, {
                        partId: part.id,
                        unitPrice: part.price
                          ? formatAmountInput(String(Math.round(part.price)))
                          : '',
                      })
                    }
                    onClear={() => updateRow(idx, { partId: '', unitPrice: '' })}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Soni ({selectedPart?.unit || 'dona'})
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => stepQuantity(idx, -1)}
                          className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={selectedPart ? selectedPart.quantity : undefined}
                          inputMode="numeric"
                          value={row.quantity}
                          onChange={(e) => updateRow(idx, { quantity: e.target.value })}
                          className="flex-1 text-center font-bold text-base py-2 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => stepQuantity(idx, 1)}
                          className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                        1 {selectedPart?.unit || 'dona'} narxi (so&apos;m) *
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={row.unitPrice}
                        onChange={(e) =>
                          updateRow(idx, { unitPrice: formatAmountInput(e.target.value) })
                        }
                        placeholder="Masalan: 15 000"
                        className="w-full py-2.5 px-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {row.partId && lineTotal > 0 && (
                    <div className="flex justify-between items-center text-xs bg-white dark:bg-slate-900/70 px-3 py-2 rounded-xl border border-slate-200/70 dark:border-slate-700">
                      <span className="text-slate-500 dark:text-slate-400">
                        {qtyNum} {selectedPart?.unit || 'dona'} × {unitPriceNum.toLocaleString()} so&apos;m
                      </span>
                      <span className="font-black text-blue-600 dark:text-blue-400">
                        = {lineTotal.toLocaleString()} so&apos;m
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            <button
              type="button"
              onClick={addRow}
              className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-500 dark:text-slate-400 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Yana Zapchas Qo&apos;shish
            </button>
          </div>

          {totalItemsAmount > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl flex justify-between items-center border border-blue-100 dark:border-blue-800/50">
              <span className="text-blue-700 dark:text-blue-300 font-bold text-sm">
                Jami Savdo Summasi:
              </span>
              <span className="text-xl font-black text-blue-700 dark:text-blue-300">
                {totalItemsAmount.toLocaleString()} so&apos;m
              </span>
            </div>
          )}

          {/* 2. Mijoz Ma'lumotlari (Ixtiyoriy) */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-3">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-500" />
              2. Mijoz Ma&apos;lumotlari (Ixtiyoriy)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Mijoz telefon raqami:
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(formatPhoneNumberInput(e.target.value))}
                  placeholder="+998 90 123 45 67"
                  className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:text-white font-mono text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Mijoz ismi:
                </label>
                <div className="relative flex items-center">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Masalan: Akmal aka"
                    className="w-full pl-9 pr-3 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:text-white text-sm outline-none"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Izoh (ixtiyoriy):
              </label>
              <input
                type="text"
                value={batchNote}
                onChange={(e) => setBatchNote(e.target.value)}
                placeholder="Qo'shimcha izoh..."
                className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:text-white text-sm outline-none"
              />
            </div>
          </div>

          {/* 3. To'lov Turlari (Savdo bo'limi bilan bir xil) */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-600" />
              3. To&apos;lov Qanaqa Bo&apos;ldi? (To&apos;lov Turlarini Tanlang)
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {paymentMethods.length > 0 ? (
                paymentMethods.map((pm) => {
                  const isActive = effectiveSelectedMethods.includes(pm.name);
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => toggleMethod(pm.name)}
                      className={`p-3 rounded-2xl font-bold text-sm transition-all border-2 ${
                        isActive
                          ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-500 dark:text-blue-300 shadow-md shadow-blue-500/20'
                          : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {pm.name}
                    </button>
                  );
                })
              ) : (
                <div className="text-slate-400 text-sm py-2 col-span-3">
                  To&apos;lov turlari topilmadi. Admindan sozlamalarda qo&apos;shishni so&apos;rang.
                </div>
              )}
            </div>

            {effectiveSelectedMethods.length === 1 && (
              <label className="flex items-center gap-2 text-sm font-bold text-rose-600 dark:text-rose-400 cursor-pointer mt-2 w-fit">
                <input
                  type="checkbox"
                  checked={isPartial}
                  onChange={(e) => setIsPartial(e.target.checked)}
                  className="w-4 h-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                />
                To&apos;liq to&apos;lanmadi (Qarz/Avans qolmoqda)
              </label>
            )}

            {effectiveSelectedMethods.length === 0 && totalItemsAmount > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-semibold text-amber-800 dark:text-amber-300">
                Hech qanday to&apos;lov turi tanlanmadi — butun summa <b>Nasiya (Qarz)</b> sifatida saqlanadi.
              </div>
            )}

            {(effectiveSelectedMethods.length > 1 ||
              (effectiveSelectedMethods.length === 1 && isPartial)) && (
              <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-3">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Har bir to&apos;lov turi bo&apos;yicha summani kiriting
                </label>
                {effectiveSelectedMethods.map((method) => (
                  <div key={method} className="flex items-center gap-3">
                    <span className="w-1/3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {method}:
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={paymentAmounts[method] || ''}
                      onChange={(e) => handlePaymentAmountChange(method, e.target.value)}
                      className="flex-1 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white font-bold outline-none"
                      placeholder="Summa..."
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {totalItemsAmount > 0 && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl flex flex-col gap-2 border border-emerald-100 dark:border-emerald-800/40">
              <div className="flex justify-between items-center">
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
                  Jami To&apos;landi:
                </span>
                <span className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                  {totalPaidAmount.toLocaleString()} so&apos;m
                </span>
              </div>
              {totalItemsAmount > totalPaidAmount && (
                <div className="flex justify-between items-center border-t border-emerald-200/70 dark:border-emerald-800/50 pt-2">
                  <span className="text-rose-600 dark:text-rose-400 font-semibold text-sm">
                    Qarz (Nasiya):
                  </span>
                  <span className="text-lg font-black text-rose-700 dark:text-rose-300">
                    {(totalItemsAmount - totalPaidAmount).toLocaleString()} so&apos;m
                  </span>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white font-bold p-4 rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20 disabled:opacity-60"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5" />
                Sotuvni Saqlash
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
