import { getDb } from '../services/database';
import { Order, OrderStatus } from '../types';

/**
 * Generate a random UUID.
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Gets next sequential order display number.
 */
export async function getNextOrderNumber(): Promise<number> {
  const db = await getDb();
  const all = await db.getAll('orders');
  if (all.length === 0) return 1001;
  const maxNumber = all.reduce((max, o) => Math.max(max, o.orderNumber || 0), 1000);
  return maxNumber + 1;
}

export async function getAllOrders(): Promise<Order[]> {
  const db = await getDb();
  const orders = await db.getAll('orders');
  // Sort descending by creation date
  return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getOrderById(id: string): Promise<Order | undefined> {
  const db = await getDb();
  return db.get('orders', id);
}

export async function createOrder(
  data: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt' | 'financialStatus'> & {
    id?: string;
    orderNumber?: number;
    financialStatus?: Order['financialStatus'];
  }
): Promise<Order> {
  const db = await getDb();
  const now = new Date().toISOString();
  const nextNumber = data.orderNumber || (await getNextOrderNumber());

  const order: Order = {
    ...data,
    id: data.id || generateUUID(),
    orderNumber: nextNumber,
    createdAt: now,
    updatedAt: now,
    financialStatus: data.status === 'delivered' ? 'earned' : 'pending',
    deliveryFee: Number(data.deliveryFee) || 0,
    bonus: Number(data.bonus) || 0,
    tip: Number(data.tip) || 0,
    riderDeductions: Number(data.riderDeductions) || 0,
    amountCollected: Number(data.amountCollected) || 0,
    orderValue: data.orderValue ? Number(data.orderValue) : undefined,
  };

  await db.put('orders', order);
  return order;
}

export async function updateOrder(id: string, updates: Partial<Order>): Promise<Order> {
  const db = await getDb();
  const existing = await db.get('orders', id);
  if (!existing) {
    throw new Error('الأوردر غير موجود');
  }

  const now = new Date().toISOString();
  const newStatus = updates.status || existing.status;

  // Determine timestamps based on status transition
  const timestampUpdates: Partial<Order> = {};
  if (newStatus === 'accepted' && !existing.acceptedAt) {
    timestampUpdates.acceptedAt = now;
  } else if (newStatus === 'picked_up' && !existing.pickedUpAt) {
    timestampUpdates.pickedUpAt = now;
  } else if (newStatus === 'delivered' && !existing.deliveredAt) {
    timestampUpdates.deliveredAt = now;
    timestampUpdates.financialStatus = 'earned';
  } else if ((newStatus === 'cancelled' || newStatus === 'failed') && !existing.cancelledAt) {
    timestampUpdates.cancelledAt = now;
    timestampUpdates.financialStatus = 'cancelled';
  }

  const updated: Order = {
    ...existing,
    ...updates,
    ...timestampUpdates,
    updatedAt: now,
  };

  await db.put('orders', updated);
  return updated;
}

export async function deleteOrder(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('orders', id);
}

export async function setOrderStatus(id: string, status: OrderStatus): Promise<Order> {
  return updateOrder(id, { status });
}
