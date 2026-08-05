'use client';

import { useState, useEffect } from 'react';
import { MapPin, Plus, List, Edit2, Trash2 } from 'lucide-react';

export default function SettingsPage() {
  const [data, setData] = useState<any>({ settings: null, categories: [] });
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radius, setRadius] = useState('');
  const [loading, setLoading] = useState(false);

  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [newMethodName, setNewMethodName] = useState('');
  const [editingMethod, setEditingMethod] = useState<{id: string, name: string} | null>(null);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(res => res.json())
      .then(res => {
        setData(res);
        if (res.settings) {
          setLat(res.settings.storeLat);
          setLng(res.settings.storeLng);
          setRadius(res.settings.radius);
        }
      });
    
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const res = await fetch('/api/admin/payment-methods');
      const data = await res.json();
      setPaymentMethods(data);
    } catch (e) {}
  };

  const addPaymentMethod = async () => {
    if (!newMethodName.trim()) return;
    try {
      const res = await fetch('/api/admin/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newMethodName.trim() })
      });
      if (res.ok) {
        setNewMethodName('');
        fetchPaymentMethods();
      } else {
        const err = await res.json();
        alert(err.error || 'Xatolik');
      }
    } catch (e) {}
  };

  const updatePaymentMethod = async (id: string, name: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/payment-methods/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, isActive })
      });
      if (res.ok) {
        setEditingMethod(null);
        fetchPaymentMethods();
      }
    } catch (e) {}
  };

  const deletePaymentMethod = async (id: string) => {
    if (!confirm('O\'chirishni xohlaysizmi?')) return;
    try {
      const res = await fetch(`/api/admin/payment-methods/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchPaymentMethods();
      }
    } catch (e) {}
  };

  const saveLocation = async () => {
    setLoading(true);
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_location',
        payload: { lat: parseFloat(lat), lng: parseFloat(lng), radius: parseInt(radius) }
      })
    });
    alert('Saqlandi');
    setLoading(false);
  };

  // Category functionality removed as per user request

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Sozlamalar</h1>
        <p className="text-slate-500 text-sm">Do'kon va tizim boshqaruvi</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-500" />
          Do'kon Geolokatsiyasi
        </h2>
        
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 font-medium ml-1">Kenglik (Latitude)</label>
            <input 
              type="number" 
              value={lat} 
              onChange={e => setLat(e.target.value)}
              className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium ml-1">Uzunlik (Longitude)</label>
            <input 
              type="number" 
              value={lng} 
              onChange={e => setLng(e.target.value)}
              className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium ml-1">Ruxsat etilgan radius (metr)</label>
            <input 
              type="number" 
              value={radius} 
              onChange={e => setRadius(e.target.value)}
              className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500"
            />
          </div>
          <button 
            onClick={saveLocation} 
            disabled={loading}
            className="w-full bg-blue-600 text-white p-3 rounded-xl font-medium mt-2 hover:bg-blue-700 transition-colors"
          >
            Saqlash
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <List className="w-5 h-5 text-blue-500" />
          To'lov Turlari
        </h2>
        <p className="text-xs text-slate-500">Savdo va Xarajatlarda foydalaniladigan to'lov usullari.</p>

        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Yangi to'lov turi..." 
            value={newMethodName}
            onChange={e => setNewMethodName(e.target.value)}
            className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500"
          />
          <button 
            onClick={addPaymentMethod}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-1 hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Qo'shish
          </button>
        </div>

        <div className="space-y-2 mt-4">
          {paymentMethods.map(method => (
            <div key={method.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              {editingMethod?.id === method.id ? (
                <div className="flex-1 flex items-center gap-2 mr-2">
                  <input 
                    type="text" 
                    value={editingMethod.name}
                    onChange={e => setEditingMethod({...editingMethod, name: e.target.value})}
                    className="flex-1 p-2 border border-blue-500 rounded-lg text-sm"
                  />
                  <button 
                    onClick={() => updatePaymentMethod(method.id, editingMethod.name, method.isActive)}
                    className="text-xs font-bold text-white bg-emerald-500 px-3 py-2 rounded-lg"
                  >
                    Saqlash
                  </button>
                  <button 
                    onClick={() => setEditingMethod(null)}
                    className="text-xs font-bold text-slate-500 bg-slate-200 px-3 py-2 rounded-lg"
                  >
                    Bekor
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-slate-800 text-sm">{method.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setEditingMethod({id: method.id, name: method.name})}
                      className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => deletePaymentMethod(method.id)}
                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {paymentMethods.length === 0 && (
            <div className="text-center text-slate-400 text-sm py-4">To'lov turlari yo'q</div>
          )}
        </div>
      </div>

    </div>
  );
}
