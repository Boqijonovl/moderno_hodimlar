'use client';

import { useState, useEffect } from 'react';
import { Clock, Package, Settings as SettingsIcon } from 'lucide-react';
import AttendanceTab from '@/components/tabs/AttendanceTab';
import SalesTab from '@/components/tabs/SalesTab';
import SettingsTab from '@/components/tabs/SettingsTab';
import { useTranslation, Language } from '@/lib/i18n';
import { motion, AnimatePresence } from 'framer-motion';

export default function MainApp() {
  const [activeTab, setActiveTab] = useState<'attendance' | 'sales' | 'settings'>('attendance');
  const [user, setUser] = useState<any>(null);
  const [WebApp, setWebApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async (telegramId: string, fallbackName: string) => {
    try {
      const res = await fetch(`/api/me?telegramId=${telegramId}`);
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        // Fallback user state
        setUser({ telegramId, name: fallbackName, role: 'EMPLOYEE', language: 'uz' });
      }
    } catch (e) {
      console.error(e);
      setUser({ telegramId, name: fallbackName, role: 'EMPLOYEE', language: 'uz' });
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('@twa-dev/sdk').then((mod) => {
        const wa = mod.default;
        setWebApp(wa);
        
        const tgUser = wa.initDataUnsafe?.user;
        if (tgUser) {
          const telegramId = tgUser.id.toString();
          const fallbackName = tgUser.first_name + (tgUser.last_name ? ` ${tgUser.last_name}` : '');
          fetchUser(telegramId, fallbackName);
          wa.expand();
        } else {
          // Mock data for browser testing
          fetchUser('1037362053', 'Test User'); 
        }
      });
    }
  }, []);

  // Update user callback when name changes in settings
  const handleUserUpdate = () => {
    if (user?.telegramId) {
      fetchUser(user.telegramId, user.name);
    }
  };

  const t = useTranslation(user?.language as Language);

  // Wait for user to be loaded
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  // Check active status
  if (user && user.active === false) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mb-4"
        >
          <SettingsIcon className="w-10 h-10 text-rose-500" />
        </motion.div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">{t('blocked_title')}</h1>
        <p className="text-slate-500">
          {t('blocked_desc')}
        </p>
      </div>
    );
  }

  // Handle active tab permissions
  const showAttendance = user.canUseAttendance !== false;
  const showSales = user.canUseSales !== false;
  
  let currentTab = activeTab;
  if (!showAttendance && currentTab === 'attendance') {
    currentTab = showSales ? 'sales' : 'settings';
  } else if (!showSales && currentTab === 'sales') {
    currentTab = showAttendance ? 'attendance' : 'settings';
  }

  return (
    <main className="min-h-screen bg-slate-50/50 flex flex-col pb-[80px] font-sans">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 shadow-lg rounded-b-3xl shrink-0 z-10 relative">
        <h1 className="text-2xl font-bold tracking-tight">Moderno Mebel</h1>
        <p className="text-blue-100 mt-1 font-medium">
          {currentTab === 'attendance' ? t('menu_attendance') : currentTab === 'sales' ? t('menu_sales') : t('menu_settings')}
        </p>
      </div>

      <div className="flex-1 overflow-x-hidden overflow-y-auto p-4 relative z-0 mt-[-20px] pt-[40px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {currentTab === 'attendance' && showAttendance && <AttendanceTab user={user} WebApp={WebApp} />}
            {currentTab === 'sales' && showSales && <SalesTab user={user} WebApp={WebApp} />}
            {currentTab === 'settings' && <SettingsTab user={user} onUserUpdate={handleUserUpdate} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200/50 flex justify-around p-3 pb-safe z-50">
        {showAttendance && (
          <button 
            onClick={() => setActiveTab('attendance')}
            className={`flex flex-col items-center transition-all duration-300 w-20 ${currentTab === 'attendance' ? 'text-blue-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Clock className={`w-6 h-6 mb-1 ${currentTab === 'attendance' ? 'fill-blue-50' : ''}`} />
            <span className="text-[10px] font-bold">{t('menu_attendance')}</span>
          </button>
        )}
        
        {showSales && (
          <button 
            onClick={() => setActiveTab('sales')}
            className={`flex flex-col items-center transition-all duration-300 w-20 ${currentTab === 'sales' ? 'text-blue-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Package className={`w-6 h-6 mb-1 ${currentTab === 'sales' ? 'fill-blue-50' : ''}`} />
            <span className="text-[10px] font-bold">{t('menu_sales')}</span>
          </button>
        )}

        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center transition-all duration-300 w-20 ${currentTab === 'settings' ? 'text-blue-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <SettingsIcon className={`w-6 h-6 mb-1 ${currentTab === 'settings' ? 'fill-blue-50' : ''}`} />
          <span className="text-[10px] font-bold">{t('menu_settings')}</span>
        </button>
      </div>
    </main>
  );
}
