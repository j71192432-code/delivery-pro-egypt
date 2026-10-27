import { describe, it, expect } from 'vitest';
import {
  buildGoogleMapsDirectionsUrl,
  normalizeEgyptianPhoneNumber,
} from '../services/googleMaps';

describe('F. Google Maps & Integration Tests', () => {
  it('1. Generates accurate Google Maps directions URL with coordinates', () => {
    const url = buildGoogleMapsDirectionsUrl({
      destLatitude: 30.0444,
      destLongitude: 31.2357,
      destAddress: 'ميدان التحرير',
      originLatitude: 30.05,
      originLongitude: 31.24,
    });

    expect(url).toContain('https://www.google.com/maps/dir/?api=1');
    expect(url).toContain('destination=30.0444%2C31.2357');
    expect(url).toContain('travelmode=driving');
    expect(url).toContain('origin=30.05%2C31.24');
  });

  it('2. Falls back to encoded address when coordinates are absent', () => {
    const url = buildGoogleMapsDirectionsUrl({
      destAddress: 'شارع 9، المعادي، القاهرة',
    });

    expect(url).toContain('https://www.google.com/maps/dir/?api=1');
    expect(url).toContain('destination=%D8%B4%D8%A7%D8%B1%D8%B9%209%D8%8C%20%D8%A7%D9%84%D9%85%D8%B9%D8%A7%D8%AF%D9%8A%D8%8C%20%D8%A7%D9%84%D9%82%D8%A7%D9%87%D8%B1%D8%A9');
    expect(url).toContain('travelmode=driving');
  });

  it('3. Normalizes Egyptian phone numbers accurately for WhatsApp and tel calls', () => {
    // 010 number
    const p1 = normalizeEgyptianPhoneNumber('01012345678');
    expect(p1.normalizedPhone).toBe('201012345678');
    expect(p1.whatsappLink).toBe('https://wa.me/201012345678');
    expect(p1.telLink).toBe('tel:01012345678');

    // 011 number with spaces and dashes
    const p2 = normalizeEgyptianPhoneNumber('011-9876 5432');
    expect(p2.normalizedPhone).toBe('201198765432');
    expect(p2.whatsappLink).toBe('https://wa.me/201198765432');

    // Number already formatted with +20
    const p3 = normalizeEgyptianPhoneNumber('+201200001111');
    expect(p3.normalizedPhone).toBe('201200001111');
    expect(p3.whatsappLink).toBe('https://wa.me/201200001111');
  });
});
