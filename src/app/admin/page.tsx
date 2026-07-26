'use client';

import { useState, useEffect } from 'react';
import { DollarSign, ShoppingCart, UserCheck, Activity } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then(res => res.json())
      .then(setData);
  }, []);

  if (!data) return <div className="p-8 text-center text-slate-500">Yuklanmoqda...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Boshqaruv Paneli</h1>
        <p className="text-slate-500 text-sm">Bugungi real-time analitika</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg shadow-blue-200">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-white/20 rounded-lg"><DollarSign className="w-5 h-5" /></div>
          </div>
          <p className="text-blue-100 text-xs font-medium">Umumiy Tushum</p>
          <h3 className="text-lg font-bold truncate">{(data.totalRevenue).toLocaleString()} so'm</h3>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 text-white shadow-lg shadow-emerald-200">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-white/20 rounded-lg"><ShoppingCart className="w-5 h-5" /></div>
          </div>
          <p className="text-emerald-100 text-xs font-medium">Sotuvlar Soni</p>
          <h3 className="text-2xl font-bold">{data.salesCount} ta</h3>
        </div>
        
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-4 text-white shadow-lg shadow-amber-200 col-span-2">
           <div className="flex justify-between items-center">
             <div>
               <p className="text-amber-100 text-xs font-medium mb-1">To'lov Turlari</p>
               <div className="flex gap-4 text-sm font-semibold">
                 <span>Naqd: {(data.breakdown.cash/1000000).toFixed(1)}M</span>
                 <span>Karta: {(data.breakdown.card/1000000).toFixed(1)}M</span>
                 <span>Muddatli: {(data.breakdown.installment/1000000).toFixed(1)}M</span>
               </div>
             </div>
             <div className="p-2 bg-white/20 rounded-lg"><Activity className="w-6 h-6" /></div>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-500" />
            Bugungi Davomat
          </h2>
          <Link href="/admin/attendance" className="text-xs text-blue-600 font-medium">Barchasi</Link>
        </div>
        <div className="flex justify-around text-center">
           <div>
             <p className="text-2xl font-bold text-slate-800">{data.attendance.total}</p>
             <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Kelganlar</p>
           </div>
           <div>
             <p className="text-2xl font-bold text-emerald-500">{data.attendance.onTime}</p>
             <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Vaqtida</p>
           </div>
           <div>
             <p className="text-2xl font-bold text-rose-500">{data.attendance.late}</p>
             <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Kechikkan</p>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <h2 className="font-semibold text-slate-800 mb-4">So'nggi Sotuvlar</h2>
        <div className="space-y-4">
          {data.recentSales.length === 0 && <p className="text-sm text-slate-500 text-center">Hozircha sotuvlar yo'q</p>}
          {data.recentSales.map((sale: any) => (
            <div key={sale.id} className="flex justify-between items-center border-b border-slate-50 pb-3 last:border-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-slate-800">{sale.itemName}</p>
                <p className="text-xs text-slate-500">{sale.user.name} • {new Date(sale.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-600">{(sale.price).toLocaleString()}</p>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                  {sale.paymentMethod}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
