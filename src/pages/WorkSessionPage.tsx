import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  ArrowRight,
} from 'lucide-react';
import { WorkSession } from '../types';
import { getAllSessions } from '../repositories/sessionsRepository';
import {
  calculateSessionDurations,
  formatDurationArabic,
} from '../services/workSession';
import { formatArabicDateTime, formatArabicDateOnly } from '../utils/date';
import { EmptyState } from '../components/EmptyState';

export const WorkSessionPage: React.FC = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function load() {
      try {
        const all = await getAllSessions();
        setSessions(all);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="pb-24 px-4 max-w-lg mx-auto animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mt-3 mb-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-xs text-dark-muted hover:text-white transition p-1"
        >
          <ArrowRight className="w-4 h-4" />
          <span>الرئيسية</span>
        </button>

        <h1 className="text-base font-extrabold text-white">سجل ورديات العمل</h1>
        <div className="w-8"></div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="لا توجد ورديات سابقة"
          description="سجل وردياتك اليومية لحساب ساعات العمل الصافية بدقة واستبعاد أوقات الراحة."
          actionLabel="العودة للرئيسية وبدء وردية"
          onAction={() => navigate('/')}
        />
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const durations = calculateSessionDurations(session);
            const isRunning = session.status === 'active' || session.status === 'paused';

            return (
              <div
                key={session.id}
                className={`p-4 rounded-2xl border transition ${
                  isRunning
                    ? 'bg-brand-500/10 border-brand-500/40 shadow-lg'
                    : 'bg-dark-card border border-dark-border'
                }`}
              >
                <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-dark-border/50">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        session.status === 'active'
                          ? 'bg-profit animate-ping'
                          : session.status === 'paused'
                          ? 'bg-warning'
                          : 'bg-dark-muted'
                      }`}
                    ></span>
                    <span className="font-extrabold text-white text-xs">
                      {session.status === 'active'
                        ? 'وردية جارية الآن'
                        : session.status === 'paused'
                        ? 'متوقفة مؤقتاً'
                        : 'وردية منتهية'}
                    </span>
                  </div>

                  <span className="text-xs text-dark-muted">
                    {formatArabicDateOnly(session.startTime.slice(0, 10))}
                  </span>
                </div>

                {/* Duration breakdown */}
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="p-2 rounded-xl bg-dark-input border border-dark-border">
                    <span className="text-[10px] text-dark-muted block">صافي العمل</span>
                    <span className="text-xs font-bold text-profit-light">
                      {formatDurationArabic(durations.netWorkSeconds)}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-dark-input border border-dark-border">
                    <span className="text-[10px] text-dark-muted block">وقت الراحة</span>
                    <span className="text-xs font-bold text-warning-light">
                      {formatDurationArabic(durations.pausedSeconds)}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-dark-input border border-dark-border">
                    <span className="text-[10px] text-dark-muted block">المسافة</span>
                    <span className="text-xs font-bold text-white">
                      {(session.trackedDistanceKm || 0).toFixed(1)} كم
                    </span>
                  </div>
                </div>

                {/* Timestamps & Odometer */}
                <div className="text-[11px] text-dark-muted space-y-1">
                  <div className="flex justify-between">
                    <span>البداية: {formatArabicDateTime(session.startTime)}</span>
                    {session.startingOdometerKm !== undefined && (
                      <span>عداد البداية: {session.startingOdometerKm} كم</span>
                    )}
                  </div>

                  {session.endTime && (
                    <div className="flex justify-between">
                      <span>النهاية: {formatArabicDateTime(session.endTime)}</span>
                      {session.endingOdometerKm !== undefined && (
                        <span>عداد النهاية: {session.endingOdometerKm} كم</span>
                      )}
                    </div>
                  )}

                  {session.pauseIntervals.length > 0 && (
                    <div className="text-[10px] text-dark-muted/80 pt-1">
                      عدد فترات التوقف المؤقت: {session.pauseIntervals.length}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
