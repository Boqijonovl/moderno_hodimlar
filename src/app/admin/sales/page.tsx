'use client';

import { useState, useEffect } from 'react';
import { Download, BarChart2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export default function SalesAnalytics() {
  const [sales, setSales] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/sales')
      .then(res => res.json())
      .then(setSales);
  }, []);

  const exportToExcel = () => {
    if (sales.length === 0) return alert("Sotuvlar yo'q");
    
    const data = sales.map(s => ({
      'Sana': new Date(s.createdAt).toLocaleString(),
      'Xodim': s.user.name,
      'Kategoriya': s.category.name,
      'Mebel Nomi': s.itemName,
      'Narxi': s.price,
      'To\'lov Turi': s.paymentMethod
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Savdolar');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(blob, `Savdolar_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Savdolar Tahlili</h1>
          <p className="text-slate-500 text-sm">Barcha savdolar ro'yxati</p>
        </div>
        <button 
          onClick={exportToExcel}
          className="bg-emerald-500 text-white p-2 rounded-xl flex items-center gap-2 hover:bg-emerald-600 transition-colors shadow-sm active:scale-95"
        >
          <Download className="w-5 h-5" />
          <span className="text-sm font-medium">Excel</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-blue-500" />
          <h2 className="font-semibold text-slate-800">Sotuvlar Tarixi</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {sales.length === 0 && <div className="p-8 text-center text-slate-500">Hozircha sotuvlar yo'q</div>}
          {sales.map(sale => (
            <div key={sale.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
              <div>
                <p className="font-medium text-slate-800">{sale.itemName}</p>
                <div className="flex items-center gap-2 mt-1 text-xs">
                  <span className="text-blue-600 font-medium">{sale.category.name}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500">{sale.user.name}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-emerald-600">{(sale.price).toLocaleString()} so'm</p>
                <div className="flex justify-end gap-2 mt-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-medium">
                    {new Date(sale.createdAt).toLocaleDateString()}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium uppercase">
                    {sale.paymentMethod}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
