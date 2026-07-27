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

    </div>
  );
}
