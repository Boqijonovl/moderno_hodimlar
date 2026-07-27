'use client';

import { useState, useEffect } from 'react';
import { Download, BarChart2, Trash2 } from 'lucide-react';
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
      'Xodim': s.user?.name || 'Noma\'lum',
      'Mebellar': s.items?.map((i: any) => i.name).join(', ') || 'Noma\'lum',
      'Umumiy Narxi': s.totalPrice,
      'To\'lov Turi': s.paymentMethod === 'CASH' ? 'Naqd' : s.paymentMethod === 'CARD' ? 'Karparativ' : 'Avans',
      'Qoldiq': s.balance || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Savdolar');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(blob, `Savdolar_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const deleteSale = async (id: string) => {
    if (!confirm("Haqiqatan ham bu savdoni o'chirmoqchimisiz?")) return;
    
    try {
      const res = await fetch(`/api/admin/sales/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSales(sales.filter(s => s.id !== id));
      } else {
        alert("O'chirishda xatolik yuz berdi");
      }
    } catch (e) {
      console.error(e);
      alert("Tarmoq xatosi");
    }
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
            <div key={sale.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors relative group">
              <div>
                <p className="font-medium text-slate-800">{sale.items?.length || 0} ta mebel</p>
                <div className="flex items-center gap-2 mt-1 text-xs">
                  <span className="text-blue-600 font-medium max-w-[150px] truncate">{sale.items?.map((i: any) => i.name).join(', ') || 'Noma\'lum'}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500">{sale.user?.name || 'Noma\'lum'}</span>
                </div>
              </div>
              <div className="text-right flex items-center gap-4">
                <div>
                  <p className="font-bold text-emerald-600">{(sale.totalPrice || 0).toLocaleString()} so'm</p>
                  
                  {(sale.status === 'INCOMPLETE' || (sale.paymentMethod === 'INSTALLMENT' && sale.balance > 0)) && (
                    <div className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-md mt-1 text-right shadow-sm border border-rose-100">
                      ⚠️ Qarz: {sale.balance?.toLocaleString()} so'm
                    </div>
                  )}

                  <div className="flex justify-end gap-2 mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-medium">
                      {new Date(sale.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium uppercase">
                      {sale.paymentMethod === 'CASH' ? 'Naqd' : sale.paymentMethod === 'CARD' ? 'Karparativ' : 'Avans'}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => deleteSale(sale.id)}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors active:scale-95"
                  title="O'chirish"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
