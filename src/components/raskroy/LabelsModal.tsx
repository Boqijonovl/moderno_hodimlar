'use client';

import React, { useState } from 'react';
import { X, Printer, QrCode, Tag, Check, Sliders } from 'lucide-react';
import { SheetLayout, PlacedItem } from '@/lib/raskroyEngine';

interface LabelsModalProps {
  sheets: SheetLayout[];
  onClose: () => void;
}

// Simple deterministic Code128-like barcode SVG generator for aesthetic and readable label tags
function SimpleBarcode({ code }: { code: string }) {
  // Generate a pattern of bars based on char codes
  const bars: { width: number; isBlack: boolean }[] = [];
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = (hash * 31 + code.charCodeAt(i)) & 0xffffffff;
  }

  // Guard bars
  bars.push({ width: 2, isBlack: true });
  bars.push({ width: 2, isBlack: false });
  bars.push({ width: 2, isBlack: true });

  for (let i = 0; i < 28; i++) {
    const bit = (hash >> (i % 31)) & 1;
    const bit2 = (hash >> ((i + 7) % 31)) & 1;
    bars.push({ width: bit ? 3 : 1.5, isBlack: true });
    bars.push({ width: bit2 ? 2.5 : 1.5, isBlack: false });
  }

  // Stop bars
  bars.push({ width: 2, isBlack: true });
  bars.push({ width: 2, isBlack: false });
  bars.push({ width: 3, isBlack: true });

  let currentX = 0;
  return (
    <div className="flex flex-col items-center">
      <svg height="34" className="w-full max-w-[200px]" preserveAspectRatio="none">
        {bars.map((bar, idx) => {
          const rect = (
            <rect
              key={idx}
              x={currentX}
              y={0}
              width={bar.width}
              height={34}
              fill={bar.isBlack ? '#000000' : 'transparent'}
            />
          );
          currentX += bar.width;
          return rect;
        })}
      </svg>
      <span className="text-[9px] font-mono tracking-widest text-slate-600 mt-0.5">{code}</span>
    </div>
  );
}

export default function LabelsModal({ sheets, onClose }: LabelsModalProps) {
  const [selectedSheetIndex, setSelectedSheetIndex] = useState<number | 'ALL'>('ALL');
  const [labelSize, setLabelSize] = useState<'standard' | 'compact'>('standard');

  const allItems: { item: PlacedItem; sheetIndex: number }[] = [];
  sheets.forEach((sheet) => {
    sheet.items.forEach((item) => {
      if (selectedSheetIndex === 'ALL' || selectedSheetIndex === sheet.sheetIndex) {
        allItems.push({ item, sheetIndex: sheet.sheetIndex });
      }
    });
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-2 sm:p-4 animate-in fade-in">
      {/* Printable Area Wrapper */}
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        
        {/* Header (Hidden on Print) */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-white">Detal Stikerlari / Etiketkalar</h2>
              <p className="text-xs text-slate-500">Jami: {allItems.length} ta detal etiketkasi</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sheet selector filter */}
            <select
              value={selectedSheetIndex}
              onChange={(e) => setSelectedSheetIndex(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="text-xs font-bold px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl outline-none"
            >
              <option value="ALL">Barcha Listlar ({sheets.length} ta)</option>
              {sheets.map((s) => (
                <option key={s.sheetIndex} value={s.sheetIndex}>
                  List #{s.sheetIndex} ({s.items.length} ta detal)
                </option>
              ))}
            </select>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Chop etish (Print)</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Labels Content (Scrollable in modal, full page on print) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 print:p-0 print:overflow-visible">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 print:grid-cols-2 print:gap-2">
            {allItems.map(({ item, sheetIndex }, idx) => {
              const codeStr = `MOD-${sheetIndex}-${item.id.slice(0, 5).toUpperCase()}`;
              const edges = item.edgeInfo || {};

              return (
                <div
                  key={idx}
                  className="bg-white border-2 border-slate-300 rounded-2xl p-3.5 shadow-sm flex flex-col justify-between text-slate-800 break-inside-avoid print:shadow-none print:border-black print:rounded-lg print:p-2.5 print:h-[55mm] print:w-[95mm] print:mb-2"
                >
                  {/* Top: Name & Sheet */}
                  <div className="flex justify-between items-start border-b border-slate-200 pb-1.5 mb-1.5">
                    <div className="min-w-0 pr-2">
                      <div className="font-black text-sm text-slate-900 truncate uppercase tracking-tight">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold">
                        Moderno Mebel • List #{sheetIndex}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[11px] font-black bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        #{idx + 1}
                      </span>
                    </div>
                  </div>

                  {/* Dimensions Box */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 my-1 flex justify-between items-center print:bg-transparent">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">O'lchami (mm)</div>
                      <div className="text-base font-black text-slate-900 tracking-tight">
                        {Math.round(item.originalW || item.w)} × {Math.round(item.originalH || item.h)}{' '}
                        <span className="text-xs font-normal text-slate-500">mm</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                        18 mm DSP
                      </span>
                    </div>
                  </div>

                  {/* Edge Banding (Kromka) 4 sides */}
                  <div className="my-1 border border-slate-200 rounded-xl p-1.5 text-[10px] bg-white">
                    <div className="font-bold text-slate-500 text-[9px] uppercase mb-1 flex items-center gap-1">
                      <span>📐</span> Kromka (Kromkalash):
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 font-semibold text-slate-700 text-[10px]">
                      <div>⬆️ Tepa: <span className="font-black text-slate-900">{edges.top || '—'}</span></div>
                      <div>⬇️ Past: <span className="font-black text-slate-900">{edges.bottom || '—'}</span></div>
                      <div>⬅️ Chap: <span className="font-black text-slate-900">{edges.left || '—'}</span></div>
                      <div>➡️ O'ng: <span className="font-black text-slate-900">{edges.right || '—'}</span></div>
                    </div>
                  </div>

                  {/* Bottom: Barcode & Code */}
                  <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex-1 pr-2">
                      <SimpleBarcode code={codeStr} />
                    </div>
                    <div className="w-7 h-7 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center shrink-0 text-slate-500">
                      <QrCode className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer (Hidden on print) */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 print:hidden">
          <span>Stiker o'lchami: Standart termoprinter (58×40mm, 80×50mm) yoki A4 stiker qog'ozlariga moslangan.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-white rounded-xl font-bold"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
}
