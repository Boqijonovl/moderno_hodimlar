'use client';

import { useState, useEffect } from 'react';
import { LogIn, LogOut, Clock, Calendar } from 'lucide-react';

export default function AttendanceTab({ user, WebApp }: { user: any, WebApp: any }) {
  const [status, setStatus] = useState<'idle' | 'checked-in' | 'checked-out'>('idle');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const fetchHistory = async () => {
    if (!user?.telegramId) return;
    try {
      const res = await fetch(`/api/attendance/history?telegramId=${user.telegramId}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.attendances || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCheckIn = (reason?: string) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setMessage('Qurilmangizda GPS yo\'q yoki ruxsat etilmagan');
      return;
    }
    setLoading(true);
    setMessage('Geolokatsiya olinmoqda...');
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'check-in',
              telegramId: user?.telegramId,
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              name: user?.name,
              reason
            })
          });
          const data = await res.json();
          if (res.ok) {
            setStatus('checked-in');
            setMessage(`Ishga kelganingiz muvaffaqiyatli qayd etildi! (${data.status})`);
            if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('success');
            fetchHistory();
          } else if (res.status === 403 && data.needsReason) {
            // Prompt for reason
            const userReason = window.prompt(data.error);
            if (userReason && userReason.trim()) {
              handleCheckIn(userReason.trim());
            } else {
              setMessage('Izoh kiritilmadi, amaliyot bekor qilindi.');
              if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('error');
            }
          } else {
            setMessage(data.error || 'Xatolik yuz berdi');
            if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('error');
          }
        } catch (e: any) {
          setMessage(`Tarmoq xatosi: ${e.message || String(e)}`);
        }
        setLoading(false);
      },
      (error) => {
        setMessage('GPS ga ruxsat berilmagan yoki topilmadi');
        setLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleCheckOut = (reason?: string) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setMessage('Qurilmangizda GPS yo\'q yoki ruxsat etilmagan');
      return;
    }
    setLoading(true);
    setMessage('Geolokatsiya olinmoqda...');
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'check-out',
              telegramId: user?.telegramId,
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              reason
            })
          });
          const data = await res.json();
          if (res.ok) {
            setStatus('checked-out');
            setMessage('Ishingiz muvaffaqiyatli yakunlandi!');
            if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('success');
            fetchHistory();
          } else if (res.status === 403 && data.needsReason) {
            // Prompt for reason
            const userReason = window.prompt(data.error);
            if (userReason && userReason.trim()) {
              handleCheckOut(userReason.trim());
            } else {
              setMessage('Izoh kiritilmadi, amaliyot bekor qilindi.');
              if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('error');
            }
          } else {
            setMessage(data.error || 'Xatolik');
          }
        } catch (e: any) {
          setMessage(`Tarmoq xatosi: ${e.message || String(e)}`);
        }
        setLoading(false);
      },
      (error) => {
        // Allow check-out without GPS if needed by commenting out or handling differently
        // For now, require GPS to check location
        setMessage('GPS ga ruxsat berilmagan. Yakunlash uchun ruxsat kerak.');
        setLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Clock className="w-6 h-6 text-blue-600" />
          Davomatni belgilash
        </h2>
        
        {message && (
          <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-800 text-sm font-medium border border-blue-100">
            {message}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={handleCheckIn}
            disabled={status !== 'idle' || loading}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-2xl p-4 flex flex-col items-center gap-2 transition-all active:scale-95"
          >
            <LogIn className="w-8 h-8" />
            <span className="font-medium text-sm">Ishga keldim</span>
          </button>
          
          <button 
            onClick={handleCheckOut}
            disabled={status !== 'checked-in' || loading}
            className="bg-rose-500 hover:bg-rose-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-2xl p-4 flex flex-col items-center gap-2 transition-all active:scale-95"
          >
            <LogOut className="w-8 h-8" />
            <span className="font-medium text-sm">Yakunladim</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-blue-600" />
          Tarix
        </h2>
        
        <div className="space-y-3">
          {history.length === 0 ? (
            <p className="text-slate-500 text-center py-4 text-sm">Hali davomat qayd etilmagan.</p>
          ) : (
            history.map((record) => (
              <div key={record.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                <div>
                  <div className="font-semibold text-slate-800 text-sm">
                    {new Date(record.date).toLocaleDateString('uz-UZ')}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex gap-2">
                    <span>Kirish: {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString('uz-UZ', {hour: '2-digit', minute:'2-digit'}) : '--:--'}</span>
                    <span>|</span>
                    <span>Chiqish: {record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString('uz-UZ', {hour: '2-digit', minute:'2-digit'}) : '--:--'}</span>
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
    </div>
  );
}
