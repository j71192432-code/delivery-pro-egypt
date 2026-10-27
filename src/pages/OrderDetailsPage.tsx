import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  Phone,
  MessageCircle,
  Navigation,
  Copy,
  Check,
  Edit,
  Trash2,
  RotateCcw,
  Ban,
  MapPin,
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { getOrderById, updateOrder, deleteOrder } from '../repositories/ordersRepository';
import { formatEGPStandard } from '../utils/currency';
import { formatArabicDateTime, formatArabicTime } from '../utils/date';
import { buildGoogleMapsDirectionsUrl, normalizeEgyptianPhoneNumber } from '../services/googleMaps';
import { calculateOrderRecognizedIncome } from '../services/profitCalculator';
import { ConfirmDialog } from '../components/ConfirmDialog';

export const OrderDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [showRefundModal, setShowRefundModal] = useState<boolean>(false);
  const [cancellationCompInput, setCancellationCompInput] = useState<string>('0');
  const [refundAmountInput, setRefundAmountInput] = useState<string>('0');

  const loadOrder = async () => {
    if (!id) return;
    try {
      const data = await getOrderById(id);
      if (data) setOrder(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-8 text-center text-white">
        <p className="mb-4">الأوردر غير موجود أو تم حذفه.</p>
        <button
          onClick={() => navigate('/orders')}
          className="px-4 py-2 rounded-xl bg-brand-500 text-white font-medium"
        >
          العودة للأوردرات
        </button>
      </div>
    );
  }

  const recognizedIncome = calculateOrderRecognizedIncome(order);
  const phoneInfo = order.customerPhone ? normalizeEgyptianPhoneNumber(order.customerPhone) : null;
  const mapsUrl = buildGoogleMapsDirectionsUrl({
    destAddress: order.address,
    destLatitude: order.latitude,
    destLongitude: order.longitude,
  });

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(order.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAdvanceStatus = async (nextStatus: OrderStatus) => {
    try {
      const updated = await updateOrder(order.id, { status: nextStatus });
      setOrder(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'فشل تحديث الحالة');
    }
  };

  const handleConfirmCancel = async () => {
    try {
      const comp = parseFloat(cancellationCompInput) || 0;
      const updated = await updateOrder(order.id, {
        status: 'cancelled',
        cancellationCompensation: comp,
      });
      setOrder(updated);
      setShowCancelModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'فشل إلغاء الأوردر');
    }
  };

  const handleConfirmRefund = async () => {
    try {
      const refAmt = parseFloat(refundAmountInput) || 0;
      const updated = await updateOrder(order.id, {
        financialStatus: 'refunded',
        refundAmount: refAmt,
      });
      setOrder(updated);
      setShowRefundModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'فشل تسجيل الاسترجاع');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteOrder(order.id);
      navigate('/orders');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'فشل حذف الأوردر');
    }
  };

  // Status Lifecycle Stepper Stages
  const steps: { key: OrderStatus; label: string; time?: string }[] = [
    { key: 'new', label: 'تم الإنشاء', time: order.createdAt },
    { key: 'accepted', label: 'تم القبول', time: order.acceptedAt },
    { key: 'picked_up', label: 'تم الاستلام', time: order.pickedUpAt },
    { key: 'on_the_way', label: 'في الطريق', time: order.status === 'on_the_way' || order.deliveredAt ? order.updatedAt : undefined },
    { key: 'delivered', label: 'تم التسليم', time: order.deliveredAt },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === order.status);

  return (
    <div className="pb-24 px-4 max-w-lg mx-auto animate-fadeIn">
      {/* Top Header */}
      <div className="flex items-center justify-between mt-3 mb-4">
        <button
          onClick={() => navigate('/orders')}
          className="flex items-center gap-1 text-xs text-dark-muted hover:text-white transition p-1"
        >
          <ArrowRight className="w-4 h-4" />
          <span>الأوردرات</span>
        </button>

        <span className="text-base font-extrabold text-white">تفاصيل أوردر #{order.orderNumber}</span>

        <button
          onClick={() => navigate(`/orders/edit/${order.id}`)}
          className="p-2 rounded-xl text-dark-muted hover:text-white hover:bg-dark-card border border-transparent hover:border-dark-border"
          aria-label="تعديل"
        >
          <Edit className="w-4 h-4" />
        </button>
      </div>

      {/* Status Stepper Card */}
      <div className="bg-dark-card border border-dark-border rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-dark-muted">مراحل تنفيذ الأوردر</span>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
              order.status === 'delivered'
                ? 'bg-profit-bg text-profit-light'
                : order.status === 'cancelled'
                ? 'bg-expense-bg text-expense-light'
                : 'bg-brand-500/20 text-brand-300'
            }`}
          >
            {order.status === 'delivered'
              ? 'مكتمل بنجاح'
              : order.status === 'cancelled'
              ? 'أوردر ملغي'
              : 'جاري التنفيذ'}
          </span>
        </div>

        {/* Stepper Progress */}
        {order.status !== 'cancelled' && order.status !== 'failed' ? (
          <div className="relative flex justify-between items-center px-1">
            <div className="absolute top-3.5 left-4 right-4 h-0.5 bg-dark-border -z-0"></div>
            {steps.map((step, idx) => {
              const isPassed = currentStepIndex >= idx;
              const isCurrent = currentStepIndex === idx;

              return (
                <div key={step.key} className="flex flex-col items-center z-10">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                      isPassed
                        ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                        : 'bg-dark-input border border-dark-border text-dark-muted'
                    } ${isCurrent ? 'ring-2 ring-brand-300' : ''}`}
                  >
                    {isPassed ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                  </div>
                  <span
                    className={`text-[10px] mt-1 font-medium ${
                      isPassed ? 'text-white' : 'text-dark-muted'
                    }`}
                  >
                    {step.label}
                  </span>
                  {step.time && (
                    <span className="text-[9px] text-dark-muted font-mono">
                      {formatArabicTime(step.time)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-expense-bg border border-expense/30 text-expense-light text-xs flex items-center gap-2">
            <Ban className="w-4 h-4 shrink-0" />
            <span>
              تم إلغاء هذا الأوردر في {formatArabicDateTime(order.cancelledAt || order.updatedAt)}
              {order.cancellationCompensation
                ? ` (تم تسجيل تعويض: ${formatEGPStandard(order.cancellationCompensation)})`
                : ''}
            </span>
          </div>
        )}

        {/* Advance Next Step button */}
        {order.status === 'new' && (
          <button
            onClick={() => handleAdvanceStatus('accepted')}
            className="w-full mt-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition min-h-touch"
          >
            قبول الأوردر
          </button>
        )}
        {order.status === 'accepted' && (
          <button
            onClick={() => handleAdvanceStatus('picked_up')}
            className="w-full mt-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition min-h-touch"
          >
            تأكيد استلام الطلب من المتجر
          </button>
        )}
        {order.status === 'picked_up' && (
          <button
            onClick={() => handleAdvanceStatus('on_the_way')}
            className="w-full mt-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition min-h-touch"
          >
            في الطريق إلى العميل
          </button>
        )}
        {order.status === 'on_the_way' && (
          <button
            onClick={() => handleAdvanceStatus('delivered')}
            className="w-full mt-4 py-2.5 rounded-xl bg-profit hover:bg-profit-dark text-white text-xs font-bold shadow-md shadow-profit/20 transition min-h-touch"
          >
            تم تسليم الأوردر للعميل بنجاح
          </button>
        )}
      </div>

      {/* Address & Navigation Card */}
      <div className="bg-dark-card border border-dark-border rounded-2xl p-4 mb-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-start gap-2.5">
            <MapPin className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-white leading-relaxed">{order.address}</p>
              {order.area && (
                <p className="text-xs text-brand-300 mt-0.5">
                  {order.area} - {order.city}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleCopyAddress}
            className="p-2 rounded-xl bg-dark-input hover:bg-dark-cardHover border border-dark-border text-dark-muted hover:text-white transition shrink-0"
            title="نسخ العنوان"
            aria-label="نسخ العنوان"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Quick Communication Actions */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-dark-border/60">
          {phoneInfo ? (
            <>
              <a
                href={phoneInfo.telLink}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-xs hover:bg-emerald-500/25 transition min-h-touch"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>اتصال</span>
              </a>

              <a
                href={phoneInfo.whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600/15 border border-emerald-600/30 text-emerald-400 font-bold text-xs hover:bg-emerald-600/25 transition min-h-touch"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>واتساب</span>
              </a>
            </>
          ) : (
            <div className="col-span-2 text-xs text-dark-muted flex items-center p-2 bg-dark-input rounded-xl">
              لا يوجد رقم هاتف مسجل
            </div>
          )}

          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-brand-500/20 border border-brand-500/40 text-brand-300 font-bold text-xs hover:bg-brand-500/30 transition min-h-touch"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>الخريطة</span>
          </a>
        </div>
      </div>

      {/* Financial Breakdown Card */}
      <div className="bg-dark-card border border-dark-border rounded-2xl p-4 mb-4">
        <h3 className="text-xs font-bold text-white mb-3">البيان المالي للأوردر</h3>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-dark-border/40">
            <span className="text-dark-muted">رسوم التوصيل:</span>
            <span className="font-semibold text-white">{formatEGPStandard(order.deliveryFee)}</span>
          </div>

          {order.bonus > 0 && (
            <div className="flex justify-between py-1 border-b border-dark-border/40">
              <span className="text-dark-muted">البونص:</span>
              <span className="font-semibold text-profit-light">+{formatEGPStandard(order.bonus)}</span>
            </div>
          )}

          {order.tip > 0 && (
            <div className="flex justify-between py-1 border-b border-dark-border/40">
              <span className="text-dark-muted">الإكرامية (Tip):</span>
              <span className="font-semibold text-profit-light">+{formatEGPStandard(order.tip)}</span>
            </div>
          )}

          {order.riderDeductions > 0 && (
            <div className="flex justify-between py-1 border-b border-dark-border/40">
              <span className="text-dark-muted">خصومات الطيار:</span>
              <span className="font-semibold text-expense-light">
                -{formatEGPStandard(order.riderDeductions)}
              </span>
            </div>
          )}

          {order.refundAmount !== undefined && order.refundAmount > 0 && (
            <div className="flex justify-between py-1 border-b border-dark-border/40 text-expense-light">
              <span>مبلغ مرتجع للعميل (Refund):</span>
              <span className="font-semibold">-{formatEGPStandard(order.refundAmount)}</span>
            </div>
          )}

          <div className="flex justify-between pt-2 text-sm font-bold">
            <span className="text-brand-300">صافي دخل الطيار المحقق:</span>
            <span className="text-profit-light text-base">{formatEGPStandard(recognizedIncome)}</span>
          </div>
        </div>

        {/* Customer Collectibles */}
        <div className="mt-4 p-3 rounded-xl bg-dark-input border border-dark-border/70 flex justify-between items-center text-xs">
          <div>
            <span className="text-dark-muted block">طريقة الدفع:</span>
            <span className="font-semibold text-white">
              {order.paymentMethod === 'cash' ? 'تحصيل كاش' : 'دفع إلكتروني'}
            </span>
          </div>
          <div className="text-left">
            <span className="text-dark-muted block">المبلغ المطلوب تحصيله:</span>
            <span className="font-bold text-white text-sm">
              {formatEGPStandard(order.amountCollected)}
            </span>
          </div>
        </div>
      </div>

      {/* Notes & Extra Info */}
      {order.notes && (
        <div className="bg-dark-card border border-dark-border rounded-2xl p-4 mb-4">
          <h4 className="text-xs font-bold text-white mb-1.5">ملاحظات</h4>
          <p className="text-xs text-dark-muted whitespace-pre-wrap">{order.notes}</p>
        </div>
      )}

      {/* Dangerous & Reversal Actions */}
      <div className="space-y-2">
        {order.status === 'delivered' && (
          <button
            onClick={() => setShowRefundModal(true)}
            className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl border border-warning/40 text-warning-light hover:bg-warning/10 text-xs font-semibold transition min-h-touch"
          >
            <RotateCcw className="w-4 h-4" />
            <span>تسجيل استرجاع مالي للأوردر (Refund)</span>
          </button>
        )}

        {order.status !== 'cancelled' && order.status !== 'delivered' && (
          <button
            onClick={() => setShowCancelModal(true)}
            className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl border border-expense/40 text-expense-light hover:bg-expense/10 text-xs font-semibold transition min-h-touch"
          >
            <Ban className="w-4 h-4" />
            <span>إلغاء الأوردر مع تسجيل تعويض اختياري</span>
          </button>
        )}

        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl text-dark-muted hover:text-expense hover:bg-expense/5 text-xs font-medium transition min-h-touch"
        >
          <Trash2 className="w-4 h-4" />
          <span>حذف الأوردر نهائياً</span>
        </button>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="حذف الأوردر"
        message={`هل أنت متأكد من حذف الأوردر رقم #${order.orderNumber}؟\nسيتم إزالة السجل نهائياً من قاعدة البيانات المحلية.`}
        confirmLabel="نعم، حذف"
        isDestructive={true}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Cancel Order Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-dark-card border border-dark-border rounded-2xl p-5 shadow-2xl text-right">
            <h3 className="text-base font-bold text-white mb-2">إلغاء الأوردر</h3>
            <p className="text-xs text-dark-muted mb-4">
              الأوردر الملغي لا يحتسب له دخل إلا إذا قمت بتسجيل قيمة تعويض حقيقية من المطعم أو الشركة.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-medium text-white mb-1.5">
                قيمة التعويض المالي (ج.م) - اختياري:
              </label>
              <input
                type="number"
                step="0.5"
                value={cancellationCompInput}
                onChange={(e) => setCancellationCompInput(e.target.value)}
                placeholder="0"
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark-input border border-dark-border text-white text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-dark-border text-dark-muted text-xs font-medium hover:bg-white/5 min-h-touch"
              >
                تراجع
              </button>
              <button
                onClick={handleConfirmCancel}
                className="flex-1 py-2.5 rounded-xl bg-expense hover:bg-expense-dark text-white font-bold text-xs shadow-lg shadow-expense/25 min-h-touch"
              >
                تأكيد الإلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-dark-card border border-dark-border rounded-2xl p-5 shadow-2xl text-right">
            <h3 className="text-base font-bold text-white mb-2">تسجيل استرجاع مالي للأوردر</h3>
            <p className="text-xs text-dark-muted mb-4">
              سيتم تسجيل الخصم المالي كـ Reversal وتخفيض الدخل المحقق بدقة دون التلاعب في السجلات القديمة.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-medium text-white mb-1.5">
                مبلغ الاسترجاع (ج.م):
              </label>
              <input
                type="number"
                step="0.5"
                value={refundAmountInput}
                onChange={(e) => setRefundAmountInput(e.target.value)}
                placeholder="0"
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark-input border border-dark-border text-white text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowRefundModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-dark-border text-dark-muted text-xs font-medium hover:bg-white/5 min-h-touch"
              >
                تراجع
              </button>
              <button
                onClick={handleConfirmRefund}
                className="flex-1 py-2.5 rounded-xl bg-warning hover:bg-warning-dark text-black font-bold text-xs shadow-lg shadow-warning/25 min-h-touch"
              >
                تأكيد الاسترجاع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
