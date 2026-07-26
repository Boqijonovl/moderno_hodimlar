import Link from 'next/link';
import { Home, Users, BarChart3, Settings } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20">
      <div className="flex-1 overflow-y-auto p-4">
        {children}
      </div>
      
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-3 pb-safe z-50">
        <Link href="/admin" className="flex flex-col items-center text-slate-500 hover:text-blue-600 transition-colors">
          <Home className="w-6 h-6" />
          <span className="text-[10px] font-medium mt-1">Asosiy</span>
        </Link>
        <Link href="/admin/attendance" className="flex flex-col items-center text-slate-500 hover:text-blue-600 transition-colors">
          <Users className="w-6 h-6" />
          <span className="text-[10px] font-medium mt-1">Davomat</span>
        </Link>
        <Link href="/admin/sales" className="flex flex-col items-center text-slate-500 hover:text-blue-600 transition-colors">
          <BarChart3 className="w-6 h-6" />
          <span className="text-[10px] font-medium mt-1">Savdolar</span>
        </Link>
        <Link href="/admin/settings" className="flex flex-col items-center text-slate-500 hover:text-blue-600 transition-colors">
          <Settings className="w-6 h-6" />
          <span className="text-[10px] font-medium mt-1">Sozlamalar</span>
        </Link>
      </div>
    </div>
  );
}
