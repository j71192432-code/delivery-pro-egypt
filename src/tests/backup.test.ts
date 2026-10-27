import { describe, it, expect, beforeEach } from 'vitest';
import {
  createOrder,
  getAllOrders,
  getOrderById,
} from '../repositories/ordersRepository';
import {
  createExpense,
  getAllExpenses,
} from '../repositories/expensesRepository';
import {
  createFullBackup,
  validateBackupFile,
  restoreBackup,
  wipeAllLocalData,
} from '../services/backup';

describe('E. Persistence & Backup Tests (اختبارات التخزين المحلي والنسخ الاحتياطي)', () => {
  beforeEach(async () => {
    await wipeAllLocalData();
  });

  // E.1 & E.2
  it('1 & 2. Add an order, simulate reload, verify that the order remains', async () => {
    const order = await createOrder({
      address: 'شارع الهرم، الجيزة',
      city: 'الجيزة',
      deliveryFee: 55,
      bonus: 5,
      tip: 0,
      riderDeductions: 0,
      paymentMethod: 'cash',
      amountCollected: 60,
      status: 'delivered',
    });

    expect(order.id).toBeDefined();

    // Reload test: retrieve by ID and from getAll
    const retrieved = await getOrderById(order.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.address).toBe('شارع الهرم، الجيزة');
    expect(retrieved?.deliveryFee).toBe(55);

    const all = await getAllOrders();
    expect(all.length).toBe(1);
    expect(all[0].id).toBe(order.id);
  });

  // E.3
  it('3. Add an expense and verify it remains after reload', async () => {
    const expense = await createExpense({
      date: '2026-10-27',
      category: 'oil',
      amount: 120,
      description: 'تغيير زيت موتوسيكل وولف',
      paymentStatus: 'paid',
      costTreatment: 'cash_expense',
    });

    const allExpenses = await getAllExpenses();
    expect(allExpenses.length).toBe(1);
    expect(allExpenses[0].id).toBe(expense.id);
    expect(allExpenses[0].amount).toBe(120);
  });

  // E.4, E.5 & E.6
  it('4, 5 & 6. Export a backup, import it into a clean test database, verify record counts and financial totals', async () => {
    // 1. Seed data
    await createOrder({
      address: 'ميدان التحرير',
      city: 'القاهرة',
      deliveryFee: 40,
      bonus: 0,
      tip: 10,
      riderDeductions: 0,
      paymentMethod: 'cash',
      amountCollected: 50,
      status: 'delivered',
    });

    await createExpense({
      date: '2026-10-27',
      category: 'fuel',
      amount: 60,
      description: 'بنزين 92',
      paymentStatus: 'paid',
      costTreatment: 'cash_expense',
    });

    // 2. Export backup
    const backup = await createFullBackup();
    expect(backup.data.orders.length).toBe(1);
    expect(backup.data.expenses.length).toBe(1);

    // 3. Clear database (simulate new device or fresh install)
    await wipeAllLocalData();
    const emptyOrders = await getAllOrders();
    expect(emptyOrders.length).toBe(0);

    // 4. Validate backup structure
    const validation = validateBackupFile(backup);
    expect(validation.isValid).toBe(true);
    expect(validation.preview?.orderCount).toBe(1);
    expect(validation.preview?.expenseCount).toBe(1);

    // 5. Restore backup
    await restoreBackup(validation.payload!, 'replace');

    // 6. Verify records restored accurately
    const restoredOrders = await getAllOrders();
    const restoredExpenses = await getAllExpenses();
    expect(restoredOrders.length).toBe(1);
    expect(restoredOrders[0].deliveryFee).toBe(40);
    expect(restoredExpenses.length).toBe(1);
    expect(restoredExpenses[0].amount).toBe(60);
  });

  // E.7
  it('7. Reject malformed or unsupported backups', () => {
    const malformed1 = { version: 'invalid', data: {} };
    expect(validateBackupFile(malformed1).isValid).toBe(false);

    const malformed2 = { version: 999, data: {} }; // Future unsupported schema version
    expect(validateBackupFile(malformed2).isValid).toBe(false);

    const malformed3 = null;
    expect(validateBackupFile(malformed3).isValid).toBe(false);
  });

  // E.8
  it('8. Verify that replace mode wipes previous records before restoring', async () => {
    // Existing record in DB
    await createOrder({
      address: 'أوردر قديم سيتم مسحه',
      city: 'القاهرة',
      deliveryFee: 10,
      bonus: 0,
      tip: 0,
      riderDeductions: 0,
      paymentMethod: 'cash',
      amountCollected: 10,
      status: 'delivered',
    });

    const incomingBackup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      appName: 'DeliveryProEgypt',
      data: {
        orders: [
          {
            id: 'new-ord-1',
            orderNumber: 2001,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            address: 'أوردر جديد مستورد',
            city: 'القاهرة',
            deliveryFee: 80,
            bonus: 0,
            tip: 0,
            riderDeductions: 0,
            paymentMethod: 'cash' as const,
            amountCollected: 80,
            financialStatus: 'earned' as const,
            status: 'delivered' as const,
          },
        ],
        expenses: [],
        fuelLogs: [],
        workSessions: [],
        settings: {
          currency: 'EGP' as const,
          theme: 'dark' as const,
          motorcycleName: 'موتوسيكل',
          fuelPricePerLiter: 15,
          estimatedKmPerLiter: 30,
          maintenanceCostPerKm: 1.5,
          defaultCity: 'القاهرة',
          autoAccrueMaintenance: true,
          gpsAccuracyThreshold: 40,
        },
        dailySummaries: [],
      },
    };

    await restoreBackup(incomingBackup, 'replace');

    const orders = await getAllOrders();
    expect(orders.length).toBe(1);
    expect(orders[0].address).toBe('أوردر جديد مستورد');
  });
});
