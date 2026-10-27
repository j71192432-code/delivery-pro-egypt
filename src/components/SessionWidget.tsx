import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Square,
  Clock,
  Compass,
  Gauge,
  AlertCircle,
} from 'lucide-react';
import { WorkSession } from '../types';
import {
  calculateSessionDurations,
  formatTimeDigital,
  formatDurationArabic,
} from '../services/workSession';
import {
  startWorkSession,
  pauseWorkSession,
  resumeWorkSession,
  endWorkSession,
  updateSessionDistance,
} from '../repositories/sessionsRepository';
import { isValidGpsStep, GpsPoint } from '../services/distance';

interface SessionWidgetProps {
  currentSession: WorkSession | null;
  onSessionUpdated: (session: WorkSession | null) => void;
  gpsAccuracyThreshold?: number;
}

export const SessionWidget: React.FC<SessionWidgetProps> = ({
  currentSession,
  onSessionUpdated,
  gpsAccuracyThreshold = 40,
}) => {
  const [seconds, setSeconds] = useState<number>(0);
  const [showStartModal, setShowStartModal] = useState<boolean>(false);
  const [showEndModal, setShowEndModal] = useState<boolean>(false);
  const [startOdoInput, setStartOdoInput] = useState<string>('');
  const [endOdoInput, setEndOdoInput] = useState<string>('');
  const [isGpsActive, setIsGpsActive] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [lastPoint, setLastPoint] = useState<GpsPoint | null>(null);
  const [distanceKm, setDistanceKm] = useState<number>(0);

  // Sync state with prop
  useEffect(() => {
    if (currentSession) {
      setDistanceKm(currentSession.trackedDistanceKm || 0);
      const durations = calculateSessionDurations(currentSession);
      setSeconds(durations.netWorkSeconds);
    } else {
      setSeconds(0);
      setDistanceKm(0);
      setIsGpsActive(false);
    }
  }, [currentSession]);

  // Live timer tick
  useEffect(() => {
    if (!currentSession || currentSession.status !== 'active') return;

    const interval = setInterval(() => {
      const durations = calculateSessionDurations(currentSession);
      setSeconds(durations.netWorkSeconds);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentSession]);

  // Foreground GPS tracking
  useEffect(() => {
    if (!isGpsActive || !currentSession || currentSession.status !== 'active') {
      return;
    }

    if (!navigator.geolocation) {
      setGpsError('متصفحك لا يدعم تحديد الموقع الجغرافي');
      setIsGpsActive(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const newPoint: GpsPoint = {
          latitude,
          longitude,
          accuracy,
          timestamp: position.timestamp || Date.now(),
        };

        if (isValidGpsStep(lastPoint, newPoint, gpsAccuracyThreshold)) {
          if (lastPoint) {
            // Add distance
            const dLat = ((newPoint.latitude - lastPoint.latitude) * Math.PI) / 180;
            const dLon = ((newPoint.longitude - lastPoint.longitude) * Math.PI) / 180;
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos((lastPoint.latitude * Math.PI) / 180) *
                Math.cos((newPoint.latitude * Math.PI) / 180) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const stepKm = 6371 * c;

            const updatedTotal = Math.round((distanceKm + stepKm) * 100) / 100;
            setDistanceKm(updatedTotal);
            updateSessionDistance(currentSession.id, updatedTotal).catch(console.error);
          }
          setLastPoint(newPoint);
          setGpsError(null);
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError('تم رفض إذن الوصول للموقع');
        } else if (err.code === err.TIMEOUT) {
          setGpsError('مهلة تحديد الموقع انتهت');
        } else {
          setGpsError('تعذر قراءة الموقع حالياً');
        }
        setIsGpsActive(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isGpsActive, currentSession, lastPoint, distanceKm, gpsAccuracyThreshold]);

  const handleStart = async () => {
    try {
      const odo = startOdoInput.trim() ? parseFloat(startOdoInput) : undefined;
      const session = await startWorkSession({
        startingOdometerKm: odo,
        distanceSource: isGpsActive ? 'gps' : 'odometer',
      });
      onSessionUpdated(session);
      setShowStartModal(false);
      setStartOdoInput('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'فشل بدء الوردية');
    }
  };

  const handlePause = async () => {
    if (!currentSession) return;
    try {
      const session = await pauseWorkSession(currentSession.id);
      onSessionUpdated(session);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'فشل الإيقاف المؤقت');
    }
  };

  const handleResume = async () => {
    if (!currentSession) return;
    try {
      const session = await resumeWorkSession(currentSession.id);
      onSessionUpdated(session);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'فشل استئناف الوردية');
    }
  };

  const handleEnd = async () => {
    if (!currentSession) return;
    try {
      const endOdo = endOdoInput.trim() ? parseFloat(endOdoInput) : undefined;

      // Validate odometer sequence if provided
      if (
        currentSession.startingOdometerKm !== undefined &&
        endOdo !== undefined &&
        endOdo < currentSession.startingOdometerKm
      ) {
        alert(
          `قراءة نهاية العداد (${endOdo} كم) لا يمكن أن تكون أقل من قراءة البداية (${currentSession.startingOdometerKm} كم)`
        );
        return;
      }

      let finalDist = distanceKm;
      let source = currentSession.distanceSource;

      // Prefer odometer if valid
      if (
        currentSession.startingOdometerKm !== undefined &&
        endOdo !== undefined &&
        endOdo >= currentSession.startingOdometerKm
      ) {
        finalDist = endOdo - currentSession.startingOdometerKm;
        source = 'odometer';
      }

      await endWorkSession(currentSession.id, {
        endingOdometerKm: endOdo,
        finalTrackedDistanceKm: finalDist,
        distanceSource: source,
      });

      setIsGpsActive(false);
      setShowEndModal(false);
      setEndOdoInput('');
      onSessionUpdated(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'فشل إنهاء الوردية');
    }
  };

  return (
    <>
      <div className="bg-gradient-to-br from-dark-card to-dark-cardHover border border-brand-500/30 rounded-2xl p-4 shadow-lg mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              {currentSession?.status === 'active' ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-profit opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-profit"></span>
                </>
              ) : currentSession?.status === 'paused' ? (
                <span className="relative inline-flex rounded-full h-3 w-3 bg-warning"></span>
              ) : (
                <span className="relative inline-flex rounded-full h-3 w-3 bg-dark-muted/40"></span>
              )}
            </span>
            <h2 className="text-sm font-bold text-white">
              {currentSession?.status === 'active'
                ? 'وردية العمل نشطة'
                : currentSession?.status === 'paused'
                ? 'الوردية متوقفة مؤقتاً'
                : 'الوردية متوقفة'}
            </h2>
          </div>

          {currentSession && (
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => setIsGpsActive(!isGpsActive)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition ${
                  isGpsActive
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-dark-input text-dark-muted border-dark-border'
                }`}
                title="تتبع GPS أثناء تشغيل الوردية"
              >
                <Compass className={`w-3.5 h-3.5 ${isGpsActive ? 'animate-spin' : ''}`} />
                <span>GPS {isGpsActive ? 'مفعّل' : 'معطل'}</span>
              </button>
            </div>
          )}
        </div>

        {gpsError && (
          <div className="mb-3 p-2 rounded-xl bg-expense-bg border border-expense/30 text-expense-light text-xs flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{gpsError}</span>
          </div>
        )}

        {/* Live Counters */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-xl bg-dark-input border border-dark-border flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand-500/20 text-brand-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-dark-muted">صافي وقت العمل</div>
              <div className="text-lg font-black text-white font-mono tracking-wider">
                {currentSession ? formatTimeDigital(seconds) : '00:00:00'}
              </div>
              {currentSession && seconds > 60 && (
                <div className="text-[11px] text-brand-300">{formatDurationArabic(seconds)}</div>
              )}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-dark-input border border-dark-border flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-dark-muted">المسافة المسجلة</div>
              <div className="text-lg font-black text-white">
                {distanceKm.toFixed(1)} <span className="text-xs font-normal text-dark-muted">كم</span>
              </div>
              <div className="text-[11px] text-dark-muted">
                {currentSession?.startingOdometerKm !== undefined
                  ? `بداية العداد: ${currentSession.startingOdometerKm}`
                  : 'عبر الـ GPS'}
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex gap-2">
          {!currentSession ? (
            <button
              onClick={() => setShowStartModal(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm shadow-lg shadow-brand-500/30 transition min-h-touch"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>بدء وردية جديدة</span>
            </button>
          ) : currentSession.status === 'active' ? (
            <>
              <button
                onClick={handlePause}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-warning/20 hover:bg-warning/30 border border-warning/40 text-warning-light font-bold text-sm transition min-h-touch"
              >
                <Pause className="w-4 h-4" />
                <span>إيقاف مؤقت</span>
              </button>

              <button
                onClick={() => setShowEndModal(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-expense hover:bg-expense-dark text-white font-bold text-sm shadow-lg shadow-expense/25 transition min-h-touch"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>إنهاء الوردية</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleResume}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-profit hover:bg-profit-dark text-white font-bold text-sm shadow-lg shadow-profit/25 transition min-h-touch"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>استئناف الوردية</span>
              </button>

              <button
                onClick={() => setShowEndModal(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-expense hover:bg-expense-dark text-white font-bold text-sm shadow-lg shadow-expense/25 transition min-h-touch"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>إنهاء الوردية</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Start Session Modal */}
      {showStartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-dark-card border border-dark-border rounded-2xl p-5 shadow-2xl text-right">
            <h3 className="text-lg font-bold text-white mb-2">بدء وردية عمل جديدة</h3>
            <p className="text-xs text-dark-muted mb-4">
              يمكنك تسجيل قراءة عداد الموتوسيكل الحالية لاحتساب المسافة بدقة، أو الاعتماد على GPS.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-medium text-white mb-1.5">
                قراءة العداد الحالية (كيلومتر) - اختياري:
              </label>
              <input
                type="number"
                value={startOdoInput}
                onChange={(e) => setStartOdoInput(e.target.value)}
                placeholder="مثال: 12450"
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark-input border border-dark-border text-white text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowStartModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-dark-border text-dark-muted text-sm font-medium hover:bg-white/5 min-h-touch"
              >
                إلغاء
              </button>
              <button
                onClick={handleStart}
                className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm shadow-lg shadow-brand-500/25 min-h-touch"
              >
                بدء العمل الآن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Session Modal */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-dark-card border border-dark-border rounded-2xl p-5 shadow-2xl text-right">
            <h3 className="text-lg font-bold text-white mb-2">إنهاء وردية العمل</h3>
            <p className="text-xs text-dark-muted mb-4">
              أدخل قراءة نهاية العداد لاعتماد مسافة الوردية أو اتركها فارغة لاستخدام مسافة GPS.
            </p>

            {currentSession?.startingOdometerKm !== undefined && (
              <div className="mb-3 p-2.5 rounded-xl bg-dark-input text-xs text-dark-muted">
                قراءة بداية العداد: <span className="font-bold text-white">{currentSession.startingOdometerKm} كم</span>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-xs font-medium text-white mb-1.5">
                قراءة نهاية العداد (كيلومتر):
              </label>
              <input
                type="number"
                value={endOdoInput}
                onChange={(e) => setEndOdoInput(e.target.value)}
                placeholder="مثال: 12520"
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark-input border border-dark-border text-white text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowEndModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-dark-border text-dark-muted text-sm font-medium hover:bg-white/5 min-h-touch"
              >
                رجوع
              </button>
              <button
                onClick={handleEnd}
                className="flex-1 py-2.5 rounded-xl bg-expense hover:bg-expense-dark text-white font-bold text-sm shadow-lg shadow-expense/25 min-h-touch"
              >
                تأكيد الإنهاء
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
