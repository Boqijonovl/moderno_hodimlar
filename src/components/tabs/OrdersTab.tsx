'use client';

import { useState, useEffect } from 'react';
import { PackageSearch, Clock, PlayCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTranslation, Language } from '@/lib/i18n';

export default function OrdersTab({ user, WebApp }: { user: any, WebApp: any }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const t = useTranslation(user?.language as Language);

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/orders?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, userId: user.id })
      });
      if (res.ok) {
        fetchOrders();
        if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('success');
      } else {
        const err = await res.json();
        alert(err.error || "Xatolik yuz berdi");
        if (WebApp?.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('error');
      }
    } catch (e) {
      alert("Tarmoq xatosi");
    }
  };

  const isOverdue = (date: string) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    const deadline = new Date(date);
    deadline.setHours(0,0,0,0);
    return deadline < today;
  };

  const isToday = (date: string) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    const deadline = new Date(date);
    deadline.setHours(0,0,0,0);
    return deadline.getTime() === today.getTime();
  };

  if (loading) {
    return <div className="flex justify-center p-10"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
          <PackageSearch className="w-6 h-6 text-blue-600 dark:text-blue-500" />
          Mening Buyurtmalarim
        </h2>

        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-10 text-slate-500 flex flex-col items-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-2 opacity-50" />
              <p>Sizda hozircha aktiv buyurtmalar yo'q.</p>
            </div>
          ) : (
            orders.map(order => (
              <div key={order.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{order.name}</h3>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      order.status === 'PENDING' ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300' :
                      order.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' :
                      'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400'
                    }`}>
                      {order.status === 'PENDING' ? 'Kutilmoqda' : order.status === 'IN_PROGRESS' ? 'Jarayonda' : 'Tayyor'}
                    </span>
                  </div>
                  
                  {order.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      {order.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs font-medium mt-3">
                    {order.deadline ? (
                      <div className={`flex items-center gap-1 ${isOverdue(order.deadline) ? 'text-rose-500' : isToday(order.deadline) ? 'text-amber-500' : 'text-slate-500'}`}>
                        {isOverdue(order.deadline) || isToday(order.deadline) ? <AlertCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                        Muddat: {new Date(order.deadline).toLocaleDateString('uz-UZ')}
                      </div>
                    ) : (
                      <div className="text-slate-500">Muddat belgilanmagan</div>
                    )}
                  </div>
                  
                  {order.creatorId === user.id && order.assignedToId !== user.id && (
                    <div className="mt-2 text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg inline-block">
                      👷‍♂️ Usta: {order.assignedTo?.name || 'Biriktirilmagan'}
                    </div>
                  )}
                </div>

                {order.status !== 'COMPLETED' && order.assignedToId === user.id && (
                  <div className="bg-white dark:bg-slate-900/50 p-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                    {order.status === 'PENDING' && (
                      <button 
                        onClick={() => updateStatus(order.id, 'IN_PROGRESS')}
                        className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm font-bold active:scale-95 transition-transform flex items-center justify-center gap-2"
                      >
                        <PlayCircle className="w-4 h-4" /> Boshlash
                      </button>
                    )}
                    {order.status === 'IN_PROGRESS' && (
                      <button 
                        onClick={() => updateStatus(order.id, 'COMPLETED')}
                        className="flex-1 bg-emerald-500 text-white py-2 rounded-xl text-sm font-bold active:scale-95 transition-transform flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Tayyor
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
