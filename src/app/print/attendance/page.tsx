'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Printer } from 'lucide-react';

function PrintAttendanceContent() {
  const [data, setData] = useState<any>(null);
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date');
  const monthParam = searchParams.get('month');

  useEffect(() => {
    let url = '/api/admin/attendance';
    if (monthParam) url += `?month=${monthParam}`;
    else if (dateParam) url += `?date=${dateParam}`;
    
    fetch(url)
      .then(res => res.json())
      .then(setData);
  }, [dateParam, monthParam]);

  if (!data) {
    return <div className="p-10 text-center font-bold">Yuklanmoqda...</div>;
  }

  const printDate = monthParam 
    ? new Date(monthParam + '-01').toLocaleDateString('uz-UZ', { month: 'long', year: 'numeric' })
    : dateParam 
      ? new Date(dateParam).toLocaleDateString('uz-UZ') 
      : new Date().toLocaleDateString('uz-UZ');

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 shadow-lg min-h-[1056px] print:shadow-none print:m-0 print:p-0">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b-2 border-gray-800 pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 uppercase tracking-wider">Moderno Mebel</h1>
            <p className="text-gray-500 mt-1">Rasmiy Davomat Hisoboti</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-600">Sana: <span className="text-gray-900">{printDate}</span></p>
            <p className="text-sm font-bold text-gray-600">Xodimlar soni: <span className="text-gray-900">{data.attendance.length}</span></p>
          </div>
        </div>

        {/* Content */}
        <div className="mb-8">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 print:bg-gray-200">
                <th className="p-3 border border-gray-300 font-bold text-gray-800">№</th>
                {monthParam && <th className="p-3 border border-gray-300 font-bold text-gray-800">Sana</th>}
                <th className="p-3 border border-gray-300 font-bold text-gray-800">Xodim Ismi</th>
                <th className="p-3 border border-gray-300 font-bold text-gray-800">Kelgan Vaqti</th>
                <th className="p-3 border border-gray-300 font-bold text-gray-800">Ketgan Vaqti</th>
                <th className="p-3 border border-gray-300 font-bold text-gray-800">Holat</th>
              </tr>
            </thead>
            <tbody>
              {data.attendance.map((att: any, index: number) => {
                let statusText = 'Kelmagan';
                let statusColor = 'text-red-600';
                
                if (att.status === 'ON_TIME') {
                  statusText = 'Vaqtida';
                  statusColor = 'text-green-600';
                } else if (att.status === 'LATE') {
                  statusText = `Kechikkan (${att.lateMinutes} daq)`;
                  statusColor = 'text-yellow-600';
                }

                const formatTime = (isoString: string | null) => {
                  if (!isoString) return '--:--';
                  return new Date(isoString).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
                };

                return (
                  <tr key={att.id} className="hover:bg-gray-50 print:break-inside-avoid">
                    <td className="p-3 border border-gray-300 text-gray-600 text-sm font-medium">{index + 1}</td>
                    {monthParam && <td className="p-3 border border-gray-300 text-gray-700 font-medium whitespace-nowrap">{new Date(att.date).toLocaleDateString('uz-UZ')}</td>}
                    <td className="p-3 border border-gray-300 font-bold text-gray-800">{att.user?.name || 'Noma\'lum'}</td>
                    <td className="p-3 border border-gray-300 text-gray-700">{formatTime(att.checkInTime)}</td>
                    <td className="p-3 border border-gray-300 text-gray-700">{formatTime(att.checkOutTime)}</td>
                    <td className={`p-3 border border-gray-300 font-bold ${statusColor}`}>
                      {statusText}
                    </td>
                  </tr>
                );
              })}
              {data.attendance.length === 0 && (
                <tr>
                  <td colSpan={monthParam ? 6 : 5} className="p-4 text-center text-gray-500 italic">Ma'lumot topilmadi</td>
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

export default function PrintAttendancePage() {
  return (
    <Suspense fallback={<div className="p-10 text-center font-bold">Yuklanmoqda...</div>}>
      <PrintAttendanceContent />
    </Suspense>
  );
}
