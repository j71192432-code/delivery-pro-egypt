import { getDb } from '../services/database';
import { Expense } from '../types';
import { generateUUID } from './ordersRepository';

export async function getAllExpenses(): Promise<Expense[]> {
  const db = await getDb();
  const all = await db.getAll('expenses');
  return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getExpensesByDate(dateStr: string): Promise<Expense[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex('expenses', 'by-date', dateStr);
  return all;
}

export async function createExpense(
  data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<Expense> {
  const db = await getDb();
  const now = new Date().toISOString();

  const expense: Expense = {
    ...data,
    id: data.id || generateUUID(),
    amount: Number(data.amount) || 0,
    createdAt: now,
    updatedAt: now,
  };

  await db.put('expenses', expense);
  return expense;
}

export async function updateExpense(id: string, updates: Partial<Expense>): Promise<Expense> {
  const db = await getDb();
  const existing = await db.get('expenses', id);
  if (!existing) {
    throw new Error('المصروف غير موجود');
  }

  const updated: Expense = {
    ...existing,
    ...updates,
    amount: updates.amount !== undefined ? Number(updates.amount) : existing.amount,
    updatedAt: new Date().toISOString(),
  };

  await db.put('expenses', updated);
  return updated;
}

export async function deleteExpense(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('expenses', id);
}
