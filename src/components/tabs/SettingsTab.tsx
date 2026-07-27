'use client';

import { useState } from 'react';
import { User, Settings, Globe, Palette, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useTranslation, Language } from '@/lib/i18n';

export default function SettingsTab({ user, onUserUpdate }: { user: any, onUserUpdate: () => void }) {
  const [name, setName] = useState(user?.name || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const t = useTranslation(user?.language as Language);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/me?telegramId=${user?.telegramId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        setMessage(t('success_save'));
        onUserUpdate();
      } else {
        setMessage('Error');
      }
    } catch (e) {
      setMessage('Error');
    }
    setLoading(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleLanguageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    try {
      const res = await fetch(`/api/me?telegramId=${user?.telegramId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: newLang })
      });
      if (res.ok) {
        onUserUpdate();
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      
      {/* Admin Panel Button */}
      {user?.role === 'ADMIN' && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-6 shadow-md text-white">
          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert className="w-8 h-8 text-blue-200" />
            <h2 className="text-xl font-bold">{t('admin_panel')}</h2>
          </div>
          <p className="text-blue-100 text-sm mb-4">
            {t('admin_panel_desc')}
          </p>
          <Link href="/admin" className="inline-flex items-center justify-center w-full bg-white text-blue-600 hover:bg-blue-50 font-bold rounded-xl p-3 transition-colors">
            {t('go_to_panel')}
          </Link>
        </div>
      )}

      {/* Profile Settings */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <User className="w-6 h-6 text-blue-600" />
          {t('personal_info')}
        </h2>
        
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('name')}</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              required
            />
          </div>

          {message && (
            <p className="text-sm font-medium text-emerald-600">{message}</p>
          )}

          <button 
            type="submit" 
            disabled={loading || name === user?.name}
            className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white rounded-xl p-3 font-medium transition-all"
          >
            {loading ? t('saving') : t('save')}
          </button>
        </form>
      </div>

      {/* App Settings */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-600" />
          {t('app_settings')}
        </h2>
        
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-slate-500" />
            <span className="text-slate-700 font-medium text-sm">{t('system_lang')}</span>
          </div>
          <select 
            value={user?.language || 'uz'} 
            onChange={handleLanguageChange}
            className="bg-transparent text-sm font-medium outline-none text-blue-600"
          >
            <option value="uz">O'zbekcha</option>
            <option value="ru">Русский</option>
          </select>
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-center gap-3">
            <Palette className="w-5 h-5 text-slate-500" />
            <span className="text-slate-700 font-medium text-sm">{t('theme')}</span>
          </div>
          <select className="bg-transparent text-sm font-medium outline-none text-blue-600">
            <option value="light">{t('light')}</option>
            <option value="dark">{t('dark')}</option>
          </select>
        </div>
      </div>
    </div>
  );
}
