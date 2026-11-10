'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import {
  ZAPCHAS_UNITS,
  ZapchasPartItem,
  ZapchasTxItem,
  formatAmountInput,
} from './ZapchasTypes';

export function PartFormModal({
  telegramId,
  editingPart,
  onClose,
  onSaved,
}: {
  telegramId: string;
  editingPart: ZapchasPartItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(editingPart?.name || '');
  const [unit, setUnit] = useState(editingPart?.unit || 'dona');
  const [quantity, setQuantity] = useState(editingPart ? String(editingPart.quantity) : '0');
  const [minQuantity, setMinQuantity] = useState(
    editingPart ? String(editingPart.minQuantity) : '5'
  );
  const [price, setPrice] = useState(
    editingPart?.price ? formatAmountInput(String(Math.round(editingPart.price))) : ''
  );
  const [note, setNote] = useState(editingPart?.note || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Zapchas nomini kiriting.');
      return;
    }

    setSaving(true);
    try {
      const url = editingPart ? `/api/zapchas/parts/${editingPart.id}` : '/api/zapchas/stock';
      const method = editingPart ? 'PUT' : 'POST';
      const payload = editingPart
        ? {
            telegramId,
            name: name.trim(),
            unit,
            minQuantity: parseInt(minQuantity || '0', 10),
            price: price ? price.replace(/\s/g, '') : null,
            note: note.trim() || null,
          }
        : {
            telegramId,
            action: 'CREATE_PART',
            name: name.trim(),
            unit,
            quantity: parseInt(quantity || '0', 10),
            minQuantity: parseInt(minQuantity || '0', 10),
            price: price ? price.replace(/\s/g, '') : null,
            note: note.trim() || null,
          };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Saqlashda xatolik');
      } else {
        onSaved();
      }
    } catch {
      alert('Tarmoq xatosi');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">
            {editingPart ? 'Zapchasni Tahrirlash' : "Yangi Zapchas Qo'shish"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
              Zapchas nomi *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Masalan: Petlya dovodchikli"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                O&apos;lchov birligi
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold dark:text-white outline-none"
              >
                {ZAPCHAS_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            {!editingPart ? (
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Boshlang&apos;ich soni
                </label>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Minimal ogohlantirish
                </label>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={minQuantity}
                  onChange={(e) => setMinQuantity(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {!editingPart && (
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Minimal ogohlantirish
                </label>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={minQuantity}
                  onChange={(e) => setMinQuantity(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div className={editingPart ? 'col-span-2' : ''}>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                Narxi (ixtiyoriy, so&apos;m)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(formatAmountInput(e.target.value))}
                placeholder="0 so'm"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
              Izoh (ixtiyoriy)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Masalan: Oshxona mebellari uchun..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm disabled:opacity-60"
            >
              {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function QuickStockModal({
  telegramId,
  part,
  actionType,
  onClose,
  onSaved,
}: {
  telegramId: string;
  part: ZapchasPartItem;
  actionType: 'IN' | 'OUT' | 'ADJUST';
  onClose: () => void;
  onSaved: () => void;
}) {
  const [qty, setQty] = useState(actionType === 'ADJUST' ? String(part.quantity) : '1');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const title =
    actionType === 'IN'
      ? `Kirim (+): ${part.name}`
      : actionType === 'OUT'
        ? `Chiqim (-): ${part.name}`
        : `Qoldiqni tuzatish: ${part.name}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload =
        actionType === 'ADJUST'
          ? {
              telegramId,
              action: 'ADJUST',
              partId: part.id,
              newQuantity: parseInt(qty || '0', 10),
              note: note.trim() || undefined,
            }
          : {
              telegramId,
              action: actionType,
              partId: part.id,
              quantity: parseInt(qty || '0', 10),
              note: note.trim() || undefined,
            };

      const res = await fetch('/api/zapchas/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Xatolik yuz berdi');
      } else {
        onSaved();
      }
    } catch {
      alert('Tarmoq xatosi');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800 dark:text-white pr-2">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
          Hozirgi qoldiq: <b className="text-slate-800 dark:text-white">{part.quantity} {part.unit}</b>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
              {actionType === 'ADJUST'
                ? `Yangi haqiqiy qoldiq (${part.unit})`
                : actionType === 'IN'
                  ? `Nechta keldi (${part.unit})`
                  : `Nechta chiqdi (${part.unit})`}
            </label>
            <input
              type="number"
              min={actionType === 'ADJUST' ? 0 : 1}
              max={actionType === 'OUT' ? part.quantity : undefined}
              inputMode="numeric"
              required
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-lg font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
              Izoh (ixtiyoriy)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={actionType === 'ADJUST' ? 'Masalan: Sanab chiqilganda...' : 'Izoh...'}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm"
            >
              Bekor
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-60 ${
                actionType === 'IN'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : actionType === 'OUT'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {saving ? 'Saqlanmoqda...' : 'Tasdiqlash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EditTransactionModal({
  telegramId,
  tx,
  onClose,
  onSaved,
}: {
  telegramId: string;
  tx: ZapchasTxItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [quantity, setQuantity] = useState(String(tx.quantity));
  const [customerName, setCustomerName] = useState(tx.customerName || '');
  const [note, setNote] = useState(tx.note || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/zapchas/transactions/${tx.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId,
          quantity: tx.type !== 'ADJUST' ? parseInt(quantity || '1', 10) : undefined,
          customerName: customerName.trim() || null,
          note: note.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Tahrirlashda xatolik');
      } else {
        onSaved();
      }
    } catch {
      alert('Tarmoq xatosi');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            Yozuvni Tahrirlash: {tx.part.name}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {tx.type !== 'ADJUST' && (
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                Soni ({tx.part.unit})
              </label>
              <input
                type="number"
                min={1}
                inputMode="numeric"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {tx.type === 'OUT' && (
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                Mijoz / Buyurtma
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
              Izoh
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm"
            >
              Bekor
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm disabled:opacity-60"
            >
              {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
