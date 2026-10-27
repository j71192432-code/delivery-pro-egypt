import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateNetPausedSeconds,
  calculateSessionDurations,
  formatDurationArabic,
} from '../services/workSession';
import {
  startWorkSession,
  pauseWorkSession,
  resumeWorkSession,
  endWorkSession,
  getActiveOrPausedSession,
} from '../repositories/sessionsRepository';
import { WorkSession } from '../types';
import { getDb } from '../services/database';

describe('D. Work-Session Tests (اختبارات ورديات العمل والتوقف المؤقت)', () => {
  beforeEach(async () => {
    const db = await getDb();
    await db.clear('workSessions');
  });

  // D.1
  it('1. Start, pause, resume, and stop transitions are valid', async () => {
    // 1. Start
    const session = await startWorkSession({ startingOdometerKm: 12000 });
    expect(session.status).toBe('active');
    expect(session.startingOdometerKm).toBe(12000);

    // 2. Pause
    const paused = await pauseWorkSession(session.id);
    expect(paused.status).toBe('paused');
    expect(paused.pauseIntervals.length).toBe(1);
    expect(paused.pauseIntervals[0].end).toBeUndefined();

    // 3. Resume
    const resumed = await resumeWorkSession(session.id);
    expect(resumed.status).toBe('active');
    expect(resumed.pauseIntervals[0].end).toBeDefined();

    // 4. End
    const ended = await endWorkSession(session.id, { endingOdometerKm: 12050 });
    expect(ended.status).toBe('completed');
    expect(ended.endTime).toBeDefined();
    expect(ended.endingOdometerKm).toBe(12050);
  });

  // D.2
  it('2. Multiple pauses are subtracted correctly', () => {
    // Session started at 10:00:00 (1000s duration)
    const baseTime = 1700000000000;
    const session: WorkSession = {
      id: 'ws-1',
      startTime: new Date(baseTime).toISOString(),
      endTime: new Date(baseTime + 3600 * 1000).toISOString(), // 1 hour elapsed (3600s)
      status: 'completed',
      pauseIntervals: [
        // Pause 1: 10 minutes (600s)
        {
          start: new Date(baseTime + 600 * 1000).toISOString(),
          end: new Date(baseTime + 1200 * 1000).toISOString(),
        },
        // Pause 2: 15 minutes (900s)
        {
          start: new Date(baseTime + 2000 * 1000).toISOString(),
          end: new Date(baseTime + 2900 * 1000).toISOString(),
        },
      ],
      distanceSource: 'gps',
      createdAt: new Date(baseTime).toISOString(),
      updatedAt: new Date(baseTime).toISOString(),
    };

    const durations = calculateSessionDurations(session);
    expect(durations.elapsedSeconds).toBe(3600);
    expect(durations.pausedSeconds).toBe(1500); // 600 + 900 = 1500s (25 mins)
    expect(durations.netWorkSeconds).toBe(2100); // 3600 - 1500 = 2100s (35 mins)
    expect(formatDurationArabic(durations.netWorkSeconds)).toBe('35 د 0 ث');
  });

  // D.3
  it('3. Overlapping pauses are not counted twice', () => {
    const baseTime = 1700000000000;
    // Overlapping pauses: [0s to 300s] and [100s to 400s] -> union is [0s to 400s] = 400s total
    const intervals = [
      {
        start: new Date(baseTime).toISOString(),
        end: new Date(baseTime + 300 * 1000).toISOString(),
      },
      {
        start: new Date(baseTime + 100 * 1000).toISOString(),
        end: new Date(baseTime + 400 * 1000).toISOString(),
      },
    ];

    const netPaused = calculateNetPausedSeconds(intervals);
    expect(netPaused).toBe(400); // Not 300 + 300 = 600!
  });

  // D.4
  it('4. Reloading restores an active session', async () => {
    const started = await startWorkSession({ startingOdometerKm: 1500 });
    expect(started.status).toBe('active');

    // Simulate page reload: query the repository
    const restored = await getActiveOrPausedSession();
    expect(restored).not.toBeNull();
    expect(restored?.id).toBe(started.id);
    expect(restored?.status).toBe('active');
  });

  // D.5
  it('5. A second active session cannot be created accidentally', async () => {
    await startWorkSession();

    // Trying to start another should reject
    await expect(startWorkSession()).rejects.toThrow('توجد وردية عمل نشطة بالفعل');
  });
});
