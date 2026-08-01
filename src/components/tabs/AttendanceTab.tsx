'use client';

import { useState, useEffect } from 'react';
import { LogIn, LogOut, Clock, Calendar } from 'lucide-react';
import { useTranslation, Language } from '@/lib/i18n';

export default function AttendanceTab({ user, WebApp }: { user: any, WebApp: any }) {
  const [status, setStatus] = useState<'idle' | 'checked-in' | 'checked-out'>('idle');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('');

  const t = useTranslation(user?.language as Language);

  useEffect(() => {
    fetchHistory();
  }, [user, selectedMonth]);

  const fetchHistory = async () => {
    if (!user?.telegramId) return;
    try {
      const url = `/api/attendance/history?telegramId=${user.telegramId}${selectedMonth ? `&month=${selectedMonth}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const records = data.attendances || [];
        setHistory(records);
        
        const today = new Date().toDateString();
        const openRecord = records.find((r: any) => !r.checkOutTime && new Date(r.date).toDateString() === today);
        
        if (openRecord) {
          setStatus('checked-in');
        } else {
          setStatus('idle');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCheckIn = (reason?: string) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setMessage(t('gps_error'));
      return;
    }
    setLoading(true);
    setMessage(t('getting_gps'));
    
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
            setMessage(`Muvaffaqiyatli! (${data.status})`);
            if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('success');
            fetchHistory();
          } else if (res.status === 403 && data.needsReason) {
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
          setMessage(`${t('network_error')}: ${e.message || String(e)}`);
        }
        setLoading(false);
      },
      (error) => {
        setMessage(t('gps_error'));
        setLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleCheckOut = (reason?: string) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setMessage(t('gps_error'));
      return;
    }
    setLoading(true);
    setMessage(t('getting_gps'));
    
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
            setMessage('Yakunlandi!');
            if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('success');
            fetchHistory();
          } else if (res.status === 403 && data.needsReason) {
            const userReason = window.prompt(data.error);
            if (userReason && userReason.trim()) {
              handleCheckOut(userReason.trim());
            } else {
              setMessage('Izoh kiritilmadi');
              if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('error');
            }
          } else {
            setMessage(data.error || 'Xatolik');
          }
        } catch (e: any) {
          setMessage(`${t('network_error')}: ${e.message || String(e)}`);
        }
        setLoading(false);
      },
      (error) => {
        setMessage(t('gps_error'));
        setLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">{t('attendance')}</h2>
        
        {message && (
          <div className={`p-3 rounded-xl mb-4 text-sm font-medium ${message.includes('Xatolik') || message.includes('error') ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => handleCheckIn()}
            disabled={status !== 'idle' || loading}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 text-white rounded-2xl p-4 flex flex-col items-center gap-2 transition-all active:scale-95"
          >
            <LogIn className="w-8 h-8" />
            <span className="font-medium text-sm">{t('check_in')}</span>
          </button>
          
          <button 
            onClick={() => handleCheckOut()}
            disabled={status !== 'checked-in' || loading}
            className="bg-rose-500 hover:bg-rose-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 text-white rounded-2xl p-4 flex flex-col items-center gap-2 transition-all active:scale-95"
          >
            <LogOut className="w-8 h-8" />
            <span className="font-medium text-sm">{t('check_out')}</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-500" />
            {t('history')}
          </h2>
          <div className="flex flex-col items-end gap-2">
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-semibold border-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            />
            {history.length > 0 && (
              <div className="text-right">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">{t('total_late')}</div>
                <div className="text-sm font-bold text-rose-500">
                  {(() => {
                    let totalLate = history.reduce((sum, r) => sum + (r.lateMinutes || 0), 0);
                    if (totalLate < 0) totalLate = 0;
                    if (totalLate === 0) return `0 ${t('minute')}`;
                    const h = Math.floor(totalLate / 60);
                    const m = totalLate % 60;
                    return h > 0 ? `${h} ${t('hour')} ${m} ${t('minute')}` : `${m} ${t('minute')}`;
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-3">
          {history.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-center py-4 text-sm">{t('no_attendance')}</p>
          ) : (
            history.map((record) => (
              <div key={record.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                    {new Date(record.date).toLocaleDateString('uz-UZ')}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex gap-2">
                    <span>{t('entry')}: {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString('uz-UZ', {hour: '2-digit', minute:'2-digit'}) : '--:--'}</span>
                    <span>|</span>
                    <span>{t('exit')}: {record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString('uz-UZ', {hour: '2-digit', minute:'2-digit'}) : '--:--'}</span>
                  </div>
                  {record.reason && (
                    <div className="text-[10px] text-slate-400 mt-1 italic">
                      {t('reason')}: {record.reason}
                    </div>
                  )}
                </div>
                <div className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                  record.status === 'ON_TIME' ? 'bg-emerald-100 text-emerald-700' :
                  record.status === 'LATE' ? 'bg-amber-100 text-amber-700' :
                  'bg-rose-100 text-rose-700'
                }`}>
                  {record.status === 'ON_TIME' ? t('on_time') : record.status === 'LATE' ? t('late') : t('absent')}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
