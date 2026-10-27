import React from 'react';
import {
  Phone,
  MessageCircle,
  Navigation,
  CheckCircle2,
  Clock,
  Package,
  MapPin,
  ChevronLeft,
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { formatEGPStandard } from '../utils/currency';
import { formatArabicTime } from '../utils/date';
import { buildGoogleMapsDirectionsUrl, normalizeEgyptianPhoneNumber } from '../services/googleMaps';

interface OrderCardProps {
  order: Order;
  userCoords?: { latitude: number; longitude: number } | null;
  onSelect: (order: Order) => void;
  onStatusChange?: (orderId: string, nextStatus: OrderStatus) => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  userCoords,
  onSelect,
  onStatusChange,
}) => {
  const statusConfig: Record<
    OrderStatus,
    { label: string; bg: string; text: string; border: string }
  > = {
    new: {
      label: 'جديد',
      bg: 'bg-brand-500/15',
      text: 'text-brand-300',
      border: 'border-brand-500/30',
    },
    accepted: {
      label: 'تم القبول',
      bg: 'bg-blue-500/15',
      text: 'text-blue-400',
      border: 'border-blue-500/30',
    },
    picked_up: {
      label: 'تم الاستلام',
      bg: 'bg-purple-500/15',
      text: 'text-purple-300',
      border: 'border-purple-500/30',
    },
    on_the_way: {
      label: 'في الطريق',
      bg: 'bg-warning-bg',
      text: 'text-warning-light',
      border: 'border-warning/30',
    },
    delivered: {
      label: 'تم التوصيل',
      bg: 'bg-profit-bg',
      text: 'text-profit-light',
      border: 'border-profit/30',
    },
    cancelled: {
      label: 'ملغي',
      bg: 'bg-expense-bg',
      text: 'text-expense-light',
      border: 'border-expense/30',
    },
    failed: {
      label: 'فشل التوصيل',
      bg: 'bg-red-500/20',
      text: 'text-red-400',
      border: 'border-red-500/30',
    },
  };

  const currentStatus = statusConfig[order.status] || statusConfig.new;

  // Next status transition helper
  const getNextStatusAction = (): { next: OrderStatus; label: string } | null => {
    switch (order.status) {
      case 'new':
        return { next: 'accepted', label: 'قبول الأوردر' };
      case 'accepted':
        return { next: 'picked_up', label: 'تم استلام الطلب' };
      case 'picked_up':
        return { next: 'on_the_way', label: 'بدء التوصيل' };
      case 'on_the_way':
        return { next: 'delivered', label: 'تم التسليم' };
      default:
        return null;
    }
  };

  const nextAction = getNextStatusAction();

  const phoneInfo = order.customerPhone ? normalizeEgyptianPhoneNumber(order.customerPhone) : null;

  const mapsUrl = buildGoogleMapsDirectionsUrl({
    destAddress: order.address,
    destLatitude: order.latitude,
    destLongitude: order.longitude,
    originLatitude: userCoords?.latitude,
    originLongitude: userCoords?.longitude,
  });

  return (
    <div className="bg-dark-card border border-dark-border rounded-2xl p-4 shadow-sm hover:border-brand-500/40 transition">
      {/* Header: Order Number, Status, Time */}
      <div className="flex items-center justify-between pb-3 border-b border-dark-border/60">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-white text-base">#{order.orderNumber}</span>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${currentStatus.border} ${currentStatus.bg} ${currentStatus.text}`}
          >
            {currentStatus.label}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-dark-muted">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatArabicTime(order.createdAt)}</span>
        </div>
      </div>

      {/* Body: Address & Customer */}
      <div className="py-3 cursor-pointer" onClick={() => onSelect(order)}>
        <div className="flex items-start gap-2.5 mb-2">
          <MapPin className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white leading-snug line-clamp-2">
              {order.address}
            </p>
            {order.area && (
              <span className="text-xs text-brand-300 inline-block mt-0.5">
                {order.area} - {order.city}
              </span>
            )}
          </div>
        </div>

        {order.customerName && (
          <div className="flex items-center gap-2 text-xs text-dark-muted mt-1 pr-6">
            <span className="font-medium text-white/90">{order.customerName}</span>
            {order.merchantName && (
              <span className="text-dark-muted/80">• من: {order.merchantName}</span>
            )}
          </div>
        )}

        {/* Pricing breakdown pill */}
        <div className="mt-3 flex items-center justify-between p-2.5 rounded-xl bg-dark-input border border-dark-border/80">
          <div className="text-xs">
            <span className="text-dark-muted">عمولة التوصيل: </span>
            <span className="text-profit-light font-bold text-sm">
              {formatEGPStandard(order.deliveryFee + order.bonus + order.tip)}
            </span>
          </div>

          {order.orderValue ? (
            <div className="text-xs">
              <span className="text-dark-muted">قيمة الطلب: </span>
              <span className="text-white font-medium">{formatEGPStandard(order.orderValue)}</span>
            </div>
          ) : (
            <div className="text-xs text-dark-muted flex items-center gap-1">
              <Package className="w-3.5 h-3.5 text-brand-400" />
              <span>{order.paymentMethod === 'cash' ? 'تحصيل كاش' : 'دفع إلكتروني'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer: Quick Actions */}
      <div className="pt-2 flex items-center justify-between gap-2 border-t border-dark-border/50">
        <div className="flex items-center gap-1.5">
          {phoneInfo && (
            <>
              <a
                href={phoneInfo.telLink}
                className="p-2.5 rounded-xl bg-dark-cardHover border border-dark-border text-white hover:text-brand-300 transition min-h-touch flex items-center justify-center"
                title="اتصال بالعميل"
                aria-label="اتصال بالعميل"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
              </a>

              <a
                href={phoneInfo.whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-dark-cardHover border border-dark-border text-white hover:text-emerald-400 transition min-h-touch flex items-center justify-center"
                title="واتساب"
                aria-label="مراسلة واتساب"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
              </a>
            </>
          )}

          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-xl bg-dark-cardHover border border-dark-border text-white hover:text-brand-300 transition min-h-touch flex items-center justify-center"
            title="الاتجاهات عبر خرائط جوجل"
            aria-label="الاتجاهات عبر خرائط جوجل"
          >
            <Navigation className="w-4 h-4 text-brand-400" />
          </a>
        </div>

        <div className="flex items-center gap-2">
          {nextAction && onStatusChange && (
            <button
              onClick={() => onStatusChange(order.id, nextAction.next)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-md shadow-brand-500/20 transition min-h-touch"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{nextAction.label}</span>
            </button>
          )}

          <button
            onClick={() => onSelect(order)}
            className="p-2 text-dark-muted hover:text-white rounded-lg hover:bg-white/5 transition"
            aria-label="عرض التفاصيل"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
