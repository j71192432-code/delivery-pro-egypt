import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Bike,
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { getAllOrders, updateOrder } from '../repositories/ordersRepository';
import { OrderCard } from '../components/OrderCard';
import { EmptyState } from '../components/EmptyState';
import { isToday, getLocalDateString } from '../utils/date';

export const OrdersPage: React.FC = () => {
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'all'>('today');
  const [loading, setLoading] = useState<boolean>(true);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const loadOrders = async () => {
    try {
      const all = await getAllOrders();
      setOrders(all);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => {},
        { timeout: 5000, maximumAge: 60000 }
      );
    }
  }, []);

  const handleStatusChange = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      await updateOrder(orderId, { status: nextStatus });
      loadOrders();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'فشل تحديث حالة الأوردر');
    }
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yesterdayStr = getLocalDateString(d);

    return orders.filter((o) => {
      // 1. Date Filter
      if (dateFilter === 'today' && !isToday(o.createdAt)) return false;
      if (dateFilter === 'yesterday') {
        const orderDate = o.createdAt.slice(0, 10);
        if (orderDate !== yesterdayStr) return false;
      }

      // 2. Status Filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'active') {
          if (!['new', 'accepted', 'picked_up', 'on_the_way'].includes(o.status)) return false;
        } else if (o.status !== statusFilter) {
          return false;
        }
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const numMatch = String(o.orderNumber).includes(q);
        const nameMatch = o.customerName ? o.customerName.toLowerCase().includes(q) : false;
        const phoneMatch = o.customerPhone ? o.customerPhone.includes(q) : false;
        const addressMatch = o.address ? o.address.toLowerCase().includes(q) : false;
        if (!numMatch && !nameMatch && !phoneMatch && !addressMatch) return false;
      }

      return true;
    });
  }, [orders, dateFilter, statusFilter, searchQuery]);

  return (
    <div className="pb-24 px-4 max-w-lg mx-auto animate-fadeIn">
      {/* Top action & title bar */}
      <div className="flex items-center justify-between mt-3 mb-3">
        <div>
          <h1 className="text-xl font-black text-white">إدارة الأوردرات</h1>
          <p className="text-xs text-dark-muted">تتبع الطلبات وحالات التسليم</p>
        </div>

        <button
          onClick={() => navigate('/orders/new')}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-lg shadow-brand-500/25 transition min-h-touch active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>أوردر جديد</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative mb-3">
        <Search className="w-4 h-4 text-dark-muted absolute right-3.5 top-3.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث بالرقم، اسم العميل، الهاتف أو العنوان..."
          className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-dark-card border border-dark-border text-white text-xs placeholder:text-dark-muted focus:border-brand-500 focus:outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute left-3 top-2.5 text-xs text-dark-muted hover:text-white"
          >
            مسح
          </button>
        )}
      </div>

      {/* Date Filters */}
      <div className="flex items-center gap-1.5 mb-2.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setDateFilter('today')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition min-h-[38px] ${
            dateFilter === 'today'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'bg-dark-card border border-dark-border text-dark-muted hover:text-white'
          }`}
        >
          أوردرات اليوم
        </button>
        <button
          onClick={() => setDateFilter('yesterday')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition min-h-[38px] ${
            dateFilter === 'yesterday'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'bg-dark-card border border-dark-border text-dark-muted hover:text-white'
          }`}
        >
          أمس
        </button>
        <button
          onClick={() => setDateFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition min-h-[38px] ${
            dateFilter === 'all'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'bg-dark-card border border-dark-border text-dark-muted hover:text-white'
          }`}
        >
          كل التواريخ
        </button>
      </div>

      {/* Status Pills */}
      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-none">
        {[
          { key: 'all', label: 'الكل' },
          { key: 'active', label: 'الجارية' },
          { key: 'new', label: 'جديد' },
          { key: 'on_the_way', label: 'في الطريق' },
          { key: 'delivered', label: 'تم التوصيل' },
          { key: 'cancelled', label: 'ملغي' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition ${
              statusFilter === tab.key
                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                : 'text-dark-muted hover:text-white hover:bg-dark-card'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          icon={Bike}
          title="لا توجد أوردرات مطابقة"
          description={
            searchQuery || statusFilter !== 'all'
              ? 'لم يتم العثور على أوردرات تطابق البحث أو الفلتر المحدد.'
              : 'لم تسجل أي أوردرات في هذه الفترة بعد.'
          }
          actionLabel={searchQuery ? 'مسح البحث' : 'إضافة أوردر جديد'}
          onAction={() => {
            if (searchQuery) {
              setSearchQuery('');
              setStatusFilter('all');
            } else {
              navigate('/orders/new');
            }
          }}
        />
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              userCoords={userCoords}
              onSelect={(ord) => navigate(`/orders/${ord.id}`)}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
};
