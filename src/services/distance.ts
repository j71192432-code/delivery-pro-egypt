/**
 * Validates coordinate pair.
 */
export function isValidCoordinate(lat: number, lng: number): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
}

/**
 * Calculates straight-line distance in kilometers using the Haversine formula.
 * "المسافة المباشرة التقديرية"
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) {
    throw new Error('إحداثيات جغرافية غير صالحة');
  }

  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }

  const R = 6371; // Earth's mean radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;

  return Math.round((d + Number.EPSILON) * 100) / 100;
}

export interface GpsPoint {
  latitude: number;
  longitude: number;
  accuracy: number; // in meters
  timestamp: number; // ms
}

/**
 * Filters incoming GPS points to prevent noisy jumps and stationary drift.
 * Returns true if the new point is a plausible, acceptable movement.
 */
export function isValidGpsStep(
  lastPoint: GpsPoint | null,
  newPoint: GpsPoint,
  maxAccuracyMeters: number = 40
): boolean {
  if (!isValidCoordinate(newPoint.latitude, newPoint.longitude)) return false;

  // 1. Accuracy threshold check
  if (newPoint.accuracy > maxAccuracyMeters) {
    return false;
  }

  if (!lastPoint) {
    return true;
  }

  // Calculate distance between points in meters
  const distKm = calculateHaversineDistanceKm(
    lastPoint.latitude,
    lastPoint.longitude,
    newPoint.latitude,
    newPoint.longitude
  );
  const distMeters = distKm * 1000;

  // 2. Stationary jitter filter (ignore movement under 6 meters)
  if (distMeters < 6) {
    return false;
  }

  // 3. Implausible jump filter: check implied speed (max 140 km/h)
  const timeDiffSeconds = Math.max(1, (newPoint.timestamp - lastPoint.timestamp) / 1000);
  const speedKmh = (distKm / timeDiffSeconds) * 3600;

  if (speedKmh > 140) {
    // Implausible jump / GPS drift
    return false;
  }

  return true;
}
