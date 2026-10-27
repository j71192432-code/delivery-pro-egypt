import { getDb } from '../services/database';
import { WorkSession, DistanceSource } from '../types';
import { generateUUID } from './ordersRepository';

export async function getAllSessions(): Promise<WorkSession[]> {
  const db = await getDb();
  const all = await db.getAll('workSessions');
  return all.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
}

/**
 * Returns currently active or paused session if any exists.
 */
export async function getActiveOrPausedSession(): Promise<WorkSession | null> {
  const db = await getDb();
  const all = await db.getAll('workSessions');
  const found = all.find((s) => s.status === 'active' || s.status === 'paused');
  return found || null;
}

export async function startWorkSession(options?: {
  startingOdometerKm?: number;
  notes?: string;
  distanceSource?: DistanceSource;
}): Promise<WorkSession> {
  const existing = await getActiveOrPausedSession();
  if (existing) {
    throw new Error('توجد وردية عمل نشطة بالفعل. يرجى إنهاؤها أولاً.');
  }

  const db = await getDb();
  const now = new Date().toISOString();

  const session: WorkSession = {
    id: generateUUID(),
    startTime: now,
    status: 'active',
    pauseIntervals: [],
    startingOdometerKm: options?.startingOdometerKm ? Number(options.startingOdometerKm) : undefined,
    trackedDistanceKm: 0,
    distanceSource: options?.distanceSource || 'gps',
    notes: options?.notes,
    createdAt: now,
    updatedAt: now,
  };

  await db.put('workSessions', session);
  return session;
}

export async function pauseWorkSession(id: string): Promise<WorkSession> {
  const db = await getDb();
  const session = await db.get('workSessions', id);
  if (!session) throw new Error('الوردية غير موجودة');
  if (session.status !== 'active') throw new Error('الوردية ليست في حالة نشطة');

  const now = new Date().toISOString();
  session.status = 'paused';
  session.pauseIntervals.push({ start: now });
  session.updatedAt = now;

  await db.put('workSessions', session);
  return session;
}

export async function resumeWorkSession(id: string): Promise<WorkSession> {
  const db = await getDb();
  const session = await db.get('workSessions', id);
  if (!session) throw new Error('الوردية غير موجودة');
  if (session.status !== 'paused') throw new Error('الوردية ليست متوقفة مؤقتاً');

  const now = new Date().toISOString();
  session.status = 'active';

  // Close open pause interval
  const lastPause = session.pauseIntervals[session.pauseIntervals.length - 1];
  if (lastPause && !lastPause.end) {
    lastPause.end = now;
  }

  session.updatedAt = now;
  await db.put('workSessions', session);
  return session;
}

export async function endWorkSession(
  id: string,
  options?: {
    endingOdometerKm?: number;
    finalTrackedDistanceKm?: number;
    distanceSource?: DistanceSource;
  }
): Promise<WorkSession> {
  const db = await getDb();
  const session = await db.get('workSessions', id);
  if (!session) throw new Error('الوردية غير موجودة');

  const now = new Date().toISOString();

  // If was paused, close the pause interval
  if (session.status === 'paused') {
    const lastPause = session.pauseIntervals[session.pauseIntervals.length - 1];
    if (lastPause && !lastPause.end) {
      lastPause.end = now;
    }
  }

  session.status = 'completed';
  session.endTime = now;
  session.updatedAt = now;

  if (options?.endingOdometerKm !== undefined) {
    session.endingOdometerKm = Number(options.endingOdometerKm);
  }

  if (options?.finalTrackedDistanceKm !== undefined) {
    session.trackedDistanceKm = Number(options.finalTrackedDistanceKm);
  }

  if (options?.distanceSource) {
    session.distanceSource = options.distanceSource;
  }

  await db.put('workSessions', session);
  return session;
}

export async function updateSessionDistance(
  id: string,
  trackedDistanceKm: number
): Promise<void> {
  const db = await getDb();
  const session = await db.get('workSessions', id);
  if (session && session.status === 'active') {
    session.trackedDistanceKm = trackedDistanceKm;
    session.updatedAt = new Date().toISOString();
    await db.put('workSessions', session);
  }
}
