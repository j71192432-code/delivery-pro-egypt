import React, { useState, useEffect } from 'react';
import {
  Navigation,
  Compass,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Info,
  Bike,
} from 'lucide-react';
import { Order } from '../types';
import { getAllOrders } from '../repositories/ordersRepository';
import {
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsSearchUrl,
} from '../services/googleMaps';
import {
  calculateHaversineDistanceKm,
  isValidCoordinate,
} from '../services/distance';

export const MapPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Manual Destination tool
  const [customDestination, setCustomDestination] = useState<string>('');
  const [destLat, setDestLat] = useState<string>('');
  const [destLng, setDestLng] = useState<string>('');
  const [directDistance, setDirectDistance] = useState<number | null>(null);
  const [copiedCoords, setCopiedCoords] = useState<boolean>(false);

  useEffect(() => {
    async function load() {
      try {
        const all = await getAllOrders();
        // filter active orders
        setOrders(all.filter((o) => ['new', 'accepted', 'picked_up', 'on_the_way'].includes(o.status)));
      } catch (err) {
        console.error(err);
      }
    }
    load();
    fetchCurrentLocation(false);
  }, []);

  const fetchCurrentLocation = (explicitUserAction: boolean = true) => {
    if (!navigator.geolocation) {
      if (explicitUserAction) setGpsError('متصفحك أو جهازك لا يدعم خاصية تحديد الموقع');
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentLat(pos.coords.latitude);
        setCurrentLng(pos.coords.longitude);
        setAccuracy(Math.round(pos.coords.accuracy));
        setGpsLoading(false);

        // Recalculate direct distance if dest coords present
        if (destLat && destLng) {
          const dLat = parseFloat(destLat);
          const dLng = parseFloat(destLng);
          if (isValidCoordinate(dLat, dLng)) {
            const dist = calculateHaversineDistanceKm(pos.coords.latitude, pos.coords.longitude, dLat, dLng);
            setDirectDistance(dist);
          }
        }
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError('تم رفض إذن تحديد الموقع. يمكنك تفعيله من إعدادات المتصفح.');
        } else if (err.code === err.TIMEOUT) {
          setGpsError('استغرقت استجابة الموقع وقتاً طويلاً. يرجى المحاولة في مكان مفتوح.');
        } else {
          setGpsError('تعذر قراءة الموقع الحالي.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  const handleCalculateDirectDist = () => {
    if (currentLat === null || currentLng === null) {
      alert('يرجى تحديد موقعك الحالي أولاً');
      return;
    }
    const dLat = parseFloat(destLat);
    const dLng = parseFloat(destLng);

    if (!isValidCoordinate(dLat, dLng)) {
      alert('إحداثيات الوجهة غير صالحة');
      return;
    }

    const dist = calculateHaversineDistanceKm(currentLat, currentLng, dLat, dLng);
    setDirectDistance(dist);
  };

  const handleCopyCoords = () => {
    if (currentLat !== null && currentLng !== null) {
      navigator.clipboard.writeText(`${currentLat.toFixed(6)}, ${currentLng.toFixed(6)}`);
      setCopiedCoords(true);
      setTimeout(() => setCopiedCoords(false), 2000);
    }
  };

  const getCustomDirectionsUrl = () => {
    return buildGoogleMapsDirectionsUrl({
      destAddress: customDestination,
      destLatitude: destLat ? parseFloat(destLat) : undefined,
      destLongitude: destLng ? parseFloat(destLng) : undefined,
      originLatitude: currentLat || undefined,
      originLongitude: currentLng || undefined,
    });
  };

  return (
    <div className="pb-24 px-4 max-w-lg mx-auto animate-fadeIn">
      {/* Title */}
      <div className="mt-3 mb-4">
        <h1 className="text-xl font-black text-white">الملاحة والخرائط</h1>
        <p className="text-xs text-dark-muted">توجيه Google Maps والمسافات التقديرية</p>
      </div>

      {/* GPS Status Card */}
      <div className="bg-dark-card border border-dark-border rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-brand-500/20 text-brand-400">
              <Compass className={`w-5 h-5 ${gpsLoading ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h2 className="text-xs font-bold text-white">موقعي الحالي</h2>
              <div className="text-[11px] text-dark-muted">
                {currentLat !== null && currentLng !== null
                  ? `${currentLat.toFixed(5)}, ${currentLng.toFixed(5)}`
                  : 'الموقع غير محدد بعد'}
              </div>
            </div>
          </div>

          <button
            onClick={() => fetchCurrentLocation(true)}
            disabled={gpsLoading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-md shadow-brand-500/25 transition min-h-touch"
          >
            <span>{gpsLoading ? 'جاري التحديد...' : 'تحديث موقعي'}</span>
          </button>
        </div>

        {gpsError && (
          <div className="p-2.5 rounded-xl bg-expense-bg border border-expense/30 text-expense-light text-xs flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{gpsError}</span>
          </div>
        )}

        {accuracy !== null && (
          <div className="flex items-center justify-between text-xs text-dark-muted pt-2 border-t border-dark-border/60">
            <span>دقة الإشارة الحالية:</span>
            <span className="font-bold text-emerald-400">± {accuracy} متر</span>
          </div>
        )}

        {currentLat !== null && currentLng !== null && (
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleCopyCoords}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-dark-input hover:bg-white/5 border border-dark-border text-xs text-white transition min-h-touch"
            >
              {copiedCoords ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCoords ? 'تم النسخ' : 'نسخ الإحداثيات'}</span>
            </button>

            <a
              href={buildGoogleMapsSearchUrl(`${currentLat},${currentLng}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-dark-input hover:bg-white/5 border border-dark-border text-xs text-brand-300 transition min-h-touch"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>عرض موقعي بالخريطة</span>
            </a>
          </div>
        )}
      </div>

      {/* Limitation Notice */}
      <div className="p-3.5 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-xs text-brand-200 mb-4 flex items-start gap-2.5 leading-relaxed">
        <Info className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block text-white mb-0.5">توضيح حول مسار الطرق:</span>
          المسافة المحسوبة محلياً في التطبيق هي <strong className="text-white">"المسافة المباشرة التقديرية"</strong> (خط مستقيم).
          عند الضغط على "فتح في Google Maps"، يتم فتح تطبيق الخرائط لتوجيهك عبر المسار الأسرع لحركة المرور.
        </div>
      </div>

      {/* Manual Destination Direct Distance Calculator */}
      <div className="bg-dark-card border border-dark-border rounded-2xl p-4 mb-4">
        <h2 className="text-xs font-bold text-white mb-3 flex items-center gap-1.5">
          <Navigation className="w-4 h-4 text-brand-400" />
          <span>توجيه إلى وجهة أو إحداثيات مخصصة</span>
        </h2>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-dark-muted mb-1 block">
              اسم العنوان أو المكان في مصر:
            </label>
            <input
              type="text"
              value={customDestination}
              onChange={(e) => setCustomDestination(e.target.value)}
              placeholder="مثال: شارع التحرير الدقي، سيتي ستارز مدينة نصر..."
              className="w-full px-3 py-2 rounded-xl bg-dark-input border border-dark-border text-white text-xs focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium text-dark-muted mb-1 block">خط العرض (Lat):</label>
              <input
                type="number"
                step="0.000001"
                value={destLat}
                onChange={(e) => setDestLat(e.target.value)}
                placeholder="مثال: 30.0444"
                className="w-full px-3 py-2 rounded-xl bg-dark-input border border-dark-border text-white text-xs font-mono focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-dark-muted mb-1 block">خط الطول (Lng):</label>
              <input
                type="number"
                step="0.000001"
                value={destLng}
                onChange={(e) => setDestLng(e.target.value)}
                placeholder="مثال: 31.2357"
                className="w-full px-3 py-2 rounded-xl bg-dark-input border border-dark-border text-white text-xs font-mono focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          {destLat && destLng && (
            <button
              type="button"
              onClick={handleCalculateDirectDist}
              className="w-full py-2 rounded-xl bg-dark-input border border-brand-500/40 text-brand-300 text-xs font-semibold hover:bg-brand-500/20 transition min-h-touch"
            >
              حساب المسافة المباشرة التقديرية
            </button>
          )}

          {directDistance !== null && (
            <div className="p-3 rounded-xl bg-brand-500/15 border border-brand-500/30 text-center">
              <span className="text-xs text-dark-muted block">المسافة المباشرة التقديرية:</span>
              <span className="text-xl font-extrabold text-white font-mono">{directDistance} كم</span>
            </div>
          )}

          <a
            href={getCustomDirectionsUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-lg shadow-brand-500/25 transition min-h-touch ${
              !customDestination.trim() && !destLat.trim() ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            <Navigation className="w-4 h-4" />
            <span>فتح الاتجاهات في Google Maps</span>
          </a>
        </div>
      </div>

      {/* Active Orders Navigation List */}
      <div>
        <h2 className="text-xs font-bold text-white mb-2.5 flex items-center gap-1.5">
          <Bike className="w-4 h-4 text-emerald-400" />
          <span>عناوين الأوردرات الجارية للتوصيل</span>
        </h2>

        {orders.length === 0 ? (
          <div className="p-6 rounded-2xl bg-dark-card border border-dark-border text-center text-xs text-dark-muted">
            لا توجد أوردرات جارية حالياً بحاجة للملاحة.
          </div>
        ) : (
          <div className="space-y-2.5">
            {orders.map((o) => {
              const url = buildGoogleMapsDirectionsUrl({
                destAddress: o.address,
                destLatitude: o.latitude,
                destLongitude: o.longitude,
                originLatitude: currentLat || undefined,
                originLongitude: currentLng || undefined,
              });

              let dist: number | null = null;
              if (currentLat !== null && currentLng !== null && o.latitude && o.longitude) {
                dist = calculateHaversineDistanceKm(currentLat, currentLng, o.latitude, o.longitude);
              }

              return (
                <div
                  key={o.id}
                  className="p-3.5 rounded-2xl bg-dark-card border border-dark-border flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-extrabold text-white text-xs">#{o.orderNumber}</span>
                      {o.area && (
                        <span className="text-[11px] text-brand-300 font-medium">({o.area})</span>
                      )}
                    </div>
                    <p className="text-xs text-dark-muted line-clamp-1">{o.address}</p>
                    {dist !== null && (
                      <span className="text-[10px] text-emerald-400 font-mono mt-0.5 block">
                        المسافة المباشرة التقديرية: ~ {dist} كم
                      </span>
                    )}
                  </div>

                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shrink-0 shadow-md shadow-brand-500/20 transition min-h-touch"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>ملاحة</span>
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
