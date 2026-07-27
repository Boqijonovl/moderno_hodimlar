'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Home, Users, BarChart3, Settings, Clock, ArrowLeft, Bell, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [newSale, setNewSale] = useState<any>(null);
  const lastCheckedRef = useRef<string>(new Date().toISOString());

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/sales');
        if (res.ok) {
          const sales = await res.json();
          if (sales.length > 0) {
            const latestSale = sales[0];
            if (new Date(latestSale.createdAt) > new Date(lastCheckedRef.current)) {
              setNewSale(latestSale);
              lastCheckedRef.current = latestSale.createdAt;
              // Auto hide toast after 5 seconds
              setTimeout(() => setNewSale(null), 5000);
            }
          }
        }
      } catch (e) {
        // ignore polling errors
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20 relative">
      <AnimatePresence>
        {newSale && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-20 left-4 right-4 z-50 bg-emerald-600 text-white p-4 rounded-2xl shadow-xl flex items-start gap-3"
          >
            <div className="p-2 bg-white/20 rounded-full shrink-0">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold">Yangi Savdo!</h3>
              <p className="text-sm opacity-90">{newSale.user?.name} tomonidan <b>{newSale.itemName}</b> sotildi.</p>
              <p className="font-bold mt-1">{(newSale.price).toLocaleString()} so'm</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex justify-between items-center shadow-sm sticky top-0 z-40">
        <div className="font-bold text-slate-800">Admin Panel</div>
        <Link href="/" className="flex items-center gap-1 text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Ilovaga qaytish
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {children}
      </div>
      
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 flex justify-around p-3 pb-safe z-50">
        <Link href="/admin" className="flex flex-col items-center text-slate-500 hover:text-blue-600 transition-colors">
          <Home className="w-6 h-6" />
          <span className="text-[10px] font-medium mt-1">Asosiy</span>
        </Link>
        <Link href="/admin/attendance" className="flex flex-col items-center text-slate-500 hover:text-blue-600 transition-colors">
          <Clock className="w-6 h-6" />
          <span className="text-[10px] font-medium mt-1">Davomat</span>
        </Link>
        <Link href="/admin/sales" className="flex flex-col items-center text-slate-500 hover:text-blue-600 transition-colors">
          <BarChart3 className="w-6 h-6" />
          <span className="text-[10px] font-medium mt-1">Savdolar</span>
        </Link>
        <Link href="/admin/users" className="flex flex-col items-center text-slate-500 hover:text-blue-600 transition-colors">
          <Users className="w-6 h-6" />
          <span className="text-[10px] font-medium mt-1">Xodimlar</span>
        </Link>
        <Link href="/admin/reports" className="flex flex-col items-center text-slate-500 hover:text-blue-600 transition-colors">
          <FileText className="w-6 h-6" />
          <span className="text-[10px] font-medium mt-1">Hisobotlar</span>
        </Link>
        <Link href="/admin/settings" className="flex flex-col items-center text-slate-500 hover:text-blue-600 transition-colors">
          <Settings className="w-6 h-6" />
          <span className="text-[10px] font-medium mt-1">Sozlamalar</span>
        </Link>
      </div>
    </div>
  );
}
