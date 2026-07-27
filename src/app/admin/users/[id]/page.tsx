'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, Package, User } from 'lucide-react';

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const telegramId = resolvedParams.id;
  
  const [user, setUser] = useState<any>(null);
  const [attendances, setAttendances] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [telegramId]);

  const fetchData = async () => {
    try {
      const [userRes, attRes, salesRes] = await Promise.all([
        fetch(`/api/me?telegramId=${telegramId}`),
        fetch(`/api/attendance/history?telegramId=${telegramId}`),
        fetch(`/api/sales/history?telegramId=${telegramId}`)
      ]);

      if (userRes.ok) {
        const u = await userRes.json();
        setUser(u.user);
      }
      if (attRes.ok) {
        const a = await attRes.json();
        setAttendances(a.attendances || []);
      }
      if (salesRes.ok) {
        const s = await salesRes.json();
        setSales(s.sales || []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <div className="p-4 text-center">Foydalanuvchi topilmadi</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <Link href="/admin/users" className="p-2 bg-white rounded-full shadow-sm">
          <ArrowLeft className="w-6 h-6 text-slate-700" />
        </Link>
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <User className="w-6 h-6" /> {user.name}
        </h1>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Davomat Tarixi
        </h2>
        
        <div className="space-y-3">
          {attendances.length === 0 ? (
            <p className="text-slate-500 text-sm">Davomat yo'q.</p>
          ) : (
            attendances.map((record) => (
              <div key={record.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                <div>
                  <div className="font-semibold text-slate-800 text-sm">
                    {new Date(record.date).toLocaleDateString('uz-UZ')}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    K: {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString('uz-UZ', {hour: '2-digit', minute:'2-digit'}) : '--:--'} | 
                    Ch: {record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString('uz-UZ', {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                  </div>
                  {record.reason && (
                    <div className="text-[10px] text-slate-400 mt-1 italic">
                      Izoh: {record.reason}
                    </div>
                  )}
                </div>
                <div className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                  record.status === 'ON_TIME' ? 'bg-emerald-100 text-emerald-700' :
                  record.status === 'LATE' ? 'bg-amber-100 text-amber-700' :
                  'bg-rose-100 text-rose-700'
                }`}>
                  {record.status === 'ON_TIME' ? 'Vaqtida' : record.status === 'LATE' ? 'Kechikdi' : 'Kelmagan'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-600" />
          Savdolar Tarixi
        </h2>
        
        <div className="space-y-3">
          {sales.length === 0 ? (
            <p className="text-slate-500 text-sm">Savdolar yo'q.</p>
          ) : (
            sales.map((sale) => (
              <div key={sale.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                <div>
                  <div className="font-semibold text-slate-800 text-sm">{sale.itemName}</div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    {new Date(sale.date).toLocaleDateString('uz-UZ')} {new Date(sale.date).toLocaleTimeString('uz-UZ', {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-600 text-sm">${sale.price}</div>
                  <div className="text-[10px] text-slate-500 uppercase mt-1">
                    {sale.paymentMethod}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
