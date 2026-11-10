'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, X, Plus, Check } from 'lucide-react';
import { ZapchasPartItem, getStockStatusBadge } from './ZapchasTypes';

interface ZapchasPartPickerProps {
  parts: ZapchasPartItem[];
  selectedPartId?: string;
  customPartName?: string;
  mode: 'sell' | 'in';
  placeholder?: string;
  onSelectExisting: (part: ZapchasPartItem) => void;
  onSelectNew?: (name: string) => void;
  onClear: () => void;
}

export default function ZapchasPartPicker({
  parts,
  selectedPartId,
  customPartName,
  mode,
  placeholder = 'Zapchas nomini yozing yoki tanlang...',
  onSelectExisting,
  onSelectNew,
  onClear,
}: ZapchasPartPickerProps) {
  const selectedPart = parts.find((p) => p.id === selectedPartId) || null;
  const [draftQuery, setDraftQuery] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const inputValue = selectedPart
    ? selectedPart.name
    : customPartName
      ? customPartName
      : draftQuery;

  const trimmedQuery = inputValue.trim();
  const filteredParts =
    !selectedPart && !customPartName && trimmedQuery
      ? parts.filter((p) => p.name.toLowerCase().includes(trimmedQuery.toLowerCase()))
      : parts;

  const exactMatch = parts.some(
    (p) => p.name.toLowerCase() === trimmedQuery.toLowerCase()
  );

  const handleInputChange = (val: string) => {
    setDraftQuery(val);
    setIsOpen(true);
    if (selectedPartId || customPartName) {
      onClear();
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
        <input
          type="text"
          value={inputValue}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border rounded-2xl text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
            selectedPartId
              ? 'border-blue-400 dark:border-blue-600 bg-blue-50/40 dark:bg-blue-950/20'
              : customPartName
                ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20'
                : 'border-slate-200 dark:border-slate-700'
          }`}
        />
        {(inputValue || selectedPartId || customPartName) && (
          <button
            type="button"
            onClick={() => {
              setDraftQuery('');
              onClear();
              setIsOpen(true);
            }}
            className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700"
            title="Tozalash"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {selectedPart && (
        <div className="mt-1.5 flex items-center gap-2 text-[11px] font-medium px-1">
          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> Tanlandi
          </span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-600 dark:text-slate-300">
            Omborda: <b>{selectedPart.quantity} {selectedPart.unit}</b>
          </span>
          {selectedPart.price ? (
            <>
              <span className="text-slate-400">•</span>
              <span className="text-blue-600 dark:text-blue-400">
                {selectedPart.price.toLocaleString()} so&apos;m
              </span>
            </>
          ) : null}
        </div>
      )}

      {!selectedPart && customPartName && mode === 'in' && (
        <div className="mt-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 px-1 flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Yangi zapchas sifatida qo&apos;shiladi: &quot;{customPartName}&quot;
        </div>
      )}

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 z-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {mode === 'in' && trimmedQuery && !exactMatch && onSelectNew && (
            <button
              type="button"
              onClick={() => {
                onSelectNew(trimmedQuery);
                setDraftQuery(trimmedQuery);
                setIsOpen(false);
              }}
              className="w-full px-3.5 py-2.5 text-left flex items-center gap-2 bg-emerald-50/70 dark:bg-emerald-950/30 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 transition-colors"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="text-xs font-bold">
                &quot;{trimmedQuery}&quot; — yangi zapchas qo&apos;shish
              </span>
            </button>
          )}

          {filteredParts.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">
              {parts.length === 0
                ? "Omborda hali zapchaslar kiritilmagan."
                : `"${trimmedQuery}" bo'yicha zapchas topilmadi.`}
            </div>
          ) : (
            filteredParts.map((part) => {
              const badge = getStockStatusBadge(part.quantity, part.minQuantity);
              const isOutForSell = mode === 'sell' && part.quantity <= 0;
              const isSelected = part.id === selectedPartId;

              return (
                <button
                  key={part.id}
                  type="button"
                  disabled={isOutForSell}
                  onClick={() => {
                    onSelectExisting(part);
                    setDraftQuery(part.name);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-2 transition-colors ${
                    isOutForSell
                      ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900'
                      : isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                      {part.name}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>Birlik: {part.unit}</span>
                      {part.price ? (
                        <span>• {part.price.toLocaleString()} so&apos;m</span>
                      ) : null}
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${badge.className}`}
                  >
                    {part.quantity > 0 ? `${part.quantity} ${part.unit}` : 'Tugagan (0)'}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
