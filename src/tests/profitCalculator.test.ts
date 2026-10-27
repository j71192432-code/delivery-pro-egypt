import { describe, it, expect } from 'vitest';
import {
  calculateOrderRecognizedIncome,
  calculateTotalRecognizedIncome,
  calculatePaidExpenses,
  calculateCashResult,
  calculateMaintenanceAccrual,
  calculateEconomicOperatingProfit,
  calculateProductivityMetrics,
} from '../services/profitCalculator';
import { Order, Expense } from '../types';

describe('A. Financial Tests (اختبارات الحسابات المالية)', () => {
  // A.1
  it('1. One completed order with a 50 EGP delivery fee and no expenses produces 50 EGP recognized income', () => {
    const order: Order = {
      id: 'ord-1',
      orderNumber: 1001,
      createdAt: '2026-10-27T10:00:00Z',
      updatedAt: '2026-10-27T10:30:00Z',
      address: 'المعادي، القاهرة',
      city: 'القاهرة',
      deliveryFee: 50,
      bonus: 0,
      tip: 0,
      riderDeductions: 0,
      paymentMethod: 'cash',
      amountCollected: 50,
      financialStatus: 'earned',
      status: 'delivered',
    };

    const income = calculateOrderRecognizedIncome(order);
    expect(income).toBe(50);

    const cashResult = calculateCashResult(income, 0);
    expect(cashResult).toBe(50);
  });

  // A.2
  it('2. A cancelled order produces zero earned income unless a compensation entry exists', () => {
    const cancelledWithoutComp: Order = {
      id: 'ord-2',
      orderNumber: 1002,
      createdAt: '2026-10-27T10:00:00Z',
      updatedAt: '2026-10-27T10:15:00Z',
      address: 'مدينة نصر، القاهرة',
      city: 'القاهرة',
      deliveryFee: 40,
      bonus: 10,
      tip: 0,
      riderDeductions: 0,
      paymentMethod: 'cash',
      amountCollected: 0,
      financialStatus: 'cancelled',
      status: 'cancelled',
    };

    expect(calculateOrderRecognizedIncome(cancelledWithoutComp)).toBe(0);

    const cancelledWithComp: Order = {
      ...cancelledWithoutComp,
      id: 'ord-3',
      cancellationCompensation: 15,
    };

    expect(calculateOrderRecognizedIncome(cancelledWithComp)).toBe(15);
  });

  // A.3
  it('3. A 200 EGP fuel purchase appears as a cash expense', () => {
    const fuelExpense: Expense = {
      id: 'exp-1',
      date: '2026-10-27',
      category: 'fuel',
      amount: 200,
      description: 'بنزين 92 - محطة مصر للبترول',
      paymentStatus: 'paid',
      costTreatment: 'cash_expense',
      createdAt: '2026-10-27T08:00:00Z',
      updatedAt: '2026-10-27T08:00:00Z',
    };

    const paidExpenses = calculatePaidExpenses([fuelExpense]);
    expect(paidExpenses).toBe(200);

    const cashResult = calculateCashResult(500, paidExpenses);
    expect(cashResult).toBe(300);
  });

  // A.4
  it('4. Fuel purchased and fuel estimated as consumed are not double-counted', () => {
    // Rider earned 600 EGP.
    // Paid 200 EGP cash for fuel tank fill-up.
    // Estimated fuel consumed for the 80 km trip is 40 EGP (2.67 L * 15 EGP).
    // In cash result, we subtract only the 200 EGP cash spent.
    const recognizedIncome = 600;
    const paidCashFuel = 200;

    const cashResult = calculateCashResult(recognizedIncome, paidCashFuel);
    expect(cashResult).toBe(400);

    // In economic profit, if we track operating accruals, we do not double subtract the 200 EGP purchase + 40 EGP consumed.
    // The economic calculation is distinct and explicitly audited.
    const economic = calculateEconomicOperatingProfit({
      recognizedIncome,
      paidCashExpenses: paidCashFuel,
      unpaidExpenses: 0,
      distanceKm: 80,
      settings: { maintenanceCostPerKm: 1.5, autoAccrueMaintenance: true },
    });
    // Total costs = 200 (paid cash) + (80 * 1.5 = 120 maintenance) = 320
    expect(economic).toBe(280);
  });

  // A.5
  it('5. A 10 km eligible distance with maintenance cost of 2 EGP/km produces a 20 EGP maintenance accrual', () => {
    const accrual = calculateMaintenanceAccrual(10, 2);
    expect(accrual).toBe(20);
  });

  // A.6
  it('6. The same maintenance accrual is not deducted twice', () => {
    // If rider paid 50 EGP for oil change (maintenance category) in cash, and autoAccrueMaintenance is enabled
    // calculateEconomicOperatingProfit adjusts paidCashExpenses by deducting the maintenance portion
    // so we don't double count maintenance cash + maintenance accrual.
    const profit = calculateEconomicOperatingProfit({
      recognizedIncome: 300,
      paidCashExpenses: 150, // includes 50 EGP oil change
      paidMaintenanceExpenseAmount: 50,
      unpaidExpenses: 0,
      distanceKm: 20, // 20 km * 2 EGP/km = 40 EGP accrual
      settings: { maintenanceCostPerKm: 2, autoAccrueMaintenance: true },
    });

    // Non-maintenance paid cash = 100 EGP.
    // Maintenance accrual = 40 EGP.
    // Total costs = 100 + 40 = 140.
    // Profit = 300 - 140 = 160 EGP. (No double counting of the 50 EGP oil change!)
    expect(profit).toBe(160);
  });

  // A.7
  it('7. Editing a delivered order does not duplicate its income', () => {
    const deliveredOrder: Order = {
      id: 'ord-7',
      orderNumber: 1007,
      createdAt: '2026-10-27T10:00:00Z',
      updatedAt: '2026-10-27T10:30:00Z',
      address: 'الدقي، الجيزة',
      city: 'الجيزة',
      deliveryFee: 60,
      bonus: 10,
      tip: 5,
      riderDeductions: 0,
      paymentMethod: 'cash',
      amountCollected: 75,
      financialStatus: 'earned',
      status: 'delivered',
    };

    // Calculate once
    const firstCalc = calculateTotalRecognizedIncome([deliveredOrder]);
    expect(firstCalc).toBe(75);

    // Simulate editing notes or phone number on the same delivered order
    const editedOrder = { ...deliveredOrder, notes: 'تم التسليم للبواب', updatedAt: '2026-10-27T11:00:00Z' };
    const secondCalc = calculateTotalRecognizedIncome([editedOrder]);
    expect(secondCalc).toBe(75);
  });

  // A.8
  it('8. Refunds reduce recognized income through an auditable adjustment', () => {
    const orderWithRefund: Order = {
      id: 'ord-8',
      orderNumber: 1008,
      createdAt: '2026-10-27T10:00:00Z',
      updatedAt: '2026-10-27T12:00:00Z',
      address: 'التجمع الخامس',
      city: 'القاهرة',
      deliveryFee: 70,
      bonus: 0,
      tip: 0,
      riderDeductions: 0,
      paymentMethod: 'cash',
      amountCollected: 70,
      financialStatus: 'refunded',
      status: 'delivered',
      refundAmount: 30, // 30 EGP refunded to customer
    };

    const netIncome = calculateOrderRecognizedIncome(orderWithRefund);
    expect(netIncome).toBe(40); // 70 - 30 = 40 EGP
  });

  // A.9
  it('9. Zero work hours never produces Infinity or NaN in productivity metrics', () => {
    const metrics = calculateProductivityMetrics({
      recognizedIncome: 200,
      cashResult: 150,
      economicProfit: 120,
      totalPaidExpenses: 50,
      completedOrdersCount: 4,
      netWorkDurationSeconds: 0, // 0 work hours
      distanceKm: 0,             // 0 km
    });

    expect(metrics.netCashPerHour).toBeNull();
    expect(metrics.economicProfitPerHour).toBeNull();
    expect(metrics.completedOrdersPerHour).toBeNull();
    expect(metrics.revenuePerKm).toBeNull();
    expect(metrics.operatingCostPerKm).toBeNull();
    expect(metrics.avgEarningsPerCompletedOrder).toBe(50); // 200 / 4 = 50
    expect(metrics.distancePerCompletedOrder).toBeNull();
  });

  // A.10
  it('10. All totals reconcile with the underlying records', () => {
    const orders: Order[] = [
      {
        id: '1',
        orderNumber: 101,
        createdAt: '2026-10-27T08:00:00Z',
        updatedAt: '2026-10-27T08:30:00Z',
        address: 'الزمالك',
        city: 'القاهرة',
        deliveryFee: 45,
        bonus: 5,
        tip: 10,
        riderDeductions: 0,
        paymentMethod: 'cash',
        amountCollected: 60,
        financialStatus: 'earned',
        status: 'delivered',
      },
      {
        id: '2',
        orderNumber: 102,
        createdAt: '2026-10-27T09:00:00Z',
        updatedAt: '2026-10-27T09:15:00Z',
        address: 'العجوزة',
        city: 'الجيزة',
        deliveryFee: 50,
        bonus: 0,
        tip: 0,
        riderDeductions: 0,
        paymentMethod: 'cash',
        amountCollected: 0,
        financialStatus: 'cancelled',
        status: 'cancelled',
        cancellationCompensation: 15,
      },
      {
        id: '3',
        orderNumber: 103,
        createdAt: '2026-10-27T10:00:00Z',
        updatedAt: '2026-10-27T10:00:00Z',
        address: 'المهندسين',
        city: 'الجيزة',
        deliveryFee: 55,
        bonus: 0,
        tip: 0,
        riderDeductions: 0,
        paymentMethod: 'cash',
        amountCollected: 0,
        financialStatus: 'pending',
        status: 'on_the_way', // Not delivered yet!
      },
    ];

    const expenses: Expense[] = [
      {
        id: 'e1',
        date: '2026-10-27',
        category: 'fuel',
        amount: 30,
        description: 'بنزين',
        paymentStatus: 'paid',
        costTreatment: 'cash_expense',
        createdAt: '2026-10-27T08:00:00Z',
        updatedAt: '2026-10-27T08:00:00Z',
      },
    ];

    // Order 1: 45 + 5 + 10 = 60
    // Order 2: cancelled with comp = 15
    // Order 3: on the way = 0
    // Total income = 75
    const totalIncome = calculateTotalRecognizedIncome(orders);
    expect(totalIncome).toBe(75);

    const paidExp = calculatePaidExpenses(expenses);
    expect(paidExp).toBe(30);

    const cashResult = calculateCashResult(totalIncome, paidExp);
    expect(cashResult).toBe(45); // 75 - 30 = 45
  });
});
