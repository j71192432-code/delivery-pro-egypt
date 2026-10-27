import { describe, it, expect } from 'vitest';
import {
  calculateHaversineDistanceKm,
  isValidCoordinate,
  isValidGpsStep,
  GpsPoint,
} from '../services/distance';

describe('C. Distance & GPS Tests (اختبارات المسافة وتصفية إشارات GPS)', () => {
  // C.1
  it('1. Haversine distance between identical coordinates is approximately zero', () => {
    const lat = 30.0444; // Cairo Tahrir Square
    const lon = 31.2357;
    const distance = calculateHaversineDistanceKm(lat, lon, lat, lon);
    expect(distance).toBe(0);
  });

  // C.2
  it('2. Known coordinate pairs produce reasonable distances', () => {
    // Tahrir Square (30.0444, 31.2357) to Cairo International Airport (30.1219, 31.4056)
    // Straight-line distance is ~18-19 km
    const distance = calculateHaversineDistanceKm(30.0444, 31.2357, 30.1219, 31.4056);
    expect(distance).toBeGreaterThan(17);
    expect(distance).toBeLessThan(20);
  });

  // C.3
  it('3. Invalid coordinates are rejected', () => {
    expect(isValidCoordinate(95, 30)).toBe(false); // lat > 90
    expect(isValidCoordinate(-91, 30)).toBe(false);
    expect(isValidCoordinate(30, 190)).toBe(false); // lng > 180
    expect(isValidCoordinate(NaN, 30)).toBe(false);

    expect(() => calculateHaversineDistanceKm(100, 30, 30, 30)).toThrow();
  });

  // C.4
  it('4. GPS noise and implausible jumps are not blindly added to the total', () => {
    const now = Date.now();
    const lastPoint: GpsPoint = {
      latitude: 30.0444,
      longitude: 31.2357,
      accuracy: 10,
      timestamp: now,
    };

    // Low accuracy point (accuracy 70m > threshold 40m) -> rejected
    const inaccuratePoint: GpsPoint = {
      latitude: 30.0450,
      longitude: 31.2360,
      accuracy: 70,
      timestamp: now + 5000,
    };
    expect(isValidGpsStep(lastPoint, inaccuratePoint, 40)).toBe(false);

    // Stationary jitter: moved only 2 meters in 10 seconds -> rejected
    const jitterPoint: GpsPoint = {
      latitude: 30.04441,
      longitude: 31.23571,
      accuracy: 10,
      timestamp: now + 10000,
    };
    expect(isValidGpsStep(lastPoint, jitterPoint, 40)).toBe(false);

    // Implausible jump: jumped 10 km in 2 seconds (> 18000 km/h) -> rejected
    const jumpPoint: GpsPoint = {
      latitude: 30.1444,
      longitude: 31.2357,
      accuracy: 10,
      timestamp: now + 2000,
    };
    expect(isValidGpsStep(lastPoint, jumpPoint, 40)).toBe(false);

    // Valid movement: motorcycle traveled 300 meters in 30 seconds (~36 km/h) with 12m accuracy -> accepted
    const validPoint: GpsPoint = {
      latitude: 30.0465,
      longitude: 31.2375,
      accuracy: 12,
      timestamp: now + 30000,
    };
    expect(isValidGpsStep(lastPoint, validPoint, 40)).toBe(true);
  });
});
