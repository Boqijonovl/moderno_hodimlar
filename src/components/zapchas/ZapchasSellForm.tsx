'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  Minus,
  Package,
  Plus,
  Send,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import ZapchasPartPicker from './ZapchasPartPicker';
import { ZapchasPartItem, formatAmountInput } from './ZapchasTypes';

interface SellRow {
  partId: string;
  quantity: string;
  unitPrice: string;
  note: string;
}

interface ZapchasSellFormProps {
  telegramId: string;
  parts: ZapchasPartItem[];
  WebApp: any;
  onSuccess: () => void;
}

export default function ZapchasSellForm({
  telegramId,
  parts,
  WebApp,
  onSuccess,
}: ZapchasSellFormProps) {
  const [rows, setRows] = useState<SellRow[]>([
    { partId: '', quantity: '1', unitPrice: '', note: '' },
  ]);
  const [customerName, setCustomerName] = useState('');
  const [batchNote, setBatchNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const updateRow = (index: number, patch: Partial<SellRow>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    setRows((prev) => [...prev, { partId: '', quantity: '1', unitPrice: '', note: '' }]);
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
    }

    setLoading(true);
    setSuccessMsg('');
    try {
      const res = await fetch('/api/zapchas/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId,
          customerName: customerName.trim() || undefined,
          note: batchNote.trim() || undefined,
          items: validRows.map((r) => ({
            partId: r.partId,
            quantity: parseInt(r.quantity, 10),
            unitPrice: r.unitPrice ? r.unitPrice.replace(/\s/g, '') : undefined,
            note: r.note.trim() || undefined,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('error');
        alert(data.error || 'Sotuvni saqlashda xatolik yuz berdi.');
      } else {
        if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('success');
        setRows([{ partId: '', quantity: '1', unitPrice: '', note: '' }]);
        setCustomerName('');
        setBatchNote('');
        setSuccessMsg('Zapchas sotuvi muvaffaqiyatli saqlandi!');
        setTimeout(() => setSuccessMsg(''), 4000);
        onSuccess();
      }
    } catch (err: any) {
      if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('error');
      alert('Tarmoq xatosi: ' + (err?.message || ''));
    }
    setLoading(false);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 dark:border-slate-800 space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl">
          <Package className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            Zapchas Sotildi (Chiqim)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Nomini yozsangiz ombordagi mavjud zapchaslar chiqadi
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-2xl text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {rows.map((row, idx) => {
          const selectedPart = parts.find((p) => p.id === row.partId);
          return (
            <div
              key={idx}
              className="p-3.5 bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 space-y-3"
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
                    title="Qatorni o'chirish"
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
                    unitPrice: part.price ? formatAmountInput(String(Math.round(part.price))) : '',
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
                    Narxi (dona, ixtiyoriy)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={row.unitPrice}
                    onChange={(e) => updateRow(idx, { unitPrice: formatAmountInput(e.target.value) })}
                    placeholder="0 so'm"
                    className="w-full py-2.5 px-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={addRow}
          className="w-full py-2.5 px-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Yana zapchas qo&apos;shish
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
              Mijoz / Buyurtma (ixtiyoriy)
            </label>
            <div className="relative flex items-center">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Mijoz ismi..."
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
              Izoh (ixtiyoriy)
            </label>
            <input
              type="text"
              value={batchNote}
              onChange={(e) => setBatchNote(e.target.value)}
              placeholder="Qo'shimcha izoh..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-4 rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 disabled:opacity-60"
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
    </div>
  );
}
