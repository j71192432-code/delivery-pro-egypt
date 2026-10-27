import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  MapPin,
  Compass,
  Phone,
  User,
  Store,
  DollarSign,
  AlertCircle,
  Save,
  Loader2,
} from 'lucide-react';
import { PaymentMethod } from '../types';
import { createOrder, getOrderById, updateOrder } from '../repositories/ordersRepository';
import { getSettings } from '../repositories/settingsRepository';
import { validateOrderForm } from '../utils/validation';

export const OrderFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

  // Form fields
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [area, setArea] = useState<string>('');
  const [city, setCity] = useState<string>('القاهرة');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [merchantName, setMerchantName] = useState<string>('');
  const [orderValue, setOrderValue] = useState<string>('');
  const [deliveryFee, setDeliveryFee] = useState<string>('40');
  const [bonus, setBonus] = useState<string>('0');
  const [tip, setTip] = useState<string>('0');
  const [riderDeductions, setRiderDeductions] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountCollected, setAmountCollected] = useState<string>('40');
  const [notes, setNotes] = useState<string>('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function init() {
      try {
        const settings = await getSettings();
        if (settings.defaultCity) {
          setCity(settings.defaultCity);
        }

        if (id) {
          const existing = await getOrderById(id);
          if (existing) {
            setCustomerName(existing.customerName || '');
            setCustomerPhone(existing.customerPhone || '');
            setAddress(existing.address || '');
            setArea(existing.area || '');
            setCity(existing.city || settings.defaultCity || 'القاهرة');
            setLatitude(existing.latitude !== undefined ? String(existing.latitude) : '');
            setLongitude(existing.longitude !== undefined ? String(existing.longitude) : '');
            setMerchantName(existing.merchantName || '');
            setOrderValue(existing.orderValue !== undefined ? String(existing.orderValue) : '');
            setDeliveryFee(String(existing.deliveryFee || '0'));
            setBonus(String(existing.bonus || '0'));
            setTip(String(existing.tip || '0'));
            setRiderDeductions(String(existing.riderDeductions || '0'));
            setPaymentMethod(existing.paymentMethod || 'cash');
            setAmountCollected(String(existing.amountCollected || '0'));
            setNotes(existing.notes || '');
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [id]);

  // Handle GPS location lookup
  const handleFetchCurrentGps = () => {
    if (!navigator.geolocation) {
      alert('متصفحك لا يدعم تحديد الموقع الجغرافي');
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setGpsAccuracy(Math.round(pos.coords.accuracy));
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          alert('يرجى السماح بالوصول للموقع في إعدادات المتصفح أو الهاتف');
        } else {
          alert('تعذر قراءة الموقع بدقة حالياً');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateOrderForm({
      address,
      deliveryFee,
      orderValue,
      bonus,
      tip,
      riderDeductions,
      latitude,
      longitude,
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    try {
      const orderData = {
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        address: address.trim(),
        area: area.trim() || undefined,
        city: city.trim() || 'القاهرة',
        latitude: latitude.trim() ? parseFloat(latitude) : undefined,
        longitude: longitude.trim() ? parseFloat(longitude) : undefined,
        merchantName: merchantName.trim() || undefined,
        orderValue: orderValue.trim() ? parseFloat(orderValue) : undefined,
        deliveryFee: parseFloat(deliveryFee) || 0,
        bonus: parseFloat(bonus) || 0,
        tip: parseFloat(tip) || 0,
        riderDeductions: parseFloat(riderDeductions) || 0,
        paymentMethod,
        amountCollected: parseFloat(amountCollected) || 0,
        notes: notes.trim() || undefined,
        status: (isEditing ? undefined : 'new') as any,
      };

      if (isEditing && id) {
        await updateOrder(id, orderData);
      } else {
        await createOrder(orderData as any);
      }

      navigate('/orders');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'فشل حفظ الأوردر');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="pb-24 px-4 max-w-lg mx-auto animate-fadeIn">
      {/* Header bar */}
      <div className="flex items-center justify-between mt-3 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-xs text-dark-muted hover:text-white transition p-1"
        >
          <ArrowRight className="w-4 h-4" />
          <span>رجوع</span>
        </button>
        <h1 className="text-base font-extrabold text-white">
          {isEditing ? 'تعديل بيانات الأوردر' : 'تسجيل أوردر جديد'}
        </h1>
        <div className="w-8"></div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Address Card (Mandatory) */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-white flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-brand-400" />
              <span>عنوان التوصيل (مطلوب) *</span>
            </label>

            <button
              type="button"
              onClick={handleFetchCurrentGps}
              disabled={gpsLoading}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-semibold hover:bg-brand-500/30 transition min-h-touch"
            >
              {gpsLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Compass className="w-3.5 h-3.5" />
              )}
              <span>موقعي الحالي</span>
            </button>
          </div>

          <textarea
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="اسم الشارع، رقم العمارة، الشقة، أو علامة مميزة..."
            className={`w-full px-3.5 py-2.5 rounded-xl bg-dark-input border text-white text-xs focus:outline-none transition ${
              errors.address ? 'border-expense' : 'border-dark-border focus:border-brand-500'
            }`}
          />
          {errors.address && (
            <p className="mt-1 text-xs text-expense flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{errors.address}</span>
            </p>
          )}

          {gpsAccuracy && (
            <div className="mt-1.5 text-[11px] text-emerald-400">
              تم التقاط الإحداثيات بنجاح (دقة {gpsAccuracy} متر)
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mt-2.5">
            <div>
              <label className="text-[11px] font-medium text-dark-muted mb-1 block">المنطقة / الحي</label>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="مثال: المعادي، الدقي"
                className="w-full px-3 py-2 rounded-xl bg-dark-input border border-dark-border text-white text-xs focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-dark-muted mb-1 block">المحافظة / المدينة</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="القاهرة"
                className="w-full px-3 py-2 rounded-xl bg-dark-input border border-dark-border text-white text-xs focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Customer & Merchant Information */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-4 space-y-3">
          <h2 className="text-xs font-bold text-white flex items-center gap-1.5">
            <User className="w-4 h-4 text-emerald-400" />
            <span>بيانات العميل والمطعم</span>
          </h2>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium text-dark-muted mb-1 block">اسم العميل</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="مثال: أحمد محمد"
                className="w-full px-3 py-2 rounded-xl bg-dark-input border border-dark-border text-white text-xs focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-dark-muted mb-1 block">رقم هاتف العميل</label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-dark-muted absolute right-3 top-3" />
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  className="w-full pr-8 pl-3 py-2 rounded-xl bg-dark-input border border-dark-border text-white text-xs focus:border-brand-500 focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-dark-muted mb-1 block">اسم المتجر / المطعم</label>
            <div className="relative">
              <Store className="w-3.5 h-3.5 text-dark-muted absolute right-3 top-3" />
              <input
                type="text"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                placeholder="مثال: كنتاكي، بلبن، صيدلية العزبي"
                className="w-full pr-8 pl-3 py-2 rounded-xl bg-dark-input border border-dark-border text-white text-xs focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Financial Details (Fee, Bonus, Tips) */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-4 space-y-3">
          <h2 className="text-xs font-bold text-white flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-profit-light" />
            <span>الحسابات المالية للأوردر (ج.م)</span>
          </h2>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-profit-light mb-1 block">
                رسوم التوصيل الأساسية *
              </label>
              <input
                type="number"
                step="0.5"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl bg-dark-input border text-white text-sm font-bold focus:outline-none ${
                  errors.deliveryFee ? 'border-expense' : 'border-dark-border focus:border-brand-500'
                }`}
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-dark-muted mb-1 block">قيمة مشتريات الأوردر</label>
              <input
                type="number"
                step="1"
                value={orderValue}
                onChange={(e) => setOrderValue(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 rounded-xl bg-dark-input border border-dark-border text-white text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] font-medium text-dark-muted mb-1 block">البونص</label>
              <input
                type="number"
                step="1"
                value={bonus}
                onChange={(e) => setBonus(e.target.value)}
                placeholder="0"
                className="w-full px-2.5 py-1.5 rounded-xl bg-dark-input border border-dark-border text-white text-xs focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-dark-muted mb-1 block">الإكرامية (Tip)</label>
              <input
                type="number"
                step="1"
                value={tip}
                onChange={(e) => setTip(e.target.value)}
                placeholder="0"
                className="w-full px-2.5 py-1.5 rounded-xl bg-dark-input border border-dark-border text-white text-xs focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-expense-light mb-1 block">خصومات</label>
              <input
                type="number"
                step="1"
                value={riderDeductions}
                onChange={(e) => setRiderDeductions(e.target.value)}
                placeholder="0"
                className="w-full px-2.5 py-1.5 rounded-xl bg-dark-input border border-dark-border text-white text-xs focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-dark-border/60">
            <div>
              <label className="text-[11px] font-medium text-dark-muted mb-1 block">طريقة التحصيل</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 rounded-xl bg-dark-input border border-dark-border text-white text-xs focus:border-brand-500 focus:outline-none"
              >
                <option value="cash">كاش عند الاستلام</option>
                <option value="electronic">دفع إلكتروني / فيزا</option>
                <option value="prepaid">مدفوع مسبقاً</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-dark-muted mb-1 block">المبلغ المحصل فعلياً</label>
              <input
                type="number"
                step="1"
                value={amountCollected}
                onChange={(e) => setAmountCollected(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-dark-input border border-dark-border text-white text-xs focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-4">
          <label className="text-xs font-bold text-white mb-1.5 block">ملاحظات إضافية (اختياري)</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="مثال: العميل طلب رن الجرس مرتين، أو الدفع فودافون كاش..."
            className="w-full px-3.5 py-2 rounded-xl bg-dark-input border border-dark-border text-white text-xs focus:border-brand-500 focus:outline-none"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm shadow-xl shadow-brand-500/30 transition min-h-touch active:scale-[0.98]"
        >
          {submitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          <span>{isEditing ? 'حفظ التعديلات' : 'تسجيل الأوردر والبدء'}</span>
        </button>
      </form>
    </div>
  );
};
