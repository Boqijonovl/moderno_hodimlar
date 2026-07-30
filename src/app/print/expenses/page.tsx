'use client';

import { useState, useEffect } from 'react';
import { Printer } from 'lucide-react';

export default function PrintExpensesPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/expenses')
      .then(res => res.json())
      .then(resData => {
        setData(resData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-10 text-center font-bold">Yuklanmoqda...</div>;
  }

  const totalExpenses = data.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 shadow-lg min-h-[1056px] print:shadow-none print:m-0 print:p-0">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b-2 border-gray-800 pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 uppercase tracking-wider">Moderno Mebel</h1>
            <p className="text-gray-500 mt-1">Rasmiy Xarajatlar Hisoboti</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-600">Hujjat sanasi: <span className="text-gray-900">{new Date().toLocaleDateString('uz-UZ')}</span></p>
            <p className="text-sm font-bold text-gray-600">Jami xarajatlar: <span className="text-gray-900">{data.length} ta</span></p>
          </div>
        </div>

        {/* Summary Blocks */}
        <div className="flex gap-4 mb-8">
          <div className="flex-1 bg-rose-50 p-4 rounded-xl border border-rose-100">
            <p className="text-sm text-rose-600 font-bold uppercase mb-1">Umumiy Xarajat</p>
            <p className="text-xl font-black text-rose-700">{totalExpenses.toLocaleString()} so'm</p>
          </div>
        </div>

        {/* Content */}
        <div className="mb-8 overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead>
              <tr className="bg-gray-100 print:bg-gray-200 text-xs md:text-sm">
                <th className="p-2 md:p-3 border border-gray-300 font-bold text-gray-800">№</th>
                <th className="p-2 md:p-3 border border-gray-300 font-bold text-gray-800">Sana</th>
                <th className="p-2 md:p-3 border border-gray-300 font-bold text-gray-800">Xodim</th>
                <th className="p-2 md:p-3 border border-gray-300 font-bold text-gray-800">Izoh</th>
                <th className="p-2 md:p-3 border border-gray-300 font-bold text-gray-800 text-right">Summa</th>
                <th className="p-2 md:p-3 border border-gray-300 font-bold text-gray-800">To'lov Turi</th>
              </tr>
            </thead>
            <tbody>
              {data.map((expense: any, index: number) => (
                <tr key={expense.id} className="hover:bg-gray-50 print:break-inside-avoid text-xs md:text-sm">
                  <td className="p-2 md:p-3 border border-gray-300 text-gray-600 font-medium">{index + 1}</td>
                  <td className="p-2 md:p-3 border border-gray-300 text-gray-700">{new Date(expense.createdAt).toLocaleString('uz-UZ', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit'})}</td>
                  <td className="p-2 md:p-3 border border-gray-300 font-bold text-gray-800">{expense.user?.name || 'Noma\'lum'}</td>
                  <td className="p-2 md:p-3 border border-gray-300 text-gray-700">{expense.reason || '-'}</td>
                  <td className="p-2 md:p-3 border border-gray-300 text-red-600 font-bold text-right">{expense.amount?.toLocaleString()} so'm</td>
                  <td className="p-2 md:p-3 border border-gray-300 font-bold text-gray-700">
                    {expense.paymentMethod === 'CASH' ? 'Naqd' : expense.paymentMethod === 'CARD' ? 'Karta' : 'Karparativ'}
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-500 italic">Ma'lumot topilmadi</td>
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
        className="fixed bottom-8 right-8 bg-rose-600 text-white p-4 rounded-full shadow-2xl hover:bg-rose-700 active:scale-95 transition-all print:hidden flex items-center justify-center gap-2 font-bold"
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
