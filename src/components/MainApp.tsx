'use client';

import { useState, useEffect } from 'react';
import { Clock, Package, Settings as SettingsIcon } from 'lucide-react';
import AttendanceTab from '@/components/tabs/AttendanceTab';
import SalesTab from '@/components/tabs/SalesTab';
import SettingsTab from '@/components/tabs/SettingsTab';

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
        setUser({ telegramId, name: fallbackName, role: 'EMPLOYEE' });
      }
    } catch (e) {
      console.error(e);
      setUser({ telegramId, name: fallbackName, role: 'EMPLOYEE' });
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

  // Wait for user to be loaded
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col pb-[80px]">
      <div className="bg-blue-600 text-white p-6 shadow-md rounded-b-3xl shrink-0 z-10 relative">
        <h1 className="text-2xl font-bold tracking-tight">Moderno Bot</h1>
        <p className="text-blue-100 mt-1">
          {activeTab === 'attendance' ? 'Davomat' : activeTab === 'sales' ? 'Savdolar' : 'Sozlamalar'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 relative z-0 mt-[-20px] pt-[40px]">
        {activeTab === 'attendance' && <AttendanceTab user={user} WebApp={WebApp} />}
        {activeTab === 'sales' && <SalesTab user={user} WebApp={WebApp} />}
        {activeTab === 'settings' && <SettingsTab user={user} onUserUpdate={handleUserUpdate} />}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-3 pb-safe z-50">
        <button 
          onClick={() => setActiveTab('attendance')}
          className={`flex flex-col items-center transition-colors w-20 ${activeTab === 'attendance' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Clock className={`w-6 h-6 mb-1 ${activeTab === 'attendance' ? 'fill-blue-50' : ''}`} />
          <span className="text-[10px] font-bold">Davomat</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('sales')}
          className={`flex flex-col items-center transition-colors w-20 ${activeTab === 'sales' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Package className={`w-6 h-6 mb-1 ${activeTab === 'sales' ? 'fill-blue-50' : ''}`} />
          <span className="text-[10px] font-bold">Savdolar</span>
        </button>

        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center transition-colors w-20 ${activeTab === 'settings' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <SettingsIcon className={`w-6 h-6 mb-1 ${activeTab === 'settings' ? 'fill-blue-50' : ''}`} />
          <span className="text-[10px] font-bold">Sozlamalar</span>
        </button>
      </div>
    </main>
  );
}
