import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Download,
  Printer,
  Calendar,
  Lock,
  Unlock,
  CheckCircle2,
  Wallet,
  Sparkles,
  BarChart,
  Info,
} from 'lucide-react';
import { Order, Expense, WorkSession, DailySummary, Settings } from '../types';
import { getAllOrders } from '../repositories/ordersRepository';
import { getAllExpenses } from '../repositories/expensesRepository';
import { getAllSessions } from '../repositories/sessionsRepository';
import { getSettings } from '../repositories/settingsRepository';
import {
  getAllSummaries,
  saveDailySummary,
} from '../repositories/summaryRepository';
import {
  calculateTotalRecognizedIncome,
  calculatePaidExpenses,
  calculateCashResult,
  calculateEconomicOperatingProfit,
  calculateProductivityMetrics,
} from '../services/profitCalculator';
import { calculateFuelConsumption } from '../services/fuelCalculator';
import { calculateSessionDurations, formatDurationArabic } from '../services/workSession';
import { exportOrdersCsv, exportExpensesCsv, downloadFile } from '../services/backup';
import { formatEGPStandard } from '../utils/currency';
import { getLocalDateString, formatArabicDateOnly } from '../utils/date';
import { MetricCard } from '../components/MetricCard';

export const ReportsPage: React.FC = () => {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  // Daily Closing confirmation state
  const [closingSuccess, setClosingSuccess] = useState<boolean>(false);

  const loadAll = async () => {
    try {
      const [allOrd, allExp, allSess, allSumm, appSet] = await Promise.all([
        getAllOrders(),
        getAllExpenses(),
        getAllSessions(),
        getAllSummaries(),
        getSettings(),
      ]);

      setOrders(allOrd);
      setExpenses(allExp);
      setSessions(allSess);
      setSummaries(allSumm);
      setSettings(appSet);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Filter records based on period
  const { filteredOrders, filteredExpenses, filteredSessions, dateRangeLabel } = useMemo(() => {
    if (period === 'day') {
      const ords = orders.filter((o) => o.createdAt.slice(0, 10) === selectedDate);
      const exps = expenses.filter((e) => e.date === selectedDate);
      const sess = sessions.filter((s) => s.startTime.slice(0, 10) === selectedDate);
      return {
        filteredOrders: ords,
        filteredExpenses: exps,
        filteredSessions: sess,
        dateRangeLabel: formatArabicDateOnly(selectedDate),
      };
    }

    if (period === 'week') {
      const curr = new Date(`${selectedDate}T12:00:00`);
      const first = curr.getDate() - curr.getDay(); // Sunday as start
      const startOfWeek = new Date(curr.setDate(first));
      const endOfWeek = new Date(curr.setDate(first + 6));

      const startStr = getLocalDateString(startOfWeek);
      const endStr = getLocalDateString(endOfWeek);

      const ords = orders.filter((o) => {
        const d = o.createdAt.slice(0, 10);
        return d >= startStr && d <= endStr;
      });
      const exps = expenses.filter((e) => e.date >= startStr && e.date <= endStr);
      const sess = sessions.filter((s) => {
        const d = s.startTime.slice(0, 10);
        return d >= startStr && d <= endStr;
      });

      return {
        filteredOrders: ords,
        filteredExpenses: exps,
        filteredSessions: sess,
        dateRangeLabel: `أسبوع: من ${startStr} إلى ${endStr}`,
      };
    }

    // Month
    const monthPrefix = selectedDate.slice(0, 7); // YYYY-MM
    const ords = orders.filter((o) => o.createdAt.startsWith(monthPrefix));
    const exps = expenses.filter((e) => e.date.startsWith(monthPrefix));
    const sess = sessions.filter((s) => s.startTime.startsWith(monthPrefix));

    return {
      filteredOrders: ords,
      filteredExpenses: exps,
      filteredSessions: sess,
      dateRangeLabel: `شهر: ${monthPrefix}`,
    };
  }, [orders, expenses, sessions, period, selectedDate]);

  // Financial calculations for selected period
  const completedOrders = filteredOrders.filter((o) => o.status === 'delivered');
  const cancelledOrders = filteredOrders.filter((o) => o.status === 'cancelled' || o.status === 'failed');
  const recognizedIncome = calculateTotalRecognizedIncome(filteredOrders);
  const paidExpenses = calculatePaidExpenses(filteredExpenses);
  const unpaidExpenses = filteredExpenses
    .filter((e) => e.paymentStatus === 'unpaid')
    .reduce((sum, e) => sum + e.amount, 0);
  const cashResult = calculateCashResult(recognizedIncome, paidExpenses);

  // Distance and Work Duration
  const totalNetSeconds = filteredSessions.reduce((sum, s) => {
    const d = calculateSessionDurations(s);
    return sum + d.netWorkSeconds;
  }, 0);

  const totalDistanceKm = filteredSessions.reduce(
    (sum, s) => sum + (s.trackedDistanceKm || 0),
    0
  );

  const economicProfit = settings
    ? calculateEconomicOperatingProfit({
        recognizedIncome,
        paidCashExpenses: paidExpenses,
        unpaidExpenses,
        distanceKm: totalDistanceKm,
        settings: {
          maintenanceCostPerKm: settings.maintenanceCostPerKm,
          autoAccrueMaintenance: settings.autoAccrueMaintenance,
        },
      })
    : cashResult;

  const fuelEstimate = settings
    ? calculateFuelConsumption(
        totalDistanceKm,
        settings.estimatedKmPerLiter,
        settings.fuelPricePerLiter
      )
    : { estimatedLiters: null, estimatedCost: null, isValid: false };

  const productivity = calculateProductivityMetrics({
    recognizedIncome,
    cashResult,
    economicProfit,
    totalPaidExpenses: paidExpenses,
    completedOrdersCount: completedOrders.length,
    netWorkDurationSeconds: totalNetSeconds,
    distanceKm: totalDistanceKm,
  });

  // Check if current selectedDate is closed in dailySummaries
  const existingSummary = summaries.find((s) => s.id === selectedDate);
  const isDayClosed = Boolean(existingSummary && existingSummary.isClosed);

  // Daily Closing Handler
  const handleCloseDay = async () => {
    try {
      const summary: DailySummary = {
        id: selectedDate,
        date: selectedDate,
        closedAt: new Date().toISOString(),
        isClosed: true,
        totalOrders: filteredOrders.length,
        deliveredOrders: completedOrders.length,
        cancelledOrders: cancelledOrders.length,
        recognizedIncome,
        paidExpenses,
        unpaidExpenses,
        maintenanceAccruals: settings
          ? totalDistanceKm * settings.maintenanceCostPerKm
          : 0,
        netCashResult: cashResult,
        economicProfit,
        distanceKm: totalDistanceKm,
        distanceSource: filteredSessions[0]?.distanceSource || 'gps',
        netWorkDurationSeconds: totalNetSeconds,
        fuelPurchasedAmount: filteredExpenses
          .filter((e) => e.category === 'fuel')
          .reduce((sum, e) => sum + e.amount, 0),
        estimatedFuelLiters: fuelEstimate.estimatedLiters || 0,
        estimatedFuelCost: fuelEstimate.estimatedCost || 0,
        revisions: existingSummary?.revisions || [],
      };

      await saveDailySummary(summary);
      setClosingSuccess(true);
      setTimeout(() => setClosingSuccess(false), 3000);
      loadAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'فشل إقفال اليوم');
    }
  };

  const handleExportOrdersCsv = () => {
    const csv = exportOrdersCsv(filteredOrders);
    downloadFile(csv, `orders-${selectedDate}.csv`, 'text/csv;charset=utf-8;');
  };

  const handleExportExpensesCsv = () => {
    const csv = exportExpensesCsv(filteredExpenses);
    downloadFile(csv, `expenses-${selectedDate}.csv`, 'text/csv;charset=utf-8;');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="pb-24 px-4 max-w-lg mx-auto animate-fadeIn print:p-0 print:max-w-none">
      {/* Title */}
      <div className="flex items-center justify-between mt-3 mb-3 print:hidden">
        <div>
          <h1 className="text-xl font-black text-white">التقارير والإقفال اليومي</h1>
          <p className="text-xs text-dark-muted">تحليل الأرباح التشغيلية وإصدار الكشوفات</p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrint}
            className="p-2 rounded-xl bg-dark-card border border-dark-border text-dark-muted hover:text-white transition"
            title="طباعة التقرير"
            aria-label="طباعة التقرير"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex p-1 bg-dark-card border border-dark-border rounded-xl mb-3 print:hidden">
        <button
          onClick={() => setPeriod('day')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
            period === 'day' ? 'bg-brand-500 text-white shadow-sm' : 'text-dark-muted hover:text-white'
          }`}
        >
          يومي
        </button>
        <button
          onClick={() => setPeriod('week')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
            period === 'week' ? 'bg-brand-500 text-white shadow-sm' : 'text-dark-muted hover:text-white'
          }`}
        >
          أسبوعي
        </button>
        <button
          onClick={() => setPeriod('month')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
            period === 'month' ? 'bg-brand-500 text-white shadow-sm' : 'text-dark-muted hover:text-white'
          }`}
        >
          شهري
        </button>
      </div>

      {/* Date Picker Input */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-dark-card border border-dark-border mb-4 print:hidden">
        <div className="flex items-center gap-2 text-xs">
          <Calendar className="w-4 h-4 text-brand-400" />
          <span className="font-semibold text-white">{dateRangeLabel}</span>
        </div>

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-2.5 py-1 rounded-xl bg-dark-input border border-dark-border text-white text-xs focus:border-brand-500 focus:outline-none"
        />
      </div>

      {/* Daily Closing Banner for Day view */}
      {period === 'day' && (
        <div
          className={`p-4 rounded-2xl border mb-4 flex items-center justify-between transition print:hidden ${
            isDayClosed
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-brand-500/10 border-brand-500/30'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                isDayClosed
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-brand-500/20 text-brand-300'
              }`}
            >
              {isDayClosed ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-xs font-bold text-white">
                {isDayClosed ? 'تم إقفال حسابات هذا اليوم' : 'إقفال حسابات اليوم'}
              </h2>
              <p className="text-[11px] text-dark-muted">
                {isDayClosed
                  ? `أُقفل في: ${existingSummary?.closedAt.slice(11, 16)}`
                  : 'حفظ لقطة رسمية للأرباح مع تتبع التعديلات اللاحقة'}
              </p>
            </div>
          </div>

          <button
            onClick={handleCloseDay}
            className={`px-4 py-2 rounded-xl font-bold text-xs shadow-md transition min-h-touch ${
              isDayClosed
                ? 'bg-dark-input border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20'
                : 'bg-brand-500 hover:bg-brand-600 text-white shadow-brand-500/25'
            }`}
          >
            {isDayClosed ? 'إعادة الإقفال' : 'إقفال اليوم الآن'}
          </button>
        </div>
      )}

      {closingSuccess && (
        <div className="mb-4 p-3 rounded-xl bg-profit-bg border border-profit/30 text-profit-light text-xs flex items-center gap-2 animate-fadeIn print:hidden">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>تم اعتماد وإقفال ملخص اليوم بنجاح وحفظ اللقطة في السجلات.</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <MetricCard
          title="النتيجة النقدية الصافية"
          value={formatEGPStandard(cashResult)}
          subtitle="كاش حقيقي بعد المصاريف"
          badge="كاش"
          icon={TrendingUp}
          variant={cashResult >= 0 ? 'profit' : 'expense'}
        />

        <MetricCard
          title="صافي الربح الاقتصادي"
          value={formatEGPStandard(economicProfit)}
          subtitle="بعد استهلاك الصيانة والآجل"
          badge="اقتصادي"
          icon={Sparkles}
          variant="brand"
        />

        <MetricCard
          title="إجمالي الدخل المحقق"
          value={formatEGPStandard(recognizedIncome)}
          subtitle={`${completedOrders.length} أوردر مكتمل`}
          icon={Wallet}
          variant="neutral"
        />

        <MetricCard
          title="إجمالي المصاريف"
          value={formatEGPStandard(paidExpenses)}
          subtitle={`${filteredExpenses.length} بنود مدفوعة`}
          icon={BarChart}
          variant="expense"
        />
      </div>

      {/* Performance & Productivity Report */}
      <div className="bg-dark-card border border-dark-border rounded-2xl p-4 mb-4">
        <h2 className="text-xs font-bold text-white mb-3">مؤشرات الأداء والكفاءة</h2>

        <div className="space-y-2.5 text-xs">
          <div className="flex justify-between py-1 border-b border-dark-border/40">
            <span className="text-dark-muted">صافي ساعات العمل:</span>
            <span className="font-semibold text-white">
              {formatDurationArabic(totalNetSeconds)}
            </span>
          </div>

          <div className="flex justify-between py-1 border-b border-dark-border/40">
            <span className="text-dark-muted">المسافة الإجمالية المقطوعة:</span>
            <span className="font-semibold text-white font-mono">{totalDistanceKm.toFixed(1)} كم</span>
          </div>

          <div className="flex justify-between py-1 border-b border-dark-border/40">
            <span className="text-dark-muted">صافي الكاش بالساعة:</span>
            <span className="font-bold text-profit-light font-mono">
              {productivity.netCashPerHour !== null
                ? formatEGPStandard(productivity.netCashPerHour)
                : '—'}
            </span>
          </div>

          <div className="flex justify-between py-1 border-b border-dark-border/40">
            <span className="text-dark-muted">الربح الاقتصادي بالساعة:</span>
            <span className="font-bold text-brand-300 font-mono">
              {productivity.economicProfitPerHour !== null
                ? formatEGPStandard(productivity.economicProfitPerHour)
                : '—'}
            </span>
          </div>

          <div className="flex justify-between py-1 border-b border-dark-border/40">
            <span className="text-dark-muted">متوسط دخل الأوردر المكتمل:</span>
            <span className="font-semibold text-white font-mono">
              {productivity.avgEarningsPerCompletedOrder !== null
                ? formatEGPStandard(productivity.avgEarningsPerCompletedOrder)
                : '—'}
            </span>
          </div>

          <div className="flex justify-between py-1 border-b border-dark-border/40">
            <span className="text-dark-muted">معدل التوصيل بالساعة:</span>
            <span className="font-semibold text-white font-mono">
              {productivity.completedOrdersPerHour !== null
                ? `${productivity.completedOrdersPerHour} أوردر/ساعة`
                : '—'}
            </span>
          </div>

          <div className="flex justify-between pt-1">
            <span className="text-dark-muted">تقدير استهلاك البنزين:</span>
            <span className="font-bold text-amber-300 font-mono">
              {fuelEstimate.estimatedLiters !== null ? `${fuelEstimate.estimatedLiters} لتر` : '—'}
              {fuelEstimate.estimatedCost !== null ? ` (~ ${formatEGPStandard(fuelEstimate.estimatedCost)})` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* CSV Export & Data Download */}
      <div className="bg-dark-card border border-dark-border rounded-2xl p-4 mb-4 print:hidden">
        <h2 className="text-xs font-bold text-white mb-2.5 flex items-center gap-1.5">
          <Download className="w-4 h-4 text-brand-400" />
          <span>تصدير البيانات (Excel / CSV)</span>
        </h2>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleExportOrdersCsv}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-dark-input hover:bg-white/5 border border-dark-border text-white text-xs font-medium transition min-h-touch"
          >
            <span>كشف الأوردرات (CSV)</span>
          </button>

          <button
            onClick={handleExportExpensesCsv}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-dark-input hover:bg-white/5 border border-dark-border text-white text-xs font-medium transition min-h-touch"
          >
            <span>كشف المصروفات (CSV)</span>
          </button>
        </div>
      </div>

      {/* Historical Audit Log (if day closed has revisions) */}
      {existingSummary && existingSummary.revisions && existingSummary.revisions.length > 0 && (
        <div className="bg-dark-card border border-dark-border rounded-2xl p-4 mb-4">
          <h2 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-amber-400" />
            <span>سجل التعديلات بعد الإقفال (Audit Trail)</span>
          </h2>
          <div className="space-y-2">
            {existingSummary.revisions.map((rev, i) => (
              <div key={i} className="p-2.5 rounded-xl bg-dark-input text-[11px] text-dark-muted">
                <div className="flex justify-between font-bold text-white mb-0.5">
                  <span>تعديل رقم {i + 1}</span>
                  <span className="font-mono text-dark-muted">{rev.revisedAt.slice(0, 16)}</span>
                </div>
                <p>{rev.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
