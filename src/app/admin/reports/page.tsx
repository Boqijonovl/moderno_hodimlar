'use client';

import { useState, useEffect } from 'react';
import { Calendar, FileText, Printer } from 'lucide-react';

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData(selectedMonth);
  }, [selectedMonth]);

  const fetchData = async (month: string) => {
    setLoading(true);
    try {
      const url = month ? `/api/admin/reports?month=${month}` : '/api/admin/reports';
      const res = await fetch(url);
      if (res.ok) {
        const result = await res.json();
        setData(result);
        if (!selectedMonth && result.availableMonths.length > 0) {
          setSelectedMonth(result.availableMonths[0]);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const printReport = () => {
    if (!data || data.monthly.length === 0) return alert("Ma'lumot yo'q");
    const url = `${window.location.origin}/print/reports?month=${selectedMonth}`;
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.openLink) {
      (window as any).Telegram.WebApp.openLink(url);
    } else {
      window.open(url, '_blank');
    }
  };

  if (!data && loading) return <div className="p-8 text-center text-slate-500">Yuklanmoqda...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Hisobotlar</h1>
          <p className="text-slate-500 text-sm">Kunlik va oylik natijalar</p>
        </div>
        <div className="flex gap-2">
          {data && (
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {data.availableMonths.map((m: string) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          )}
          <button 
            onClick={printReport}
            className="bg-blue-600 text-white p-2 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm active:scale-95"
          >
            <Printer className="w-5 h-5" />
            <span className="text-sm font-medium hidden sm:inline">Chop etish</span>
          </button>
        </div>
      </div>

      {loading && <div className="text-center text-slate-500 py-4">Yangilanmoqda...</div>}

      {!loading && data && (
        <>
          {/* Oylik Yakuniy Hisobot */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              <h2 className="font-semibold text-slate-800">Oy Yakuni: {selectedMonth}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500 font-semibold">
                    <th className="p-3">Xodim</th>
                    <th className="p-3 text-center">Kunlar</th>
                    <th className="p-3 text-center">Kechikish/Overtaym</th>
                    <th className="p-3 text-center">Sotuv Soni</th>
                    <th className="p-3 text-right">Jami Savdo</th>
                    <th className="p-3 text-right text-rose-500">Xarajat</th>
                    <th className="p-3 text-right text-blue-600">Sof Daromad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.monthly.length === 0 && (
                    <tr><td colSpan={5} className="p-6 text-center text-slate-500">Bu oyda ma'lumot yo'q</td></tr>
                  )}
                  {data.monthly.map((m: any) => (
                    <tr key={m.user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-medium text-slate-800">{m.user.name}</td>
                      <td className="p-3 text-center text-slate-600">{m.totalDaysPresent} kun</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          m.totalLateMinutes > 0 ? 'bg-amber-100 text-amber-700' : 
                          m.totalLateMinutes < 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {m.totalLateMinutes > 0 ? `${m.totalLateMinutes} daq kech` : 
                           m.totalLateMinutes < 0 ? `${Math.abs(m.totalLateMinutes)} daq ortiqcha` : '0'}
                        </span>
                      </td>
                      <td className="p-3 text-center text-slate-600">{m.totalSalesCount}</td>
                      <td className="p-3 text-right font-bold text-emerald-600">{(m.totalSales).toLocaleString()}</td>
                      <td className="p-3 text-right font-bold text-rose-500">{m.totalExpenses > 0 ? `-${(m.totalExpenses).toLocaleString()}` : '0'}</td>
                      <td className="p-3 text-right font-black text-blue-600">{(m.totalSales - m.totalExpenses).toLocaleString()} so'm</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Kunlik Hisobotlar */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mt-6">
              <FileText className="w-5 h-5 text-blue-500" />
              Kunlik Hisobotlar
            </h2>
            
            {Object.keys(data.daily).length === 0 && (
              <p className="text-center text-slate-500 py-8">Bu oyda hech qanday harakat bo'lmagan</p>
            )}

            {Object.keys(data.daily).map(dateStr => (
              <div key={dateStr} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-3 border-b border-slate-100 bg-blue-50/50">
                  <h3 className="font-bold text-blue-800">{new Date(dateStr).toLocaleDateString('uz-UZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase text-slate-500 font-semibold">
                        <th className="p-2 pl-3">Xodim</th>
                        <th className="p-2 text-center">Keldi</th>
                        <th className="p-2 text-center">Ketdi</th>
                        <th className="p-2 text-center">Holat</th>
                        <th className="p-2 text-right">Savdo</th>
                        <th className="p-2 text-right pr-3">Xarajat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-sm">
                      {data.daily[dateStr].map((d: any) => (
                        <tr key={d.user.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2 pl-3 font-medium text-slate-800">{d.user.name}</td>
                          <td className="p-2 text-center text-slate-600">{d.attendance?.checkInTime ? new Date(d.attendance.checkInTime).toLocaleTimeString('uz-UZ', {hour:'2-digit', minute:'2-digit'}) : '-'}</td>
                          <td className="p-2 text-center text-slate-600">{d.attendance?.checkOutTime ? new Date(d.attendance.checkOutTime).toLocaleTimeString('uz-UZ', {hour:'2-digit', minute:'2-digit'}) : '-'}</td>
                          <td className="p-2 text-center">
                            {d.attendance ? (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                                d.attendance.status === 'ON_TIME' ? 'bg-emerald-50 text-emerald-600' : 
                                d.attendance.status === 'LATE' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                              }`}>
                                {d.attendance.status === 'ON_TIME' ? 'Vaqtida' : d.attendance.status === 'LATE' ? 'Kechikkan' : 'Kelmagan'}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">Kelmagan</span>
                            )}
                          </td>
                          <td className="p-2 text-right font-bold text-emerald-600">
                            {d.salesTotal > 0 ? `${(d.salesTotal).toLocaleString()}` : '-'}
                          </td>
                          <td className="p-2 text-right pr-3 font-bold text-rose-500">
                            {d.expensesTotal > 0 ? `-${(d.expensesTotal).toLocaleString()}` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
