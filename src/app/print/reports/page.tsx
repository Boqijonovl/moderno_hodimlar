'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Printer } from 'lucide-react';

function PrintReportsContent() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const monthParam = searchParams.get('month') || new Date().toISOString().slice(0, 7);

  useEffect(() => {
    fetch(`/api/admin/reports?month=${monthParam}`)
      .then(res => res.json())
      .then(resData => {
        setData(resData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [monthParam]);

  if (loading || !data) {
    return <div className="p-10 text-center font-bold">Yuklanmoqda...</div>;
  }

  const formatCurrency = (val: number) => (val || 0).toLocaleString() + " so'm";
  
  const users = data.monthly || [];
  const totalSalesValue = users.reduce((acc: number, curr: any) => acc + (curr.totalSales || 0), 0);
  const totalReceived = users.reduce((acc: number, curr: any) => acc + (curr.totalReceived || 0), 0);
  const totalExpenses = users.reduce((acc: number, curr: any) => acc + (curr.totalExpenses || 0), 0);
  const netProfit = totalReceived - totalExpenses;
  const monthText = new Date(monthParam + '-01').toLocaleString('uz-UZ', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 shadow-lg min-h-[1056px] print:shadow-none print:m-0 print:p-0">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b-2 border-gray-800 pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 uppercase tracking-wider">Moderno Mebel</h1>
            <p className="text-gray-500 mt-1">Oylik Moliyaviy Hisobot</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-600">Hisobot oyi: <span className="text-gray-900 capitalize">{monthText}</span></p>
            <p className="text-sm font-bold text-gray-600">Sana: <span className="text-gray-900">{new Date().toLocaleDateString('uz-UZ')}</span></p>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-50 p-4 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-500 font-bold uppercase mb-1">Jami Savdo Qiymati</p>
            <p className="text-lg font-black text-slate-700">{formatCurrency(totalSalesValue)}</p>
          </div>
          <div className="bg-gray-50 p-4 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-500 font-bold uppercase mb-1">Haqiqiy Tushum (Kirim)</p>
            <p className="text-lg font-black text-emerald-600">{formatCurrency(totalReceived)}</p>
          </div>
          <div className="bg-gray-50 p-4 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-500 font-bold uppercase mb-1">Xarajatlar</p>
            <p className="text-lg font-black text-rose-600">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className="bg-gray-50 p-4 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-500 font-bold uppercase mb-1">Sof Foyda (Kassa)</p>
            <p className="text-lg font-black text-blue-600">{formatCurrency(netProfit)}</p>
          </div>
        </div>

        {/* Content */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2">Xodimlar Kesimida Hisobot</h2>
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 print:bg-gray-200">
                <th className="p-3 border border-gray-300 font-bold text-gray-800">№</th>
                <th className="p-3 border border-gray-300 font-bold text-gray-800">Xodim</th>
                <th className="p-3 border border-gray-300 font-bold text-gray-800 text-right">Qilgan Savdosi</th>
                <th className="p-3 border border-gray-300 font-bold text-gray-800 text-right">Real Kirim</th>
                <th className="p-3 border border-gray-300 font-bold text-gray-800 text-right">Xarajatlar</th>
                <th className="p-3 border border-gray-300 font-bold text-gray-800 text-center">Davomat</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: any, i: number) => (
                <tr key={u.user.id} className="hover:bg-gray-50 print:break-inside-avoid">
                  <td className="p-3 border border-gray-300 text-gray-600 font-medium">{i + 1}</td>
                  <td className="p-3 border border-gray-300 font-bold text-gray-800">{u.user.name}</td>
                  <td className="p-3 border border-gray-300 text-slate-700 font-bold text-right">{formatCurrency(u.totalSales)}</td>
                  <td className="p-3 border border-gray-300 text-emerald-600 font-bold text-right">{formatCurrency(u.totalReceived)}</td>
                  <td className="p-3 border border-gray-300 text-rose-600 font-bold text-right">{formatCurrency(u.totalExpenses)}</td>
                  <td className="p-3 border border-gray-300 text-center">
                    <span className="text-green-600 font-bold">{u.totalDaysPresent} kun</span>
                    <br />
                    <span className="text-yellow-600 font-bold">{u.totalLateMinutes} daq kechikish</span>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-500 italic">Ma'lumot topilmadi</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-gray-200 flex justify-between text-sm text-gray-500">
          <p>Ushbu hujjat elektron tizim orqali avtomatik shakllantirilgan.</p>
          <p>Yaratilgan vaqt: {new Date().toLocaleString('uz-UZ')}</p>
        </div>

      </div>

      {/* Floating Print Button (hidden when printing) */}
      <button 
        onClick={() => window.print()}
        className="fixed bottom-8 right-8 bg-blue-600 text-white p-4 rounded-full shadow-2xl hover:bg-blue-700 active:scale-95 transition-all print:hidden flex items-center justify-center gap-2 font-bold"
      >
        <Printer className="w-6 h-6" />
        <span className="pr-2">Chop etish</span>
      </button>

      {/* Print styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A4 portrait; margin: 20mm; }
          body { background: white; }
        }
      `}} />
    </div>
  );
}

export default function PrintReportsPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center font-bold">Yuklanmoqda...</div>}>
      <PrintReportsContent />
    </Suspense>
  );
}
