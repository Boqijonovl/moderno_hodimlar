'use client';
import { useState, useEffect } from 'react';
import { ChevronLeft, Send, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
export default function NewSale() {
  const [user, setUser] = useState<any>(null);
  const [WebApp, setWebApp] = useState<any>(null);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [formData, setFormData] = useState({
    categoryId: '',
    itemName: '',
    price: '',
    paymentMethod: 'CASH'
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('@twa-dev/sdk').then((mod) => {
        const wa = mod.default;
        setWebApp(wa);
        if (wa.initDataUnsafe?.user) {
          setUser(wa.initDataUnsafe.user);
        } else {
          setUser({ id: '123456', first_name: 'Test' });
        }
      });
    }
    
    // Fetch categories
    fetch('/api/categories').then(res => res.json()).then(data => {
      setCategories(data);
      if (data.length > 0) setFormData(prev => ({...prev, categoryId: data[0].id}));
    });
  }, []);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price.replace(/,/g, '')),
          telegramId: user?.id?.toString()
        })
      });
      
      if (res.ok) {
        setSuccess(true);
        if (WebApp.HapticFeedback) WebApp.HapticFeedback.notificationOccurred('success');
      }
    } catch (e) {
      alert('Tarmoq xatosi');
    }
    setLoading(false);
  };
  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <CheckCircle2 className="w-20 h-20 text-emerald-500 mx-auto" />
        <h2 className="text-2xl font-bold text-slate-800">Sotuv muvaffaqiyatli saqlandi!</h2>
        <Link href="/" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium mt-4 w-full block">
          Bosh sahifaga qaytish
        </Link>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-blue-600 text-white p-4 flex items-center shadow-md">
        <Link href="/" className="mr-2">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-xl font-semibold">Yangi Sotuv Kiritish</h1>
      </div>
      <div className="p-4">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 shadow-sm space-y-5 border border-slate-100">
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Kategoriya</label>
            <select 
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              value={formData.categoryId}
              onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
              required
            >
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Mebel Nomi/Kodi</label>
            <input 
              type="text" 
              placeholder="Masalan: Yulduz garnituri"
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              value={formData.itemName}
              onChange={(e) => setFormData({...formData, itemName: e.target.value})}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Narxi (so'm)</label>
            <input 
              type="number" 
              placeholder="12000000"
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              value={formData.price}
              onChange={(e) => setFormData({...formData, price: e.target.value})}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">To'lov Turi</label>
            <div className="grid grid-cols-3 gap-2">
              {['CASH', 'CARD', 'INSTALLMENT'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({...formData, paymentMethod: type})}
                  className={`p-3 rounded-xl text-sm font-medium transition-all ${
                    formData.paymentMethod === type 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {type === 'CASH' ? 'Naqd' : type === 'CARD' ? 'Karta' : 'Muddatli'}
                </button>
              ))}
            </div>
          </div>
          <button 
            type="submit" 
            disabled={loading || categories.length === 0}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all mt-6"
          >
            {loading ? 'Saqlanmoqda...' : <><Send className="w-5 h-5"/> Saqlash</>}
          </button>
        </form>
      </div>
    </div>
  );
}
