'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, Package, User, Settings, Trash2 } from 'lucide-react';

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

  const deleteAttendance = async (id: string) => {
    if (!confirm("Haqiqatan ham ushbu davomatni o'chirasizmi?")) return;
    try {
      const res = await fetch(`/api/admin/attendance/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAttendances(prev => prev.filter(a => a.id !== id));
      } else {
        alert("O'chirishda xatolik yuz berdi");
      }
    } catch (e) {
      console.error(e);
      alert('Tarmoq xatosi');
    }
  };

  const deleteSale = async (id: string) => {
    if (!confirm("Haqiqatan ham ushbu savdoni o'chirasizmi?")) return;
    try {
      const res = await fetch(`/api/admin/sales/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSales(prev => prev.filter(s => s.id !== id));
      } else {
        alert("O'chirishda xatolik yuz berdi");
      }
    } catch (e) {
      console.error(e);
      alert('Tarmoq xatosi');
    }
  };

  const toggleSetting = async (field: string, value: any) => {
    try {
      // Optimistic update
      setUser((prev: any) => ({ ...prev, [field]: value }));
      
      await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
    } catch (e) {
      // Revert on error
      fetchData();
    }
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
          <Settings className="w-5 h-5 text-blue-600" />
          Foydalanuvchi Sozlamalari
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <div>
              <div className="font-semibold text-slate-800 text-sm">Aktiv (Bloklanmagan)</div>
              <div className="text-xs text-slate-500">Tizimga kira oladimi?</div>
            </div>
            <button 
              onClick={() => toggleSetting('active', !user.active)}
              className={`w-12 h-6 rounded-full transition-colors relative ${user.active ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${user.active ? 'left-6.5 right-0.5' : 'left-0.5'}`} style={{ transform: user.active ? 'translateX(24px)' : 'translateX(0)' }}></div>
            </button>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <div>
              <div className="font-semibold text-slate-800 text-sm">Admin ruxsati</div>
              <div className="text-xs text-slate-500">Admin panelni ko'radimi?</div>
            </div>
            <button 
              onClick={() => toggleSetting('role', user.role === 'ADMIN' ? 'EMPLOYEE' : 'ADMIN')}
              className={`w-12 h-6 rounded-full transition-colors relative ${user.role === 'ADMIN' ? 'bg-blue-500' : 'bg-slate-300'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${user.role === 'ADMIN' ? 'left-6.5 right-0.5' : 'left-0.5'}`} style={{ transform: user.role === 'ADMIN' ? 'translateX(24px)' : 'translateX(0)' }}></div>
            </button>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <div>
              <div className="font-semibold text-slate-800 text-sm">Davomat bo'limi</div>
              <div className="text-xs text-slate-500">1-bo'limga ruxsat</div>
            </div>
            <button 
              onClick={() => toggleSetting('canUseAttendance', !user.canUseAttendance)}
              className={`w-12 h-6 rounded-full transition-colors relative ${user.canUseAttendance ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${user.canUseAttendance ? 'left-6.5 right-0.5' : 'left-0.5'}`} style={{ transform: user.canUseAttendance ? 'translateX(24px)' : 'translateX(0)' }}></div>
            </button>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <div>
              <div className="font-semibold text-slate-800 text-sm">Savdolar bo'limi</div>
              <div className="text-xs text-slate-500">2-bo'limga ruxsat</div>
            </div>
            <button 
              onClick={() => toggleSetting('canUseSales', !user.canUseSales)}
              className={`w-12 h-6 rounded-full transition-colors relative ${user.canUseSales ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${user.canUseSales ? 'left-6.5 right-0.5' : 'left-0.5'}`} style={{ transform: user.canUseSales ? 'translateX(24px)' : 'translateX(0)' }}></div>
            </button>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl space-y-3">
            <div className="font-semibold text-slate-800 text-sm border-b border-slate-200 pb-2">Ish vaqti grafigi</div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">Ish boshlash vaqti</div>
              <input 
                type="time" 
                value={user.workStartTime || '09:00'}
                onChange={(e) => toggleSetting('workStartTime', e.target.value)}
                className="p-1 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">Ish tugash vaqti</div>
              <input 
                type="time" 
                value={user.workEndTime || '18:00'}
                onChange={(e) => toggleSetting('workEndTime', e.target.value)}
                className="p-1 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
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
                <div className="flex items-center gap-3">
                  <div className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                    record.status === 'ON_TIME' ? 'bg-emerald-100 text-emerald-700' :
                    record.status === 'LATE' ? 'bg-amber-100 text-amber-700' :
                    'bg-rose-100 text-rose-700'
                  }`}>
                    {record.status === 'ON_TIME' ? 'Vaqtida' : record.status === 'LATE' ? 'Kechikdi' : 'Kelmagan'}
                  </div>
                  <button onClick={() => deleteAttendance(record.id)} className="p-1.5 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
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
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-bold text-emerald-600 text-sm">${sale.price}</div>
                    <div className="text-[10px] text-slate-500 uppercase mt-1">
                      {sale.paymentMethod}
                    </div>
                  </div>
                  <button onClick={() => deleteSale(sale.id)} className="p-1.5 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
