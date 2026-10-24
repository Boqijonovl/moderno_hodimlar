'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminOrdersPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/sales');
  }, [router]);

  return (
    <div className="p-8 text-center text-slate-500 font-medium">
      Savdolar bo'limiga yo'naltirilmoqda...
    </div>
  );
}
