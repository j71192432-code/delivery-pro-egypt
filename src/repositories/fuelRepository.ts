import { getDb } from '../services/database';
import { FuelLog } from '../types';
import { generateUUID } from './ordersRepository';

export async function getAllFuelLogs(): Promise<FuelLog[]> {
  const db = await getDb();
  const all = await db.getAll('fuelLogs');
  return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function createFuelLog(
  data: Omit<FuelLog, 'id' | 'createdAt'> & { id?: string }
): Promise<FuelLog> {
  const db = await getDb();
  const now = new Date().toISOString();

  const log: FuelLog = {
    ...data,
    id: data.id || generateUUID(),
    liters: Number(data.liters) || 0,
    pricePerLiter: Number(data.pricePerLiter) || 0,
    totalCost: Number(data.totalCost) || (Number(data.liters) || 0) * (Number(data.pricePerLiter) || 0),
    odometerKm: data.odometerKm ? Number(data.odometerKm) : undefined,
    createdAt: now,
  };

  await db.put('fuelLogs', log);
  return log;
}

export async function deleteFuelLog(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('fuelLogs', id);
}
