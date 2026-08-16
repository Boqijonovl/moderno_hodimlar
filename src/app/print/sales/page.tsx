'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Printer } from 'lucide-react';

function PrintSalesContent() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const monthParam = searchParams.get('month');

  useEffect(() => {
    const url = monthParam ? `/api/sales?month=${monthParam}` : '/api/sales';
    fetch(url)
      .then(res => res.json())
      .then(resData => {
        setData(resData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [monthParam]);

  if (loading) {
    return <div className="p-10 text-center font-bold">Yuklanmoqda...</div>;
  }

  const totalSales = data.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0);
  const totalAdvance = data.reduce((acc, curr) => acc + (curr.advance || 0), 0);
  const totalBalance = data.reduce((acc, curr) => acc + (curr.balance || 0), 0);

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 shadow-lg min-h-[1056px] print:shadow-none print:m-0 print:p-0">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b-2 border-gray-800 pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 uppercase tracking-wider">Moderno Mebel</h1>
            <p className="text-gray-500 mt-1">Rasmiy Savdolar Hisoboti {monthParam ? `(${monthParam})` : ''}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-600">Hujjat sanasi: <span className="text-gray-900">{new Date().toLocaleDateString('uz-UZ')}</span></p>
            <p className="text-sm font-bold text-gray-600">Jami savdolar: <span className="text-gray-900">{data.length} ta</span></p>
          </div>
        </div>

        {/* Summary Blocks */}
        <div className="flex gap-4 mb-8">
          <div className="flex-1 bg-green-50 p-4 rounded-xl border border-green-100">
            <p className="text-sm text-green-600 font-bold uppercase mb-1">Umumiy Savdo</p>
            <p className="text-xl font-black text-green-700">{totalSales.toLocaleString()} so'm</p>
          </div>
          <div className="flex-1 bg-blue-50 p-4 rounded-xl border border-blue-100">
            <p className="text-sm text-blue-600 font-bold uppercase mb-1">Kirim (To'langan)</p>
            <p className="text-xl font-black text-blue-700">{(totalSales - totalBalance).toLocaleString()} so'm</p>
          </div>
          <div className="flex-1 bg-red-50 p-4 rounded-xl border border-red-100">
            <p className="text-sm text-red-600 font-bold uppercase mb-1">Qoldiq (Qarz)</p>
            <p className="text-xl font-black text-red-700">{totalBalance.toLocaleString()} so'm</p>
          </div>
        </div>

        {/* Content */}
        <div className="mb-8">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 print:bg-gray-200">
                <th className="p-3 border border-gray-300 font-bold text-gray-800">№</th>
                <th className="p-3 border border-gray-300 font-bold text-gray-800">Sana</th>
                <th className="p-3 border border-gray-300 font-bold text-gray-800">Xodim</th>
                <th className="p-3 border border-gray-300 font-bold text-gray-800">Mebellar</th>
                <th className="p-3 border border-gray-300 font-bold text-gray-800 text-right">Summa (so'm)</th>
                <th className="p-3 border border-gray-300 font-bold text-gray-800 text-right">To'lov turi</th>
              </tr>
            </thead>
            <tbody>
              {data.map((sale: any, index: number) => {
                let paymentType = 'Naqd';
                if (sale.paymentMethod === 'CARD') paymentType = 'Karta / Karparativ';
                if (sale.paymentMethod === 'INSTALLMENT') paymentType = 'Nasiya / Avansli';

                return (
                  <tr key={sale.id} className="hover:bg-gray-50 print:break-inside-avoid">
                    <td className="p-3 border border-gray-300 text-gray-600 font-medium">{index + 1}</td>
                    <td className="p-3 border border-gray-300 text-gray-700 whitespace-nowrap">{new Date(sale.createdAt).toLocaleString('uz-UZ', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit'})}</td>
                    <td className="p-3 border border-gray-300 font-bold text-gray-800">{sale.user?.name || 'Noma\'lum'}</td>
                    <td className="p-3 border border-gray-300 text-gray-700">{sale.items?.map((i: any) => i.name).join(', ') || '-'}</td>
                    <td className="p-3 border border-gray-300 text-gray-900 font-bold text-right">
                      {sale.totalPrice?.toLocaleString()}
                      {sale.balance > 0 && (
                        <div className="text-red-500 text-xs mt-1">Qarz: {sale.balance?.toLocaleString()}</div>
                      )}
                    </td>
                    <td className="p-3 border border-gray-300 text-gray-700 text-right">{paymentType}</td>
                  </tr>
                );
              })}
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
        className="fixed bottom-8 right-8 bg-emerald-600 text-white p-4 rounded-full shadow-2xl hover:bg-emerald-700 active:scale-95 transition-all print:hidden flex items-center justify-center gap-2 font-bold"
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

export default function PrintSalesPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center font-bold">Yuklanmoqda...</div>}>
      <PrintSalesContent />
    </Suspense>
  );
}
