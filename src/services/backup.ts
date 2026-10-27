import { getDb, DEFAULT_SETTINGS } from './database';
import {
  Order,
  Expense,
  FuelLog,
  WorkSession,
  Settings,
  DailySummary,
} from '../types';

export const BACKUP_SCHEMA_VERSION = 1;

export interface BackupPayload {
  version: number;
  exportedAt: string; // ISO
  appName: string;
  data: {
    orders: Order[];
    expenses: Expense[];
    fuelLogs: FuelLog[];
    workSessions: WorkSession[];
    settings: Settings;
    dailySummaries: DailySummary[];
  };
}

export interface BackupPreview {
  version: number;
  exportedAt: string;
  orderCount: number;
  expenseCount: number;
  fuelCount: number;
  sessionCount: number;
  summaryCount: number;
  isValid: boolean;
  validationError?: string;
}

/**
 * Creates a complete JSON backup object of all local data.
 */
export async function createFullBackup(): Promise<BackupPayload> {
  const db = await getDb();

  const orders = await db.getAll('orders');
  const expenses = await db.getAll('expenses');
  const fuelLogs = await db.getAll('fuelLogs');
  const workSessions = await db.getAll('workSessions');
  const settingsRecord = await db.get('settings', 'app_settings');
  const dailySummaries = await db.getAll('dailySummaries');

  const settings = settingsRecord ? settingsRecord.value : DEFAULT_SETTINGS;

  return {
    version: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appName: 'DeliveryProEgypt',
    data: {
      orders,
      expenses,
      fuelLogs,
      workSessions,
      settings,
      dailySummaries,
    },
  };
}

/**
 * Validates a parsed JSON backup object and produces a preview.
 */
export function validateBackupFile(rawJson: unknown): {
  isValid: boolean;
  error?: string;
  payload?: BackupPayload;
  preview?: BackupPreview;
} {
  if (!rawJson || typeof rawJson !== 'object') {
    return { isValid: false, error: 'الملف لا يحتوي على كائن بيانات صالح' };
  }

  const obj = rawJson as Partial<BackupPayload>;

  if (typeof obj.version !== 'number') {
    return { isValid: false, error: 'إصدار النسخة الاحتياطية غير موجود أو تالف' };
  }

  if (obj.version > BACKUP_SCHEMA_VERSION) {
    return {
      isValid: false,
      error: `إصدار النسخة الاحتياطية (${obj.version}) أحدث من الإصدار المدعوم (${BACKUP_SCHEMA_VERSION}). يرجى تحديث التطبيق أولاً.`,
    };
  }

  if (!obj.data || typeof obj.data !== 'object') {
    return { isValid: false, error: 'النسخة الاحتياطية لا تحتوي على قسم البيانات' };
  }

  const { orders = [], expenses = [], fuelLogs = [], workSessions = [], dailySummaries = [] } = obj.data;

  if (
    !Array.isArray(orders) ||
    !Array.isArray(expenses) ||
    !Array.isArray(fuelLogs) ||
    !Array.isArray(workSessions) ||
    !Array.isArray(dailySummaries)
  ) {
    return { isValid: false, error: 'بنية جداول البيانات في النسخة الاحتياطية غير صالحة' };
  }

  const payload = obj as BackupPayload;
  const preview: BackupPreview = {
    version: payload.version,
    exportedAt: payload.exportedAt || new Date().toISOString(),
    orderCount: orders.length,
    expenseCount: expenses.length,
    fuelCount: fuelLogs.length,
    sessionCount: workSessions.length,
    summaryCount: dailySummaries.length,
    isValid: true,
  };

  return { isValid: true, payload, preview };
}

/**
 * Restores a backup.
 * Mode: 'replace' deletes all existing records first.
 * Mode: 'merge' upserts records by primary ID.
 */
