import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  Order,
  Expense,
  FuelLog,
  WorkSession,
  Settings,
  DailySummary,
} from '../types';

export const DB_NAME = 'delivery_pro_egypt';
export const DB_VERSION = 1;

export interface DeliveryProSchema extends DBSchema {
  orders: {
    key: string;
    value: Order;
    indexes: {
      'by-created': string;
      'by-status': string;
      'by-orderNumber': number;
    };
  };
  expenses: {
    key: string;
    value: Expense;
    indexes: {
      'by-date': string;
      'by-category': string;
    };
  };
  fuelLogs: {
    key: string;
    value: FuelLog;
    indexes: {
      'by-date': string;
    };
  };
  workSessions: {
    key: string;
    value: WorkSession;
    indexes: {
      'by-start': string;
      'by-status': string;
    };
  };
  settings: {
    key: string;
    value: { key: string; value: Settings };
  };
  dailySummaries: {
    key: string;
    value: DailySummary;
    indexes: {
      'by-date': string;
    };
  };
}

export const DEFAULT_SETTINGS: Settings = {
  currency: 'EGP',
  theme: 'dark',
  motorcycleName: 'موتوسيكل دليفري',
  fuelPricePerLiter: 15.0,
  estimatedKmPerLiter: 30.0,
  maintenanceCostPerKm: 1.5,
  defaultCity: 'القاهرة',
  autoAccrueMaintenance: true,
  gpsAccuracyThreshold: 40,
};

let dbInstance: IDBPDatabase<DeliveryProSchema> | null = null;

export async function getDb(): Promise<IDBPDatabase<DeliveryProSchema>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<DeliveryProSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 1. Orders store
      if (!db.objectStoreNames.contains('orders')) {
        const orderStore = db.createObjectStore('orders', { keyPath: 'id' });
        orderStore.createIndex('by-created', 'createdAt');
        orderStore.createIndex('by-status', 'status');
        orderStore.createIndex('by-orderNumber', 'orderNumber');
      }

      // 2. Expenses store
      if (!db.objectStoreNames.contains('expenses')) {
        const expenseStore = db.createObjectStore('expenses', { keyPath: 'id' });
        expenseStore.createIndex('by-date', 'date');
        expenseStore.createIndex('by-category', 'category');
      }

      // 3. Fuel Logs store
      if (!db.objectStoreNames.contains('fuelLogs')) {
        const fuelStore = db.createObjectStore('fuelLogs', { keyPath: 'id' });
        fuelStore.createIndex('by-date', 'date');
      }

      // 4. Work Sessions store
      if (!db.objectStoreNames.contains('workSessions')) {
        const sessionStore = db.createObjectStore('workSessions', { keyPath: 'id' });
        sessionStore.createIndex('by-start', 'startTime');
        sessionStore.createIndex('by-status', 'status');
      }

      // 5. Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }

      // 6. Daily Summaries store
      if (!db.objectStoreNames.contains('dailySummaries')) {
        const summaryStore = db.createObjectStore('dailySummaries', { keyPath: 'id' });
        summaryStore.createIndex('by-date', 'date');
      }
    },
  });

  return dbInstance;
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
