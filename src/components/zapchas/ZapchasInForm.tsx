'use client';

import { useState } from 'react';
import { ArrowDownLeft, CheckCircle2, Plus, Send, Trash2 } from 'lucide-react';
import ZapchasPartPicker from './ZapchasPartPicker';
import { ZAPCHAS_UNITS, ZapchasPartItem, formatAmountInput } from './ZapchasTypes';

interface InRow {
  partId: string;
  partName: string;
  unit: string;
  quantity: string;
  unitPrice: string;
}

interface ZapchasInFormProps {
  telegramId: string;
  parts: ZapchasPartItem[];
  WebApp: any;
  onSuccess: () => void;
}

export default function ZapchasInForm({
  telegramId,
  parts,
  WebApp,
  onSuccess,
}: ZapchasInFormProps) {
  const [rows, setRows] = useState<InRow[]>([
    { partId: '', partName: '', unit: 'dona', quantity: '1', unitPrice: '' },
  ]);
  const [batchNote, setBatchNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const updateRow = (index: number, patch: Partial<InRow>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { partId: '', partName: '', unit: 'dona', quantity: '1', unitPrice: '' },
    ]);
  };

  const removeRow = (index: number) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = rows.filter((r) => r.partId || r.partName.trim());
    if (validRows.length === 0) {
      alert('Kamida bitta kelgan zapchas kiriting.');
      return;
    }

    for (const r of validRows) {
      const qty = parseInt(r.quantity, 10);
      if (!qty || qty <= 0) {
        alert('Kelgan zapchas soni 1 dan katta butun son bo\'lishi kerak.');
        return;
      }
    }

    setLoading(true);
    setSuccessMsg('');
    try {
      const res = await fetch('/api/zapchas/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId,
          action: 'IN',
          note: batchNote.trim() || undefined,
          items: validRows.map((r) => ({
            partId: r.partId || undefined,
            partName: r.partId ? undefined : r.partName.trim(),
            unit: r.unit || 'dona',
            quantity: parseInt(r.quantity, 10),
            unitPrice: r.unitPrice ? r.unitPrice.replace(/\s/g, '') : undefined,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('error');
        alert(data.error || 'Kirimni saqlashda xatolik yuz berdi.');
      } else {
        if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('success');
        setRows([{ partId: '', partName: '', unit: 'dona', quantity: '1', unitPrice: '' }]);
        setBatchNote('');
        setSuccessMsg('Kelgan zapchaslar omborga muvaffaqiyatli qo\'shildi!');
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
        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl">
          <ArrowDownLeft className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            Zapchas Kirimi (Kelganlar)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Mavjud zapchasni tanlang yoki yangisini qo&apos;shib sonini kiriting
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
                  Kirim #{idx + 1}
                </span>
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-1.5 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <ZapchasPartPicker
                parts={parts}
                selectedPartId={row.partId}
                customPartName={row.partName}
                mode="in"
                placeholder="Zapchas nomini tanlang yoki yangi nom yozing..."
                onSelectExisting={(part) =>
                  updateRow(idx, {
                    partId: part.id,
                    partName: '',
                    unit: part.unit,
                    unitPrice: part.price ? formatAmountInput(String(Math.round(part.price))) : '',
                  })
                }
                onSelectNew={(newName) =>
                  updateRow(idx, {
                    partId: '',
                    partName: newName,
                  })
                }
                onClear={() =>
                  updateRow(idx, {
                    partId: '',
                    partName: '',
                  })
                }
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Nechta keldi ({selectedPart?.unit || row.unit})
                  </label>
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={row.quantity}
                    onChange={(e) => updateRow(idx, { quantity: e.target.value })}
                    className="w-full py-2.5 px-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-bold text-emerald-600 dark:text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    O&apos;lchov birligi
                  </label>
                  <select
                    value={selectedPart ? selectedPart.unit : row.unit}
                    disabled={Boolean(selectedPart)}
                    onChange={(e) => updateRow(idx, { unit: e.target.value })}
                    className="w-full py-2.5 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none disabled:opacity-70"
                  >
                    {ZAPCHAS_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
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
                    className="w-full py-2.5 px-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={addRow}
          className="w-full py-2.5 px-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Yana zapchas qo&apos;shish
        </button>

        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
            Izoh / Yetkazib beruvchi (ixtiyoriy)
          </label>
          <input
            type="text"
            value={batchNote}
            onChange={(e) => setBatchNote(e.target.value)}
            placeholder="Masalan: Xitoydan yangi partiya keldi..."
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-4 rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 disabled:opacity-60"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Send className="w-5 h-5" />
              Kirimni Saqlash
            </>
          )}
        </button>
      </form>
    </div>
  );
}
