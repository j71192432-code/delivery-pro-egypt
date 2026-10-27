import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  Receipt,
  Navigation,
  FileCheck,
  TrendingUp,
  Wallet,
  ArrowDownRight,
  PackageCheck,
  Bike,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Order, Expense, WorkSession, Settings } from '../types';
import { getAllOrders, updateOrder } from '../repositories/ordersRepository';
import { getAllExpenses } from '../repositories/expensesRepository';
import { getActiveOrPausedSession } from '../repositories/sessionsRepository';
import { getSettings } from '../repositories/settingsRepository';
import {
  calculateTotalRecognizedIncome,
  calculatePaidExpenses,
  calculateCashResult,
  calculateEconomicOperatingProfit,
  calculateProductivityMetrics,
} from '../services/profitCalculator';
import { calculateFuelConsumption } from '../services/fuelCalculator';
import { calculateSessionDurations } from '../services/workSession';
import { formatEGPStandard } from '../utils/currency';
import { isToday, getLocalDateString } from '../utils/date';
import { MetricCard } from '../components/MetricCard';
import { SessionWidget } from '../components/SessionWidget';
import { OrderCard } from '../components/OrderCard';
import { EmptyState } from '../components/EmptyState';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [currentSession, setCurrentSession] = useState<WorkSession | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    try {
      const [allOrders, allExpenses, activeSession, appSettings] = await Promise.all([
        getAllOrders(),
        getAllExpenses(),
        getActiveOrPausedSession(),
        getSettings(),
      ]);

      setOrders(allOrders);
      setExpenses(allExpenses);
      setCurrentSession(activeSession);
      setSettings(appSettings);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Fetch user coords once if permitted
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        () => {},
        { timeout: 5000, maximumAge: 60000 }
      );
    }
  }, [loadData]);

  // Filter today's records
  const todayOrders = orders.filter((o) => isToday(o.createdAt));
  const todayExpenses = expenses.filter((e) => isToday(e.date));

  // Order Counts
  const completedOrders = todayOrders.filter((o) => o.status === 'delivered');
  const activeOrders = orders.filter(
    (o) => o.status === 'new' || o.status === 'accepted' || o.status === 'picked_up' || o.status === 'on_the_way'
  );

  // Financials
  const recognizedIncome = calculateTotalRecognizedIncome(todayOrders);
  const paidExpenses = calculatePaidExpenses(todayExpenses);
  const cashResult = calculateCashResult(recognizedIncome, paidExpenses);

  // Distance & Session Durations
  const sessionDurations = currentSession ? calculateSessionDurations(currentSession) : { netWorkSeconds: 0 };
  const trackedDistance = currentSession?.trackedDistanceKm || 0;

  // Maintenance & Economic Profit
  const economicProfit = settings
    ? calculateEconomicOperatingProfit({
        recognizedIncome,
        paidCashExpenses: paidExpenses,
        unpaidExpenses: todayExpenses
          .filter((e) => e.paymentStatus === 'unpaid')
          .reduce((sum, e) => sum + e.amount, 0),
        distanceKm: trackedDistance,
        settings: {
          maintenanceCostPerKm: settings.maintenanceCostPerKm,
          autoAccrueMaintenance: settings.autoAccrueMaintenance,
        },
      })
    : cashResult;

  // Fuel Calculations
  const fuelResult = settings
    ? calculateFuelConsumption(
        trackedDistance,
        settings.estimatedKmPerLiter,
        settings.fuelPricePerLiter
      )
    : { estimatedLiters: null, estimatedCost: null, isValid: false };

  // Productivity Metrics
  const productivity = calculateProductivityMetrics({
    recognizedIncome,
    cashResult,
    economicProfit,
    totalPaidExpenses: paidExpenses,
    completedOrdersCount: completedOrders.length,
    netWorkDurationSeconds: sessionDurations.netWorkSeconds,
    distanceKm: trackedDistance,
  });

  const handleStatusChange = async (orderId: string, nextStatus: any) => {
    try {
      await updateOrder(orderId, { status: nextStatus });
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'فشل تغيير حالة الأوردر');
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
      {/* Work Session Controller Widget */}
      <div className="mt-3">
        <SessionWidget
          currentSession={currentSession}
          onSessionUpdated={(s) => {
            setCurrentSession(s);
            loadData();
          }}
          gpsAccuracyThreshold={settings?.gpsAccuracyThreshold}
        />
      </div>

      {/* Quick Action Grid */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <button
          onClick={() => navigate('/orders/new')}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/25 transition active:scale-95 min-h-touch"
        >
          <PlusCircle className="w-5 h-5 mb-1" />
          <span className="text-xs font-bold">أوردر جديد</span>
        </button>

        <button
          onClick={() => navigate('/expenses')}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-dark-card hover:bg-dark-cardHover border border-dark-border text-white transition active:scale-95 min-h-touch"
        >
          <Receipt className="w-5 h-5 mb-1 text-expense-light" />
          <span className="text-xs font-medium">تسجيل مصروف</span>
        </button>

        <button
          onClick={() => navigate('/map')}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-dark-card hover:bg-dark-cardHover border border-dark-border text-white transition active:scale-95 min-h-touch"
        >
          <Navigation className="w-5 h-5 mb-1 text-brand-400" />
          <span className="text-xs font-medium">الخريطة</span>
        </button>

        <button
          onClick={() => navigate('/reports')}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-dark-card hover:bg-dark-cardHover border border-dark-border text-white transition active:scale-95 min-h-touch"
        >
          <FileCheck className="w-5 h-5 mb-1 text-emerald-400" />
          <span className="text-xs font-medium">إقفال اليوم</span>
        </button>
      </div>

      {/* Main Financial Highlights */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-brand-400" />
            <span>ملخص أرباح اليوم</span>
          </h2>
          <span className="text-[11px] text-dark-muted font-mono">{getLocalDateString()}</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Net Cash Result */}
          <MetricCard
            title="النتيجة النقدية الصافية"
            value={formatEGPStandard(cashResult)}
            subtitle="الدخل المحقق - المصاريف الفعلية"
            badge="كاش اليوم"
            icon={TrendingUp}
            variant={cashResult >= 0 ? 'profit' : 'expense'}
          />

          {/* Economic Operating Profit */}
          <MetricCard
            title="صافي الربح الاقتصادي"
            value={formatEGPStandard(economicProfit)}
            subtitle="مخصوماً منه استهلاك الصيانة"
            badge="تشغيلي"
            icon={Sparkles}
            variant="brand"
          />

          {/* Today's Recognized Delivery Income */}
          <MetricCard
            title="الدخل المحقق (عمولات)"
            value={formatEGPStandard(recognizedIncome)}
            subtitle={`${completedOrders.length} أوردر مكتمل`}
            icon={PackageCheck}
            variant="neutral"
          />

          {/* Today's Paid Operating Expenses */}
          <MetricCard
            title="المصاريف المدفوعة"
            value={formatEGPStandard(paidExpenses)}
            subtitle={`${todayExpenses.length} بنود مصروفات`}
            icon={ArrowDownRight}
            variant="expense"
          />
        </div>
      </div>

      {/* Operational & Productivity Metrics */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>معدلات الإنتاجية والتشغيل</span>
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-2xl bg-dark-card border border-dark-border text-center">
            <div className="text-[11px] text-dark-muted mb-1">الربح بالساعة</div>
            <div className="text-sm font-black text-profit-light">
              {productivity.netCashPerHour !== null
                ? formatEGPStandard(productivity.netCashPerHour)
                : '—'}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-dark-card border border-dark-border text-center">
            <div className="text-[11px] text-dark-muted mb-1">متوسط الأوردر</div>
            <div className="text-sm font-black text-white">
              {productivity.avgEarningsPerCompletedOrder !== null
                ? formatEGPStandard(productivity.avgEarningsPerCompletedOrder)
                : '—'}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-dark-card border border-dark-border text-center">
            <div className="text-[11px] text-dark-muted mb-1">استهلاك الوقود</div>
            <div className="text-sm font-black text-amber-300">
              {fuelResult.estimatedLiters !== null ? `${fuelResult.estimatedLiters} لتر` : '—'}
            </div>
            {fuelResult.estimatedCost !== null && (
              <div className="text-[10px] text-dark-muted">
                ~ {formatEGPStandard(fuelResult.estimatedCost)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Orders List */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-brand-400" />
              <span>الأوردرات الجارية</span>
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-brand-500/20 text-brand-300 border border-brand-500/30">
              {activeOrders.length}
            </span>
          </div>

          <button
            onClick={() => navigate('/orders')}
            className="text-xs text-brand-400 hover:text-brand-300 font-semibold"
          >
            عرض الكل
          </button>
        </div>

        {activeOrders.length === 0 ? (
          <EmptyState
            icon={Bike}
            title="لا توجد أوردرات نشطة الآن"
            description="ابدأ بإضافة أول أوردر لمتابعة خط السير وحساب عمولة التوصيل بدقة."
            actionLabel="إضافة أوردر جديد"
            onAction={() => navigate('/orders/new')}
          />
        ) : (
          <div className="space-y-3">
            {activeOrders.map((order) => (
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
    </div>
  );
};
