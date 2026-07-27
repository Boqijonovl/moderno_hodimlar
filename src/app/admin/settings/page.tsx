'use client';

import { useState, useEffect } from 'react';
import { MapPin, Plus, List, Edit2, Trash2 } from 'lucide-react';

export default function SettingsPage() {
  const [data, setData] = useState<any>({ settings: null, categories: [] });
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radius, setRadius] = useState('');
  const [newCat, setNewCat] = useState('');
  const [loading, setLoading] = useState(false);

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
  }, []);

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

  const addCategory = async () => {
    if (!newCat) return;
    setLoading(true);
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_category',
        payload: { name: newCat }
      })
    });
    if (res.ok) {
      const cat = await res.json();
      setData({ ...data, categories: [...data.categories, cat] });
      setNewCat('');
    }
    setLoading(false);
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Kategoriyani o\'chirmoqchimisiz?')) return;
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setData({ ...data, categories: data.categories.filter((c: any) => c.id !== id) });
      } else {
        const err = await res.json();
        alert(err.error || 'Xatolik yuz berdi');
      }
    } catch (e) {
      alert('Tarmoq xatosi');
    }
  };

  const editCategory = async (id: string, oldName: string) => {
    const newName = prompt('Yangi nomni kiriting:', oldName);
    if (!newName || newName === oldName) return;
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      if (res.ok) {
        setData({ 
          ...data, 
          categories: data.categories.map((c: any) => c.id === id ? { ...c, name: newName } : c) 
        });
      } else {
        alert('Xatolik yuz berdi');
      }
    } catch (e) {
      alert('Tarmoq xatosi');
    }
  };

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
          Mebel Kategoriyalari
        </h2>
        
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Yangi kategoriya nomi"
            value={newCat}
            onChange={e => setNewCat(e.target.value)}
            className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500"
          />
          <button 
            onClick={addCategory}
            disabled={loading || !newCat}
            className="bg-emerald-500 text-white p-3 rounded-xl hover:bg-emerald-600 transition-colors disabled:bg-slate-300"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-wrap gap-3 mt-4">
          {data.categories.map((c: any) => (
            <div key={c.id} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 border border-slate-200">
              <span>{c.name}</span>
              <div className="flex items-center gap-1 ml-2 border-l border-slate-300 pl-2">
                <button onClick={() => editCategory(c.id, c.name)} className="text-blue-500 hover:text-blue-600 transition-colors p-1">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => deleteCategory(c.id)} className="text-rose-500 hover:text-rose-600 transition-colors p-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
