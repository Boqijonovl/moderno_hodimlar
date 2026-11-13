'use client';

import { useState, useEffect } from 'react';
import { Clock, Package, Wallet, Settings as SettingsIcon, Wrench } from 'lucide-react';
import AttendanceTab from '@/components/tabs/AttendanceTab';
import SalesTab from '@/components/tabs/SalesTab';
import ExpensesTab from '@/components/tabs/ExpensesTab';
import SettingsTab from '@/components/tabs/SettingsTab';
import ZapchasSection from '@/components/ZapchasSection';
import AppLoadingVideo from '@/components/AppLoadingVideo';
import { useTranslation, Language } from '@/lib/i18n';
import { motion, AnimatePresence } from 'framer-motion';

export default function MainApp() {
  const [activeTab, setActiveTab] = useState<'attendance' | 'sales' | 'expenses' | 'zapchas' | 'settings'>('attendance');
  const [user, setUser] = useState<any>(null);
  const [WebApp, setWebApp] = useState<any>(null);
  const [splashFinished, setSplashFinished] = useState(false);

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
        
        // Handle dark mode
        if (wa.colorScheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        
        wa.onEvent('themeChanged', () => {
          if (wa.colorScheme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        });

        const tgUser = wa.initDataUnsafe?.user;
        if (tgUser) {
          const telegramId = tgUser.id.toString();
          const fallbackName = tgUser.first_name + (tgUser.last_name ? ` ${tgUser.last_name}` : '');
          fetchUser(telegramId, fallbackName);
          wa.expand();
        } else {
          // Block browser access
          setUser({ blocked_by_browser: true });
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

  // Wait for 10-second intro video to end and user to be loaded
  if (!splashFinished || !user) {
    return (
      <AppLoadingVideo
        message="Ilova ishga tushirilmoqda..."
        canSkip={Boolean(user)}
        onComplete={() => {
          setSplashFinished(true);
        }}
      />
    );
  }

  // Block browser access
  if (user.blocked_by_browser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
          <svg className="w-12 h-12 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </div>
        <h1 className="text-2xl font-black text-slate-800 mb-2">Telegram orqali kiring</h1>
        <p className="text-slate-500 font-medium max-w-xs leading-relaxed">
          Ushbu tizim xavfsizlik maqsadida faqat Telegram bot orqali ishlashga mo'ljallangan.
        </p>
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
  const showExpenses = user.canUseExpenses !== false;
  const showZapchas = user.role === 'ADMIN' || user.canManageZapchas === true || user.canUseZapchas !== false;
  
  let currentTab = activeTab;
  if (!showAttendance && currentTab === 'attendance') {
    currentTab = showSales ? 'sales' : showExpenses ? 'expenses' : showZapchas ? 'zapchas' : 'settings';
  } else if (!showSales && currentTab === 'sales') {
    currentTab = showAttendance ? 'attendance' : showExpenses ? 'expenses' : showZapchas ? 'zapchas' : 'settings';
  } else if (!showExpenses && currentTab === 'expenses') {
    currentTab = showAttendance ? 'attendance' : showSales ? 'sales' : showZapchas ? 'zapchas' : 'settings';
  } else if (!showZapchas && currentTab === 'zapchas') {
    currentTab = showAttendance ? 'attendance' : showSales ? 'sales' : showExpenses ? 'expenses' : 'settings';
  }

  return (
    <main className="min-h-screen bg-slate-50/50 dark:bg-slate-950 flex flex-col pb-[80px] font-sans">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-800 dark:to-indigo-900 text-white p-6 shadow-lg rounded-b-3xl shrink-0 z-10 relative">
        <h1 className="text-2xl font-bold tracking-tight">Moderno Mebel</h1>
        <p className="text-blue-100 dark:text-blue-200 mt-1 font-medium">
          {currentTab === 'attendance'
            ? t('menu_attendance')
            : currentTab === 'sales'
              ? t('menu_sales')
              : currentTab === 'expenses'
                ? t('menu_expenses')
                : currentTab === 'zapchas'
                  ? t('menu_zapchas')
                  : t('menu_settings')}
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
            {currentTab === 'expenses' && showExpenses && <ExpensesTab user={user} WebApp={WebApp} />}
            {currentTab === 'zapchas' && showZapchas && <ZapchasSection user={user} WebApp={WebApp} viewScope="app" />}
            {currentTab === 'settings' && <SettingsTab user={user} onUserUpdate={handleUserUpdate} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200/50 dark:border-slate-800/50 flex justify-around px-1 py-2.5 pb-safe z-50">
        {showAttendance && (
          <button 
            onClick={() => setActiveTab('attendance')}
            className={`flex flex-col items-center justify-center transition-all duration-300 flex-1 min-w-0 px-0.5 ${currentTab === 'attendance' ? 'text-blue-600 dark:text-blue-400 scale-105' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
          >
            <Clock className={`w-5 h-5 sm:w-6 sm:h-6 mb-1 ${currentTab === 'attendance' ? 'fill-blue-50 dark:fill-blue-900' : ''}`} />
            <span className="text-[10px] font-bold truncate max-w-full">{t('menu_attendance')}</span>
          </button>
        )}
        
        {showSales && (
          <button 
            onClick={() => setActiveTab('sales')}
            className={`flex flex-col items-center justify-center transition-all duration-300 flex-1 min-w-0 px-0.5 ${currentTab === 'sales' ? 'text-blue-600 dark:text-blue-400 scale-105' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
          >
            <Package className={`w-5 h-5 sm:w-6 sm:h-6 mb-1 ${currentTab === 'sales' ? 'fill-blue-50 dark:fill-blue-900' : ''}`} />
            <span className="text-[10px] font-bold truncate max-w-full">{t('menu_sales')}</span>
          </button>
        )}

        {showExpenses && (
          <button 
            onClick={() => setActiveTab('expenses')}
            className={`flex flex-col items-center justify-center transition-all duration-300 flex-1 min-w-0 px-0.5 ${currentTab === 'expenses' ? 'text-blue-600 dark:text-blue-400 scale-105' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
          >
            <Wallet className={`w-5 h-5 sm:w-6 sm:h-6 mb-1 ${currentTab === 'expenses' ? 'fill-blue-50 dark:fill-blue-900' : ''}`} />
            <span className="text-[10px] font-bold truncate max-w-full">{t('menu_expenses')}</span>
          </button>
        )}

        {showZapchas && (
          <button 
            onClick={() => setActiveTab('zapchas')}
            className={`flex flex-col items-center justify-center transition-all duration-300 flex-1 min-w-0 px-0.5 ${currentTab === 'zapchas' ? 'text-blue-600 dark:text-blue-400 scale-105' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
          >
            <Wrench className={`w-5 h-5 sm:w-6 sm:h-6 mb-1 ${currentTab === 'zapchas' ? 'fill-blue-50 dark:fill-blue-900' : ''}`} />
            <span className="text-[10px] font-bold truncate max-w-full">{t('menu_zapchas')}</span>
          </button>
        )}

        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center justify-center transition-all duration-300 flex-1 min-w-0 px-0.5 ${currentTab === 'settings' ? 'text-blue-600 dark:text-blue-400 scale-105' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
        >
          <SettingsIcon className={`w-5 h-5 sm:w-6 sm:h-6 mb-1 ${currentTab === 'settings' ? 'fill-blue-50 dark:fill-blue-900' : ''}`} />
          <span className="text-[10px] font-bold truncate max-w-full">{t('menu_settings')}</span>
        </button>
      </div>
    </main>
  );
}
