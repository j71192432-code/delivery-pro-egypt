import { WorkSession, PauseInterval } from '../types';

/**
 * Calculates non-overlapping total paused duration in seconds.
 * Even if intervals overlap or have incomplete ends, intervals are normalized and merged.
 */
export function calculateNetPausedSeconds(
  pauseIntervals: PauseInterval[],
  nowTimestamp: number = Date.now()
): number {
  if (!pauseIntervals || pauseIntervals.length === 0) return 0;

  // Normalize intervals to milliseconds [startMs, endMs]
  const intervals: [number, number][] = pauseIntervals.map((interval) => {
    const startMs = new Date(interval.start).getTime();
    const endMs = interval.end ? new Date(interval.end).getTime() : nowTimestamp;
    return [Math.min(startMs, endMs), Math.max(startMs, endMs)];
  });

  // Sort by start time
  intervals.sort((a, b) => a[0] - b[0]);

  // Merge overlapping intervals
  const merged: [number, number][] = [];
  for (const [start, end] of intervals) {
    if (merged.length === 0) {
      merged.push([start, end]);
    } else {
      const prev = merged[merged.length - 1];
      if (start <= prev[1]) {
        // Overlapping
        prev[1] = Math.max(prev[1], end);
      } else {
        merged.push([start, end]);
      }
    }
  }

  // Sum merged intervals in seconds
  const totalMs = merged.reduce((sum, [start, end]) => sum + (end - start), 0);
  return Math.floor(Math.max(0, totalMs / 1000));
}

/**
 * Calculates total elapsed seconds and net work duration seconds for a session.
 */
export function calculateSessionDurations(
  session: WorkSession,
  nowTimestamp: number = Date.now()
): {
  elapsedSeconds: number;
  pausedSeconds: number;
  netWorkSeconds: number;
} {
  const startMs = new Date(session.startTime).getTime();
  const endMs = session.endTime ? new Date(session.endTime).getTime() : nowTimestamp;

  const elapsedSeconds = Math.floor(Math.max(0, (endMs - startMs) / 1000));
  const pausedSeconds = calculateNetPausedSeconds(session.pauseIntervals, endMs);
  const netWorkSeconds = Math.max(0, elapsedSeconds - pausedSeconds);

  return {
    elapsedSeconds,
    pausedSeconds,
    netWorkSeconds,
  };
}

/**
 * Formats seconds into Arabic string: e.g. "4 س 25 د" or "00:25:10"
 */
export function formatDurationArabic(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0 د';

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs} س ${mins} د`;
  }
  if (mins > 0) {
    return `${mins} د ${secs} ث`;
  }
  return `${secs} ث`;
}

export function formatTimeDigital(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
}
