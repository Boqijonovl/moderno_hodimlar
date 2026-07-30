'use client';

import { useState, useEffect } from 'react';
import { YMaps, Map, Placemark, Circle } from '@pbe/react-yandex-maps';
import { MapPin, Clock, Download, Edit2, X, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export default function AttendancePage() {
  const [data, setData] = useState<any>(null);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [currentDate, setCurrentDate] = useState<string>('');
  
  // Edit modal state
  const [editingAtt, setEditingAtt] = useState<any>(null);
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');
  const [editStatus, setEditStatus] = useState('ON_TIME');
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = (date?: string) => {
    const url = date ? `/api/admin/attendance?date=${date}` : '/api/admin/attendance';
    fetch(url)
      .then(res => res.json())
      .then(setData);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openEditModal = (att: any) => {
    setEditingAtt(att);
    // Format for datetime-local input (YYYY-MM-DDThh:mm)
    const formatForInput = (dateStr: string) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      // adjust for local timezone offset
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().slice(0, 16);
    };
    
    setEditCheckIn(formatForInput(att.checkInTime));
    setEditCheckOut(formatForInput(att.checkOutTime));
    setEditStatus(att.status || 'ON_TIME');
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAtt) return;
    
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/attendance/${editingAtt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkInTime: editCheckIn ? new Date(editCheckIn).toISOString() : null,
          checkOutTime: editCheckOut ? new Date(editCheckOut).toISOString() : null,
          status: editStatus,
        }),
      });
      
      if (res.ok) {
        setEditingAtt(null);
        fetchData(currentDate); // Refresh data to see changes
      } else {
        alert("Saqlashda xatolik yuz berdi.");
      }
    } catch (error) {
      console.error(error);
      alert("Tarmoq xatosi.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Haqiqatan ham bu davomatni o'chirmoqchimisiz?")) return;
    
    try {
      const res = await fetch(`/api/admin/attendance/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData(currentDate);
      } else {
        alert("O'chirishda xatolik.");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const exportToExcel = () => {
    if (!data || data.attendance.length === 0) return alert("Davomat yo'q");
    
    const excelData = data.attendance.map((a: any) => ({
      'Sana': new Date(a.date).toLocaleDateString(),
      'Xodim': a.user.name,
      'Kelgan Vaqti': a.checkInTime ? new Date(a.checkInTime).toLocaleTimeString() : '',
      'Ketgan Vaqti': a.checkOutTime ? new Date(a.checkOutTime).toLocaleTimeString() : '',
      'Holat': a.status === 'ON_TIME' ? 'Vaqtida' : a.status === 'LATE' ? 'Kechikkan' : 'Kelmagan',
      'Kechikish (daqiqa)': a.lateMinutes || 0,
      'Izoh': a.reason || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Davomat');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(blob, `Davomat_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (!data) return <div className="p-8 text-center text-slate-500">Yuklanmoqda...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Davomat</h1>
          <p className="text-slate-500 text-sm">Bugungi xodimlar ro'yxati va xarita</p>
        </div>
        <button 
          onClick={exportToExcel}
          className="bg-emerald-500 text-white p-2 rounded-xl flex items-center gap-2 hover:bg-emerald-600 transition-colors shadow-sm active:scale-95"
        >
          <Download className="w-5 h-5" />
          <span className="text-sm font-medium">Excel</span>
        </button>
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

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button 
          onClick={() => { setCurrentDate(''); fetchData(''); }}
          className={`shrink-0 px-4 py-2 rounded-xl font-bold text-sm transition-colors ${!currentDate ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
        >
          Bugun
        </button>
        {data.historyDates?.map((d: string) => {
          const dateStr = new Date(d).toISOString().split('T')[0];
          const todayStr = new Date().toISOString().split('T')[0];
          if (dateStr === todayStr) return null; // Hide today from history
          return (
            <button
              key={dateStr}
              onClick={() => { setCurrentDate(dateStr); fetchData(dateStr); }}
              className={`shrink-0 px-4 py-2 rounded-xl font-bold text-sm transition-colors ${currentDate === dateStr ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
            >
              {new Date(d).toLocaleDateString('uz-UZ')}
            </button>
          )
        })}
      </div>

      <div className="space-y-3">
        {data.attendance.length === 0 && <p className="text-center text-sm text-slate-500">{!currentDate ? 'Bugun' : 'Bu kunda'} hech kim ishga kelmadi</p>}
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
                  {att.checkInTime ? new Date(att.checkInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                </span>
                {att.checkOutTime && (
                  <span className="flex items-center gap-1 text-slate-400">
                    - {new Date(att.checkOutTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right flex flex-col items-end gap-2">
              <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider
                ${att.status === 'ON_TIME' ? 'bg-emerald-50 text-emerald-600' : 
                  att.status === 'LATE' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}
              `}>
                {att.status === 'ON_TIME' ? 'Vaqtida' : att.status === 'LATE' ? 'Kechikkan' : 'Kelmagan'}
              </span>
              <div className="flex gap-2 mt-1 items-center">
                <button 
                  onClick={(e) => { e.stopPropagation(); openEditModal(att); }}
                  className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                  title="Tahrirlash"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => handleDelete(e, att.id)}
                  className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                  title="O'chirish"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                {att.gpsLat && (
                  <MapPin className={`w-4 h-4 ${selectedLocation?.lat === att.gpsLat ? 'text-blue-500' : 'text-slate-300'}`} />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingAtt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-lg text-slate-800">Vaqtni Tahrirlash</h3>
                <p className="text-sm text-slate-500">{editingAtt.user.name}</p>
              </div>
              <button 
                onClick={() => setEditingAtt(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleEditSave} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Kelgan Vaqti</label>
                <input 
                  type="datetime-local" 
                  value={editCheckIn}
                  onChange={(e) => setEditCheckIn(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Ketgan Vaqti</label>
                <input 
                  type="datetime-local" 
                  value={editCheckOut}
                  onChange={(e) => setEditCheckOut(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Holat</label>
                <select 
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="ON_TIME">Vaqtida (On Time)</option>
                  <option value="LATE">Kechikkan (Late)</option>
                  <option value="ABSENT">Kelmagan (Absent)</option>
                </select>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-70"
                >
                  {isSaving ? "Saqlanmoqda..." : "Saqlash"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
