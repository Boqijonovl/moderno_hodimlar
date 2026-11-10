'use client';

import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  Edit2,
  History,
  Package,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Wrench,
} from 'lucide-react';
import ZapchasSellForm from './zapchas/ZapchasSellForm';
import ZapchasInForm from './zapchas/ZapchasInForm';
import {
  EditTransactionModal,
  PartFormModal,
  QuickStockModal,
} from './zapchas/ZapchasModals';
import {
  TelegramWebAppProp,
  ZapchasPartItem,
  ZapchasPermissions,
  ZapchasSummary,
  ZapchasTxItem,
  ZapchasUserProp,
  getStockStatusBadge,
} from './zapchas/ZapchasTypes';

type ZapchasTabKey = 'sell' | 'in' | 'stock' | 'history';

export default function ZapchasSection({
  user,
  WebApp,
  initialView,
  onDataChanged,
}: {
  user: ZapchasUserProp;
  WebApp: TelegramWebAppProp | null;
  initialView?: ZapchasTabKey;
  onDataChanged?: () => void;
}) {
  const isDefaultManager =
    user?.role === 'ADMIN' ||
    user?.canManageZapchas === true ||
    user?.telegramId === '1037362053' ||
    user?.telegramId === '3491381';

  const [activeView, setActiveView] = useState<ZapchasTabKey>(
    initialView || (isDefaultManager ? 'stock' : 'sell')
  );
  const [parts, setParts] = useState<ZapchasPartItem[]>([]);
  const [transactions, setTransactions] = useState<ZapchasTxItem[]>([]);
  const [summary, setSummary] = useState<ZapchasSummary>({
    totalParts: 0,
    totalStock: 0,
    outOfStockCount: 0,
    lowStockCount: 0,
    todayIn: 0,
    todayOut: 0,
  });
  const [permissions, setPermissions] = useState<ZapchasPermissions>({
    canSell: true,
    canManage: isDefaultManager,
    isAdmin: user?.role === 'ADMIN',
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [stockSearch, setStockSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low'>('all');
  const [txTypeFilter, setTxTypeFilter] = useState<'ALL' | 'IN' | 'OUT' | 'ADJUST'>('ALL');
  const [txSearch, setTxSearch] = useState('');

  // Modals
  const [partModal, setPartModal] = useState<{ open: boolean; part: ZapchasPartItem | null }>({
    open: false,
    part: null,
  });
  const [quickStockModal, setQuickStockModal] = useState<{
    part: ZapchasPartItem;
    action: 'IN' | 'OUT' | 'ADJUST';
  } | null>(null);
  const [editTxModal, setEditTxModal] = useState<ZapchasTxItem | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const telegramId = user?.telegramId || '';

  useEffect(() => {
    if (!telegramId) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/zapchas?telegramId=${encodeURIComponent(telegramId)}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setParts(data.parts || []);
          setTransactions(data.transactions || []);
          if (data.summary) setSummary(data.summary);
          if (data.permissions) setPermissions(data.permissions);
        }
      } catch (e) {
        console.error('Error loading zapchas:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [telegramId, reloadKey]);

  const handleRefresh = () => {
    setReloadKey((k) => k + 1);
    if (onDataChanged) onDataChanged();
  };

  const handleDeletePart = async (part: ZapchasPartItem) => {
    if (
      !confirm(
        `"${part.name}" zapchasini va uning barcha kelgan-ketgan tarixini o'chirasizmi?`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(
        `/api/zapchas/parts/${part.id}?telegramId=${encodeURIComponent(user.telegramId)}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "O'chirishda xatolik");
      } else {
        handleRefresh();
      }
    } catch {
      alert('Tarmoq xatosi');
    }
  };

  const handleDeleteTx = async (tx: ZapchasTxItem) => {
    if (
      !confirm(
        `"${tx.part.name}" (${tx.quantityDelta > 0 ? '+' : ''}${tx.quantityDelta} ${tx.part.unit}) yozuvini o'chirib, ombor qoldig'ini qaytarasizmi?`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(
        `/api/zapchas/transactions/${tx.id}?telegramId=${encodeURIComponent(user.telegramId)}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "O'chirishda xatolik");
      } else {
        handleRefresh();
      }
    } catch {
      alert('Tarmoq xatosi');
    }
  };

  const filteredParts = parts.filter((p) => {
    const matchesSearch = stockSearch.trim()
      ? p.name.toLowerCase().includes(stockSearch.trim().toLowerCase()) ||
        (p.note || '').toLowerCase().includes(stockSearch.trim().toLowerCase())
      : true;
    const isLow = p.quantity <= 0 || (p.minQuantity > 0 && p.quantity <= p.minQuantity);
    const matchesFilter = stockFilter === 'all' ? true : isLow;
    return matchesSearch && matchesFilter;
  });

  const filteredTransactions = transactions.filter((t) => {
    const matchesType = txTypeFilter === 'ALL' || t.type === txTypeFilter;
    const q = txSearch.trim().toLowerCase();
    const matchesSearch = q
      ? t.part.name.toLowerCase().includes(q) ||
        (t.user?.name || '').toLowerCase().includes(q) ||
        (t.customerName || '').toLowerCase().includes(q) ||
        (t.note || '').toLowerCase().includes(q)
      : true;
    return matchesType && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      {/* Header Role & Summary */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Zapchaslar Bo&apos;limi
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {permissions.canManage
                  ? 'Kelgan-ketgan sonini boshqarish va sotuv'
                  : 'Sotilgan zapchaslarni kiritish va qoldiq'}
              </p>
            </div>
          </div>

          <span
            className={`text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1 ${
              permissions.isAdmin
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                : permissions.canManage
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            {permissions.isAdmin
              ? 'Admin'
              : permissions.canManage
                ? "Mas'ul Boshqaruvchi"
                : 'Sotuvchi'}
          </span>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-100 dark:border-slate-700/60">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Zapchas turlari
            </div>
            <div className="text-lg font-black text-slate-800 dark:text-white mt-0.5">
              {summary.totalParts} xil
            </div>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-100 dark:border-slate-700/60">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Omborda jami
            </div>
            <div className="text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5">
              {summary.totalStock}
            </div>
          </div>

          {permissions.canManage ? (
            <>
              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/50">
                <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                  Bugun keldi
                </div>
                <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  +{summary.todayIn}
                </div>
              </div>
              <div className="p-3 bg-rose-50/70 dark:bg-rose-950/30 rounded-2xl border border-rose-100 dark:border-rose-900/50">
                <div className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                  Bugun ketdi
                </div>
                <div className="text-lg font-black text-rose-600 dark:text-rose-400 mt-0.5">
                  -{summary.todayOut}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/50">
                <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                  Mavjud turlar
                </div>
                <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {parts.filter((p) => p.quantity > 0).length} xil
                </div>
              </div>
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-100 dark:border-amber-900/50">
                <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                  Tugaganlar
                </div>
                <div className="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">
                  {summary.outOfStockCount} xil
                </div>
              </div>
            </>
          )}
        </div>

        {/* Navigation Tabs for Manager & Admin */}
        {permissions.canManage && (
          <div className="grid grid-cols-4 gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveView('stock')}
              className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                activeView === 'stock'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Boxes className="w-3.5 h-3.5 shrink-0" />
              <span>Ombor</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('in')}
              className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                activeView === 'in'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5 shrink-0" />
              <span>Keldi</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('sell')}
              className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                activeView === 'sell'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
              <span>Sotish</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('history')}
              className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                activeView === 'history'
                  ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <History className="w-3.5 h-3.5 shrink-0" />
              <span>Tarix</span>
            </button>
          </div>
        )}
      </div>

      {/* VIEW 1: SELLER FORM (or Manager/Admin Sell tab) */}
      {(!permissions.canManage || activeView === 'sell') && (
        <ZapchasSellForm
          telegramId={user.telegramId}
          parts={parts}
          WebApp={WebApp}
          onSuccess={handleRefresh}
        />
      )}

      {/* VIEW 2: MANAGER/ADMIN INCOMING STOCK FORM */}
      {permissions.canManage && activeView === 'in' && (
        <ZapchasInForm
          telegramId={user.telegramId}
          parts={parts}
          WebApp={WebApp}
          onSuccess={handleRefresh}
        />
      )}

      {/* VIEW 3: INVENTORY CATALOG (Full manage for Manager/Admin, Read-only for Seller) */}
      {(activeView === 'stock' || !permissions.canManage) && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Ombordagi Zapchaslar ({filteredParts.length})
            </h2>

            {permissions.canManage && (
              <button
                type="button"
                onClick={() => setPartModal({ open: true, part: null })}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                Yangi zapchas
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                placeholder="Zapchas qidirish..."
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setStockFilter('all')}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                  stockFilter === 'all'
                    ? 'bg-slate-800 dark:bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                Barchasi
              </button>
              <button
                type="button"
                onClick={() => setStockFilter('low')}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors ${
                  stockFilter === 'low'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Kam / Tugagan ({summary.outOfStockCount + summary.lowStockCount})
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {filteredParts.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-400">
                {parts.length === 0
                  ? "Hali zapchaslar qo'shilmagan."
                  : 'Qidiruv natijasi topilmadi.'}
              </div>
            ) : (
              filteredParts.map((part) => {
                const badge = getStockStatusBadge(part.quantity, part.minQuantity);
                return (
                  <div
                    key={part.id}
                    className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/70 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                          {part.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                          <span>Birlik: {part.unit}</span>
                          {part.price ? (
                            <span>• {part.price.toLocaleString()} so&apos;m</span>
                          ) : null}
                          {part.note ? <span>• {part.note}</span> : null}
                        </div>
                      </div>

                      <span
                        className={`text-xs font-extrabold px-2.5 py-1 rounded-full border shrink-0 ${badge.className}`}
                      >
                        {part.quantity} {part.unit}
                      </span>
                    </div>

                    {permissions.canManage && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/50">
                        <div className="flex items-center gap-2 text-[11px] font-bold">
                          <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                            Kelgan: +{part.totalIn || 0}
                          </span>
                          <span className="text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md">
                            Ketgan: -{part.totalOut || 0}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setQuickStockModal({ part, action: 'IN' })}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold"
                          >
                            + Keldi
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuickStockModal({ part, action: 'OUT' })}
                            disabled={part.quantity <= 0}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-lg text-[11px] font-bold"
                          >
                            - Ketdi
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuickStockModal({ part, action: 'ADJUST' })}
                            className="p-1.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-lg hover:bg-amber-200"
                            title="Qoldiqni tuzatish"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPartModal({ open: true, part })}
                            className="p-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200"
                            title="Tahrirlash"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePart(part)}
                            className="p-1.5 bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-200"
                            title="O'chirish"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* VIEW 4: MOVEMENT HISTORY (Full kelgan-ketgan for Manager/Admin, own sales for Seller) */}
      {(activeView === 'history' || !permissions.canManage) && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" />
              {permissions.canManage
                ? 'Kelgan-Ketgan Tarixi'
                : 'Mening Sotgan Zapchaslarim'}
            </h2>
            <span className="text-xs font-bold text-slate-400">
              {filteredTransactions.length} ta yozuv
            </span>
          </div>

          {permissions.canManage && (
            <div className="space-y-2">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  placeholder="Zapchas, xodim, mijoz yoki izoh bo'yicha qidirish..."
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { key: 'ALL', label: 'Barchasi' },
                    { key: 'IN', label: '📥 Kelgan' },
                    { key: 'OUT', label: '📤 Ketgan' },
                    { key: 'ADJUST', label: '⚖️ Tuzatilgan' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setTxTypeFilter(opt.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      txTypeFilter === opt.key
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2.5">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-400">
                Hali harakatlar qayd etilmagan.
              </div>
            ) : (
              filteredTransactions.map((tx) => {
                const isIn = tx.type === 'IN';
                const isOut = tx.type === 'OUT';
                const sign = tx.quantityDelta > 0 ? '+' : '';
                return (
                  <div
                    key={tx.id}
                    className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/70 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                            isIn
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                              : isOut
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                          }`}
                        >
                          {sign}
                          {tx.quantityDelta} {tx.part.unit}
                        </span>
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                          {tx.part.name}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        {tx.user?.name && (
                          <span>
                            👤 <b>{tx.user.name}</b>
                          </span>
                        )}
                        <span>
                          • Qoldiq: <b>{tx.balanceAfter} {tx.part.unit}</b>
                        </span>
                        {tx.totalPrice ? (
                          <span>• {tx.totalPrice.toLocaleString()} so&apos;m</span>
                        ) : null}
                      </div>

                      {(tx.customerName || tx.note) && (
                        <div className="text-[11px] text-slate-600 dark:text-slate-300">
                          {tx.customerName && <span className="mr-2">🏷 {tx.customerName}</span>}
                          {tx.note && <span className="italic">📝 {tx.note}</span>}
                        </div>
                      )}

                      <div className="text-[10px] text-slate-400">
                        {new Date(tx.createdAt).toLocaleDateString('uz-UZ', {
                          timeZone: 'Asia/Tashkent',
                        })}{' '}
                        {new Date(tx.createdAt).toLocaleTimeString('uz-UZ', {
                          timeZone: 'Asia/Tashkent',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>

                    {permissions.canManage && (
                      <div className="flex items-center gap-1 shrink-0">
                        {tx.type !== 'ADJUST' && (
                          <button
                            type="button"
                            onClick={() => setEditTxModal(tx)}
                            className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100"
                            title="Tahrirlash"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteTx(tx)}
                          className="p-1.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-100"
                          title="O'chirish va qoldiqni qaytarish"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {partModal.open && (
        <PartFormModal
          telegramId={user.telegramId}
          editingPart={partModal.part}
          onClose={() => setPartModal({ open: false, part: null })}
          onSaved={() => {
            setPartModal({ open: false, part: null });
            handleRefresh();
          }}
        />
      )}

      {quickStockModal && (
        <QuickStockModal
          telegramId={user.telegramId}
          part={quickStockModal.part}
          actionType={quickStockModal.action}
          onClose={() => setQuickStockModal(null)}
          onSaved={() => {
            setQuickStockModal(null);
            handleRefresh();
          }}
        />
      )}

      {editTxModal && (
        <EditTransactionModal
          telegramId={user.telegramId}
          tx={editTxModal}
          onClose={() => setEditTxModal(null)}
          onSaved={() => {
            setEditTxModal(null);
            handleRefresh();
          }}
        />
      )}
    </div>
  );
}
