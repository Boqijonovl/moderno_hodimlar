'use client';

import { useEffect, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { use } from 'react';

export default function ReceiptPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const saleId = params.id;
  const [sale, setSale] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sales')
      .then(res => res.json())
      .then(data => {
        const found = data.find((s: any) => s.id === saleId);
        setSale(found);
        setLoading(false);
      });
  }, [saleId]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-100">Yuklanmoqda...</div>;
  }

  if (!sale) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-100">Chek topilmadi.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-800">
      <div className="bg-white w-full max-w-md p-8 rounded-none sm:rounded-2xl shadow-xl border border-slate-200 print:shadow-none print:border-none print:w-full print:max-w-full print:p-0">
        
        {/* Header */}
        <div className="text-center mb-8 border-b-2 border-dashed border-slate-200 pb-6">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">MODERNO MEBEL</h1>
          <p className="text-sm font-medium text-slate-500 tracking-widest uppercase mt-1">Sifat va Qulaylik</p>
        </div>

        {/* Info Box */}
        <div className="bg-slate-50 p-4 rounded-xl mb-6 space-y-2 border border-slate-100 print:bg-white print:border-none print:p-0">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Sana:</span>
            <span className="font-bold">{new Date(sale.createdAt).toLocaleString('uz-UZ')}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Sotuvchi:</span>
            <span className="font-bold">{sale.user?.name || 'Noma\'lum'}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">To'lov turi:</span>
            <span className="font-bold">
              {sale.paymentMethod === 'CASH' ? 'Naqd' : sale.paymentMethod === 'CARD' ? 'Karparativ' : 'Avans'}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Chek raqami:</span>
            <span className="font-mono font-medium text-slate-600 text-xs">#{sale.id.split('-')[0].toUpperCase()}</span>
          </div>
        </div>

        {/* Items */}
        <div className="mb-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2 print:px-0">Xarid qilingan tovarlar</h3>
          <div className="space-y-3">
            {sale.items?.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between items-start gap-4 px-2 print:px-0">
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 leading-tight">{item.name}</p>
                </div>
                <div className="text-right whitespace-nowrap">
                  <p className="font-bold text-slate-900">{(item.price).toLocaleString()} so'm</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="border-t-2 border-dashed border-slate-200 pt-6 mb-8">
          <div className="flex justify-between items-end px-2 print:px-0">
            <span className="text-lg font-bold text-slate-600 uppercase">Jami:</span>
            <span className="text-2xl font-black text-emerald-600">
              {(sale.totalPrice || 0).toLocaleString()} so'm
            </span>
          </div>
          
          {sale.paymentMethod === 'INSTALLMENT' && (
            <div className="mt-4 space-y-2 px-2 print:px-0">
              <div className="flex justify-between items-end text-slate-700">
                <span className="text-sm font-bold uppercase">To'langan Avans:</span>
                <span className="text-lg font-bold">
                  {(sale.advance || 0).toLocaleString()} so'm
                </span>
              </div>
              <div className="flex justify-between items-end text-red-600">
                <span className="text-sm font-bold uppercase">Qoldiq (Qarz):</span>
                <span className="text-xl font-black">
                  {(sale.balance || 0).toLocaleString()} so'm
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center space-y-4">
          <p className="text-sm text-slate-500 italic mb-6">Xaridingiz uchun rahmat!<br/>Yana kutib qolamiz.</p>
          
          <button 
            onClick={() => window.print()}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl active:scale-95 transition-all print:hidden flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20"
          >
            <Printer className="w-5 h-5" />
            Chekni Chop etish / Saqlash
          </button>
        </div>
        
      </div>
    </div>
  );
}
