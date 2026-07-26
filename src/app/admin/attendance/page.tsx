'use client';

import { useState, useEffect } from 'react';
import { YMaps, Map, Placemark, Circle } from '@pbe/react-yandex-maps';
import { MapPin, Clock } from 'lucide-react';

export default function AttendancePage() {
  const [data, setData] = useState<any>(null);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);

  useEffect(() => {
    fetch('/api/admin/attendance')
      .then(res => res.json())
      .then(setData);
  }, []);

  if (!data) return <div className="p-8 text-center text-slate-500">Yuklanmoqda...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Davomat</h1>
        <p className="text-slate-500 text-sm">Bugungi xodimlar ro'yxati va xarita</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="h-64 bg-slate-100 relative">
          <YMaps>
            <Map 
              defaultState={{ center: [data.store.lat, data.store.lng], zoom: 16 }} 
              state={selectedLocation ? { center: [selectedLocation.lat, selectedLocation.lng], zoom: 17 } : { center: [data.store.lat, data.store.lng], zoom: 16 }}
              width="100%" 
              height="100%"
            >
              {/* Store Circle */}
              <Circle
                geometry={[[data.store.lat, data.store.lng], data.store.radius]}
                options={{
                  draggable: false,
                  fillColor: '#3b82f644',
                  strokeColor: '#3b82f6',
                  strokeOpacity: 0.8,
                  strokeWidth: 2,
                }}
              />
              {/* Store Marker */}
              <Placemark geometry={[data.store.lat, data.store.lng]} options={{ preset: 'islands#blueDotIcon' }} />
              
              {/* Selected Check-in Marker */}
              {selectedLocation && (
                <Placemark 
                  geometry={[selectedLocation.lat, selectedLocation.lng]} 
                  options={{ preset: 'islands#redIcon' }}
                />
              )}
            </Map>
          </YMaps>
        </div>
      </div>

      <div className="space-y-3">
        {data.attendance.length === 0 && <p className="text-center text-sm text-slate-500">Bugun hech kim ishga kelmadi</p>}
        {data.attendance.map((att: any) => (
          <div 
            key={att.id} 
            onClick={() => {
              if (att.gpsLat && att.gpsLng) setSelectedLocation({ lat: att.gpsLat, lng: att.gpsLng });
            }}
            className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-transform"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg
              ${att.status === 'ON_TIME' ? 'bg-emerald-100 text-emerald-600' : 
                att.status === 'LATE' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'}
            `}>
              {att.user.name.charAt(0)}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800">{att.user.name}</h3>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(att.checkInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
                {att.checkOutTime && (
                  <span className="flex items-center gap-1 text-slate-400">
                    - {new Date(att.checkOutTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right flex flex-col items-end gap-1">
              <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider
                ${att.status === 'ON_TIME' ? 'bg-emerald-50 text-emerald-600' : 
                  att.status === 'LATE' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}
              `}>
                {att.status === 'ON_TIME' ? 'Vaqtida' : att.status === 'LATE' ? 'Kechikkan' : 'Kelmagan'}
              </span>
              {att.gpsLat && (
                <MapPin className={`w-4 h-4 ${selectedLocation?.lat === att.gpsLat ? 'text-blue-500' : 'text-slate-300'}`} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
