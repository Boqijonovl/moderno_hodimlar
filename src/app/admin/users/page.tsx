'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, ChevronRight } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-600" />
          Foydalanuvchilar (Xodimlar)
        </h2>
        
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between hover:bg-slate-100 transition-colors">
              <Link 
                href={`/admin/users/${user.telegramId}`}
                className="flex-1"
              >
                <div className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  {user.name} 
                  {user.role === 'ADMIN' && <span className="bg-rose-100 text-rose-700 text-[10px] px-2 py-0.5 rounded-full uppercase">Admin</span>}
                </div>
                <div className="text-sm text-slate-500 mt-1">ID: {user.telegramId}</div>
              </Link>
              
              <div className="flex items-center gap-3">
                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const twa = (window as any).Telegram?.WebApp;
                    
                    if (user.phone) {
                      const cleanPhone = user.phone.replace(/\D/g, '');
                      // If phone doesn't have 998 prefix but is 9 digits, add 998
                      const fullPhone = cleanPhone.length === 9 ? `998${cleanPhone}` : cleanPhone;
                      const url = `https://t.me/+${fullPhone}`;
                      if (twa?.openTelegramLink) {
                        twa.openTelegramLink(url);
                      } else {
                        window.open(url, '_blank');
                      }
                    } else {
                      alert("Ushbu xodimning profilida telefon raqami mavjud emas! Raqam kiritilgandan so'ng to'g'ridan to'g'ri o'tish ishlaydi.");
                    }
                  }}
                  className="bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-200 transition-colors flex items-center gap-1 z-10 relative"
                >
                  Telegram'da ochish
                </button>
                <Link href={`/admin/users/${user.telegramId}`}>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </Link>
              </div>
            </div>
          ))}

          {users.length === 0 && (
            <p className="text-center text-slate-500 py-4">Xodimlar topilmadi.</p>
          )}
        </div>
      </div>
    </div>
  );
}
