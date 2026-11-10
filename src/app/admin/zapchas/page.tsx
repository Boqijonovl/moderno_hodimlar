'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserCheck, UserPlus, UserX, Users, ChevronDown, ChevronUp } from 'lucide-react';
import ZapchasSection from '@/components/ZapchasSection';

interface ManagedEmployee {
  id: string;
  telegramId: string;
  name: string;
  role: string;
  phone: string | null;
  canUseZapchas: boolean;
  canManageZapchas: boolean;
}

export default function AdminZapchasPage() {
  const [adminUser, setAdminUser] = useState<any>(null);
  const [webApp, setWebApp] = useState<any>(null);
  const [employees, setEmployees] = useState<ManagedEmployee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [showSellerPerms, setShowSellerPerms] = useState(false);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/zapchas/managers');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.users || []);
      }
    } catch (e) {
      console.error('Error fetching employees:', e);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();

    if (typeof window !== 'undefined') {
      import('@twa-dev/sdk')
        .then((mod) => {
          const wa = mod.default;
          setWebApp(wa);
          const tgUser = wa.initDataUnsafe?.user;
          if (tgUser) {
            const telegramId = tgUser.id.toString();
            const fallbackName =
              tgUser.first_name + (tgUser.last_name ? ` ${tgUser.last_name}` : '');
            fetch(`/api/me?telegramId=${telegramId}`)
              .then(async (res) => {
                if (res.ok) {
                  const data = await res.json();
                  setAdminUser({ ...data.user, role: 'ADMIN' });
                } else {
                  setAdminUser({ telegramId, name: fallbackName, role: 'ADMIN', active: true });
                }
              })
              .catch(() => {
                setAdminUser({ telegramId, name: fallbackName, role: 'ADMIN', active: true });
              });
          }
        })
        .catch(() => {});
    }
  }, [fetchEmployees]);

  const updateEmployeeZapchasRole = async (
    targetUserId: string,
    patch: { canManageZapchas?: boolean; canUseZapchas?: boolean }
  ) => {
    setAssignLoading(true);
    try {
      const res = await fetch('/api/admin/zapchas/managers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminTelegramId: adminUser?.telegramId,
          targetUserId,
          ...patch,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Xatolik yuz berdi');
      } else {
        setSelectedEmployeeId('');
        await fetchEmployees();
      }
    } catch {
      alert('Tarmoq xatosi');
    }
    setAssignLoading(false);
  };

  const assignedManagers = employees.filter((e) => e.canManageZapchas);
  const unassignedEmployees = employees.filter(
    (e) => !e.canManageZapchas && e.role !== 'ADMIN'
  );

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Assigned Zapchas Manager Card */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-2xl">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Zapchas Mas&apos;ul Xodimi (Biriktirish)
              </h2>
              <p className="text-xs text-slate-500">
                Biriktirilgan xodim kelgan zapchaslar sonini kiritadi va kelgan-ketganini boshqaradi
              </p>
            </div>
          </div>
        </div>

        {/* Currently assigned managers */}
        {assignedManagers.length > 0 ? (
          <div className="space-y-2">
            {assignedManagers.map((emp) => (
              <div
                key={emp.id}
                className="flex items-center justify-between gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl"
              >
                <div>
                  <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <span>{emp.name}</span>
                    <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                      Mas&apos;ul
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    ID: {emp.telegramId} {emp.phone ? `• ${emp.phone}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={assignLoading}
                  onClick={() => {
                    if (confirm(`${emp.name} ni mas'ullikdan olib tashlaysizmi?`)) {
                      updateEmployeeZapchasRole(emp.id, { canManageZapchas: false });
                    }
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <UserX className="w-3.5 h-3.5" />
                  Olib tashlash
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 font-medium">
            Hozircha alohida mas&apos;ul xodim biriktirilmagan. Pastdan xodim tanlab biriktiring.
          </div>
        )}

        {/* Assign new manager */}
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Mas&apos;ul xodim tanlang...</option>
            {unassignedEmployees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} (ID: {emp.telegramId})
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!selectedEmployeeId || assignLoading}
            onClick={() =>
              updateEmployeeZapchasRole(selectedEmployeeId, {
                canManageZapchas: true,
                canUseZapchas: true,
              })
            }
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Biriktirish
          </button>
        </div>

        {/* Toggle Seller Access Per Employee */}
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowSellerPerms((v) => !v)}
            className="w-full flex items-center justify-between text-xs font-bold text-slate-600 hover:text-blue-600 py-1"
          >
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              Sotuvchilarning Zapchas bo&apos;limiga kirish ruxsati ({employees.filter((e) => e.canUseZapchas).length} ta)
            </span>
            {showSellerPerms ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showSellerPerms && (
            <div className="mt-2.5 space-y-2 max-h-64 overflow-y-auto pr-1">
              {employees.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-800">{emp.name}</div>
                    <div className="text-[10px] text-slate-400">
                      {emp.role === 'ADMIN'
                        ? 'Admin'
                        : emp.canManageZapchas
                          ? "Mas'ul + Sotuvchi"
                          : 'Sotuvchi'}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={assignLoading || emp.role === 'ADMIN'}
                    onClick={() =>
                      updateEmployeeZapchasRole(emp.id, {
                        canUseZapchas: !emp.canUseZapchas,
                      })
                    }
                    className={`w-11 h-6 rounded-full transition-colors relative disabled:opacity-50 ${
                      emp.canUseZapchas ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 transition-transform"
                      style={{
                        transform: emp.canUseZapchas ? 'translateX(20px)' : 'translateX(0)',
                      }}
                    />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Zapchas Stock, Incoming, Sell, History Management */}
      {adminUser ? (
        <ZapchasSection user={adminUser} WebApp={webApp} initialView="stock" />
      ) : (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
