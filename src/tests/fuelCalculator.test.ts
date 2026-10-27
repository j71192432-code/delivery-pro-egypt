import { describe, it, expect } from 'vitest';
import { calculateFuelConsumption } from '../services/fuelCalculator';

describe('B. Fuel Tests (اختبارات استهلاك وتكاليف الوقود)', () => {
  // B.1
  it('1. Distance 100 km and fuel efficiency 25 km/L produces 4 liters estimated consumption', () => {
    const result = calculateFuelConsumption(100, 25, 20);
    expect(result.isValid).toBe(true);
    expect(result.estimatedLiters).toBe(4);
  });

  // B.2
  it('2. Four liters at 20 EGP/L produces 80 EGP estimated fuel cost', () => {
    const result = calculateFuelConsumption(100, 25, 20);
    expect(result.estimatedCost).toBe(80);
  });

  // B.3
  it('3. Missing or zero efficiency does not produce a misleading zero', () => {
    // 0 km per liter
    const zeroEff = calculateFuelConsumption(50, 0, 15);
    expect(zeroEff.isValid).toBe(false);
    expect(zeroEff.estimatedLiters).toBeNull();
    expect(zeroEff.estimatedCost).toBeNull();

    // NaN / missing efficiency
    const nanEff = calculateFuelConsumption(50, NaN, 15);
    expect(nanEff.isValid).toBe(false);
    expect(nanEff.estimatedLiters).toBeNull();
  });

  // B.4
  it('4. Negative inputs are rejected', () => {
    const negDistance = calculateFuelConsumption(-50, 25, 15);
    expect(negDistance.isValid).toBe(false);
    expect(negDistance.estimatedLiters).toBeNull();

    const negPrice = calculateFuelConsumption(50, 25, -15);
    expect(negPrice.isValid).toBe(false);
    expect(negPrice.estimatedCost).toBeNull();

    const negEfficiency = calculateFuelConsumption(50, -25, 15);
    expect(negEfficiency.isValid).toBe(false);
    expect(negEfficiency.estimatedLiters).toBeNull();
  });
});
