import { Order, Expense, Settings } from '../types';

/**
 * Currency round helper to 2 decimal places (or piastres precision).
 */
export function roundCurrency(amount: number): number {
  if (isNaN(amount) || !isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Recognizes income from a single order.
 * - Delivered orders earn: deliveryFee + bonus + tip - riderDeductions - refundAmount.
 * - Cancelled or failed orders earn ONLY explicit cancellationCompensation if present.
 * - Other states (new, accepted, picked_up, on_the_way) do not earn recognized delivery income.
 */
export function calculateOrderRecognizedIncome(order: Order): number {
  if (order.status === 'delivered') {
    const gross = (order.deliveryFee || 0) + (order.bonus || 0) + (order.tip || 0);
    const deductions = order.riderDeductions || 0;
    const refunds = order.refundAmount || 0;
    const net = gross - deductions - refunds;
    return roundCurrency(Math.max(0, net));
  }

  if (order.status === 'cancelled' || order.status === 'failed') {
    return roundCurrency(Math.max(0, order.cancellationCompensation || 0));
  }

  return 0;
}

/**
 * Calculate total recognized income from an array of orders.
 */
export function calculateTotalRecognizedIncome(orders: Order[]): number {
  const total = orders.reduce((acc, order) => acc + calculateOrderRecognizedIncome(order), 0);
  return roundCurrency(total);
}

/**
 * Calculate total cash operating expenses paid in cash.
 * Only includes paid expenses with costTreatment === 'cash_expense'.
 */
export function calculatePaidExpenses(expenses: Expense[]): number {
  const total = expenses
    .filter((e) => e.paymentStatus === 'paid' && e.costTreatment === 'cash_expense')
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  return roundCurrency(total);
}

/**
 * Calculate unpaid operating expenses (e.g. credit, deferred repair bills).
 */
export function calculateUnpaidExpenses(expenses: Expense[]): number {
  const total = expenses
    .filter((e) => e.paymentStatus === 'unpaid')
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  return roundCurrency(total);
}

/**
 * Calculate Cash Result (النتيجة النقدية):
 * Recognized Income - Actual Paid Cash Expenses.
 */
export function calculateCashResult(recognizedIncome: number, paidExpenses: number): number {
  return roundCurrency(recognizedIncome - paidExpenses);
}

/**
 * Calculate Maintenance Accrual (استهلاك الصيانة التقديري):
 * eligible distance (km) * maintenance cost per km.
 */
export function calculateMaintenanceAccrual(distanceKm: number, maintenanceCostPerKm: number): number {
  if (distanceKm <= 0 || maintenanceCostPerKm <= 0) return 0;
  return roundCurrency(distanceKm * maintenanceCostPerKm);
}

export interface EconomicProfitParams {
  recognizedIncome: number;
  paidCashExpenses: number;
  unpaidExpenses: number;
  distanceKm: number;
  settings: Pick<Settings, 'maintenanceCostPerKm' | 'autoAccrueMaintenance'>;
  /**
   * If actual maintenance was already paid as a cash expense in paidCashExpenses,
   * we must prevent double counting by either subtracting only non-maintenance expenses
   * or deducting the accrual in place of paid maintenance.
   */
  paidMaintenanceExpenseAmount?: number;
}

/**
 * Calculate Economic Operating Profit (صافي الربح التشغيلي الاقتصادي):
 * Recognized Income - Paid Non-Maintenance Operating Expenses - Unpaid Expenses - Maintenance Accrual.
 * Prevents double-counting between actual paid maintenance bills and ongoing wear-and-tear accrual.
 */
export function calculateEconomicOperatingProfit(params: EconomicProfitParams): number {
  const {
    recognizedIncome,
    paidCashExpenses,
    unpaidExpenses,
    distanceKm,
    settings,
    paidMaintenanceExpenseAmount = 0,
  } = params;

  // Maintenance accrual calculation
  const maintenanceAccrual = settings.autoAccrueMaintenance
    ? calculateMaintenanceAccrual(distanceKm, settings.maintenanceCostPerKm)
    : 0;

  // If maintenance accrual is enabled, avoid double counting actual maintenance cash paid
  const adjustedPaidExpenses = settings.autoAccrueMaintenance
    ? Math.max(0, paidCashExpenses - paidMaintenanceExpenseAmount)
    : paidCashExpenses;

  const totalCosts = adjustedPaidExpenses + unpaidExpenses + maintenanceAccrual;
  return roundCurrency(recognizedIncome - totalCosts);
}

export interface ProductivityMetrics {
  netCashPerHour: number | null;
  economicProfitPerHour: number | null;
  avgEarningsPerCompletedOrder: number | null;
  distancePerCompletedOrder: number | null;
  revenuePerKm: number | null;
  operatingCostPerKm: number | null;
  completedOrdersPerHour: number | null;
}

/**
 * Safely computes productivity metrics without division by zero, NaN, or Infinity.
 */
export function calculateProductivityMetrics(data: {
  recognizedIncome: number;
  cashResult: number;
  economicProfit: number;
  totalPaidExpenses: number;
  completedOrdersCount: number;
  netWorkDurationSeconds: number;
  distanceKm: number;
}): ProductivityMetrics {
  const {
    recognizedIncome,
    cashResult,
    economicProfit,
    totalPaidExpenses,
    completedOrdersCount,
    netWorkDurationSeconds,
    distanceKm,
  } = data;

  const workHours = netWorkDurationSeconds > 0 ? netWorkDurationSeconds / 3600 : 0;

  // Net cash result per net work hour
  const netCashPerHour = workHours > 0 ? roundCurrency(cashResult / workHours) : null;

  // Economic profit per net work hour
  const economicProfitPerHour = workHours > 0 ? roundCurrency(economicProfit / workHours) : null;

  // Average delivery earnings per completed order
  const avgEarningsPerCompletedOrder =
    completedOrdersCount > 0 ? roundCurrency(recognizedIncome / completedOrdersCount) : null;

  // Distance per completed order
  const distancePerCompletedOrder =
    completedOrdersCount > 0 && distanceKm > 0 ? roundCurrency(distanceKm / completedOrdersCount) : null;

  // Revenue per kilometer
  const revenuePerKm = distanceKm > 0 ? roundCurrency(recognizedIncome / distanceKm) : null;

  // Operating cost per kilometer
  const operatingCostPerKm = distanceKm > 0 ? roundCurrency(totalPaidExpenses / distanceKm) : null;

  // Completed orders per hour
  const completedOrdersPerHour = workHours > 0 ? roundCurrency(completedOrdersCount / workHours) : null;

  return {
    netCashPerHour,
    economicProfitPerHour,
    avgEarningsPerCompletedOrder,
    distancePerCompletedOrder,
    revenuePerKm,
    operatingCostPerKm,
    completedOrdersPerHour,
  };
}
