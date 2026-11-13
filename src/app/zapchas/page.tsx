'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Settings as SettingsIcon, Wrench } from 'lucide-react';
import ZapchasSection from '@/components/ZapchasSection';
import AppLoadingVideo from '@/components/AppLoadingVideo';
import { TelegramWebAppProp, ZapchasUserProp } from '@/components/zapchas/ZapchasTypes';

type PageUserState = (ZapchasUserProp & { blocked_by_browser?: false }) | { blocked_by_browser: true };

export default function ZapchasPage() {
  const [user, setUser] = useState<PageUserState | null>(null);
  const [WebApp, setWebApp] = useState<TelegramWebAppProp | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('@twa-dev/sdk')
        .then((mod) => {
          const wa = mod.default;
          setWebApp(wa);

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
            const fallbackName =
              tgUser.first_name + (tgUser.last_name ? ` ${tgUser.last_name}` : '');
            fetch(`/api/me?telegramId=${telegramId}`)
              .then(async (res) => {
                if (res.ok) {
                  const data = await res.json();
                  setUser(data.user);
                } else {
                  setUser({ telegramId, name: fallbackName, role: 'EMPLOYEE', active: true });
                }
              })
              .catch(() => {
                setUser({ telegramId, name: fallbackName, role: 'EMPLOYEE', active: true });
              });
            wa.expand();
          } else {
            setUser({ blocked_by_browser: true });
          }
        })
        .catch(() => {
          setUser({ blocked_by_browser: true });
        });
    }
  }, []);

  if (!user) {
    return <AppLoadingVideo message="Zapchas bo'limi yuklanmoqda..." />;
  }

  if (user.blocked_by_browser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
          <Wrench className="w-12 h-12 text-blue-600" />
        </div>
        <h1 className="text-2xl font-black text-slate-800 mb-2">Telegram orqali kiring</h1>
        <p className="text-slate-500 font-medium max-w-xs leading-relaxed">
          Ushbu tizim xavfsizlik maqsadida faqat Telegram bot orqali ishlashga mo&apos;ljallangan.
        </p>
      </div>
    );
  }

  if (user.active === false) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mb-4">
          <SettingsIcon className="w-10 h-10 text-rose-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Kirish Taqiqlangan</h1>
        <p className="text-slate-500">Sizning akkauntingiz admin tomonidan bloklangan.</p>
      </div>
    );
  }

  const canAccess =
    user.role === 'ADMIN' ||
    user.canManageZapchas === true ||
    user.canUseZapchas !== false;

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <p className="text-slate-600 dark:text-slate-300 font-semibold">
          Sizda Zapchas bo&apos;limidan foydalanish ruxsati yo&apos;q.
        </p>
        <Link
          href="/"
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold"
        >
          Asosiy ilovaga qaytish
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50/50 dark:bg-slate-950 flex flex-col font-sans">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-800 dark:to-indigo-900 text-white p-5 shadow-lg rounded-b-3xl flex items-center justify-between gap-3 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-2xl bg-white/20 hover:bg-white/30 transition-colors"
            title="Asosiy ilova"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Moderno Zapchas</h1>
            <p className="text-blue-100 text-xs font-medium">{user.name}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 max-w-3xl w-full mx-auto">
        <ZapchasSection user={user} WebApp={WebApp} viewScope="app" />
      </div>
    </main>
  );
}