export async function restoreBackup(
  backup: BackupPayload,
  mode: 'replace' | 'merge'
): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(
    ['orders', 'expenses', 'fuelLogs', 'workSessions', 'settings', 'dailySummaries'],
    'readwrite'
  );

  try {
    if (mode === 'replace') {
      await tx.objectStore('orders').clear();
      await tx.objectStore('expenses').clear();
      await tx.objectStore('fuelLogs').clear();
      await tx.objectStore('workSessions').clear();
      await tx.objectStore('dailySummaries').clear();
    }

    // Orders
    for (const order of backup.data.orders) {
      if (order && order.id) {
        await tx.objectStore('orders').put(order);
      }
    }

    // Expenses
    for (const exp of backup.data.expenses) {
      if (exp && exp.id) {
        await tx.objectStore('expenses').put(exp);
      }
    }

    // Fuel Logs
    for (const fuel of backup.data.fuelLogs) {
      if (fuel && fuel.id) {
        await tx.objectStore('fuelLogs').put(fuel);
      }
    }

    // Work Sessions
    for (const ws of backup.data.workSessions) {
      if (ws && ws.id) {
        await tx.objectStore('workSessions').put(ws);
      }
    }

    // Daily Summaries
    for (const sum of backup.data.dailySummaries) {
      if (sum && sum.id) {
        await tx.objectStore('dailySummaries').put(sum);
      }
    }

    // Settings
    if (backup.data.settings) {
      await tx.objectStore('settings').put({
        key: 'app_settings',
        value: backup.data.settings,
      });
    }

    await tx.done;
  } catch (error) {
    tx.abort();
    throw new Error(`فشلت استعادة النسخة الاحتياطية: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Completely clears all local database stores.
 */
export async function wipeAllLocalData(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(
    ['orders', 'expenses', 'fuelLogs', 'workSessions', 'dailySummaries', 'settings'],
    'readwrite'
  );
  await tx.objectStore('orders').clear();
  await tx.objectStore('expenses').clear();
  await tx.objectStore('fuelLogs').clear();
  await tx.objectStore('workSessions').clear();
  await tx.objectStore('dailySummaries').clear();
  // Reset settings to default
  await tx.objectStore('settings').put({ key: 'app_settings', value: DEFAULT_SETTINGS });
  await tx.done;
}

/**
 * Generates CSV string for orders.
 */
export function exportOrdersCsv(orders: Order[]): string {
  const headers = [
    'رقم الأوردر',
    'التاريخ والوقت',
    'العميل',
    'الهاتف',
    'العنوان',
    'المنطقة',
    'قيمة الأوردر',
    'رسوم التوصيل',
    'البونص',
    'الإكرامية',
    'الخصومات',
    'طريقة الدفع',
    'المبلغ المحصل',
    'الحالة',
    'صافي الدخل المحسوب',
  ];

  const rows = orders.map((o) => {
    const net = o.status === 'delivered' ? o.deliveryFee + o.bonus + o.tip - o.riderDeductions : 0;
    return [
      o.orderNumber,
      `"${o.createdAt}"`,
      `"${o.customerName || ''}"`,
      `"${o.customerPhone || ''}"`,
      `"${(o.address || '').replace(/"/g, '""')}"`,
      `"${o.area || ''}"`,
      o.orderValue || 0,
      o.deliveryFee || 0,
      o.bonus || 0,
      o.tip || 0,
      o.riderDeductions || 0,
      o.paymentMethod,
      o.amountCollected || 0,
      o.status,
      net,
    ].join(',');
  });

  return '\uFEFF' + [headers.join(','), ...rows].join('\n');
}

/**
 * Generates CSV string for expenses.
 */
export function exportExpensesCsv(expenses: Expense[]): string {
  const headers = [
    'التاريخ',
    'القسم',
    'المبلغ',
    'الوصف',
    'حالة الدفع',
    'نوع التكلفة',
  ];

  const rows = expenses.map((e) => {
    return [
      `"${e.date}"`,
      `"${e.category}"`,
      e.amount,
      `"${(e.description || '').replace(/"/g, '""')}"`,
      e.paymentStatus,
      e.costTreatment,
    ].join(',');
  });

  return '\uFEFF' + [headers.join(','), ...rows].join('\n');
}

/**
 * Triggers browser download of file.
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
