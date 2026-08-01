'use client';

import { useState, useEffect } from 'react';
import { PackageSearch, Clock, MapPin, User as UserIcon, Calendar } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders'); // We'll need to remove the assignedToId filter in GET to fetch all
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      fetchOrders();
    } catch (e) {
      console.error(e);
    }
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId) return;
    
    // Update local state immediately
    const newOrders = [...orders];
    const draggedOrderIndex = newOrders.findIndex(o => o.id === draggableId);
    if (draggedOrderIndex > -1) {
      newOrders[draggedOrderIndex].status = destination.droppableId;
      setOrders(newOrders);
    }

    // Persist to API
    updateStatus(draggableId, destination.droppableId);
  };

  const columns = [
    { id: 'PENDING', title: 'Kutilmoqda (Yangi)', color: 'bg-slate-100 dark:bg-slate-800' },
    { id: 'IN_PROGRESS', title: 'Jarayonda (Yasalmoqda)', color: 'bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50' },
    { id: 'COMPLETED', title: 'Tayyor (Tugallangan)', color: 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/50' },
  ];

  const getOrdersByStatus = (status: string) => orders.filter(o => o.status === status);

  const isOverdue = (date: string) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    const deadline = new Date(date);
    deadline.setHours(0,0,0,0);
    return deadline < today;
  };

  const isToday = (date: string) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    const deadline = new Date(date);
    deadline.setHours(0,0,0,0);
    return deadline.getTime() === today.getTime();
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  // To prevent Next.js SSR mismatch with react-beautiful-dnd, we render safely on client
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <PackageSearch className="w-6 h-6 text-blue-600" />
            Buyurtmalar Doskasi (Kanban)
          </h1>
          <p className="text-sm text-slate-500">
            Jarayonlarni ustunlar bo'ylab sudrab (drag&drop) o'tkazishingiz mumkin.
          </p>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {columns.map(col => (
            <div key={col.id} className={`rounded-2xl p-4 ${col.color}`}>
              <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-4 flex justify-between items-center">
                {col.title}
                <span className="bg-white dark:bg-slate-700 text-slate-500 text-xs px-2 py-1 rounded-full shadow-sm">
                  {getOrdersByStatus(col.id).length}
                </span>
              </h3>
              
              <Droppable droppableId={col.id}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-3 min-h-[200px]"
                  >
                    {getOrdersByStatus(col.id).map((order, index) => (
                      <Draggable key={order.id} draggableId={order.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border ${
                              isOverdue(order.deadline) && order.status !== 'COMPLETED' 
                                ? 'border-rose-300 dark:border-rose-500/50 shadow-rose-100' 
                                : isToday(order.deadline) && order.status !== 'COMPLETED'
                                  ? 'border-amber-300 dark:border-amber-500/50 shadow-amber-100'
                                  : 'border-slate-100 dark:border-slate-700'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{order.name}</h4>
                              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
                                {order.price.toLocaleString()} so'm
                              </span>
                            </div>
                            
                            {order.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 bg-slate-50 dark:bg-slate-900 p-2 rounded-lg">
                                {order.description}
                              </p>
                            )}

                            <div className="space-y-2 mt-3">
                              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                                <div className="flex items-center gap-1">
                                  <UserIcon className="w-3 h-3" />
                                  Usta:
                                </div>
                                <span className="font-medium text-slate-800 dark:text-slate-200">
                                  {order.assignedTo?.name || <span className="text-rose-500">Biriktirilmagan</span>}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Muddat:
                                </div>
                                <span className={`font-bold ${
                                  isOverdue(order.deadline) && order.status !== 'COMPLETED' ? 'text-rose-600' :
                                  isToday(order.deadline) && order.status !== 'COMPLETED' ? 'text-amber-600' :
                                  'text-slate-800 dark:text-slate-200'
                                }`}>
                                  {order.deadline ? new Date(order.deadline).toLocaleDateString('uz-UZ') : '-'}
                                </span>
                              </div>

                              {order.sale?.balance > 0 && (
                                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                                  <div className="text-[10px] font-black text-rose-600 bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded-md inline-block">
                                    Mijoz qarzi: {order.sale.balance.toLocaleString()} so'm
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
