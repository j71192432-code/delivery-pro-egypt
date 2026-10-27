export interface MapDirectionsOptions {
  destLatitude?: number;
  destLongitude?: number;
  destAddress: string;
  originLatitude?: number;
  originLongitude?: number;
}

/**
 * Constructs a safe, standard Google Maps directions URL.
 * Defaults travelmode to driving (ideal for delivery motorcycles).
 */
export function buildGoogleMapsDirectionsUrl(options: MapDirectionsOptions): string {
  const baseUrl = 'https://www.google.com/maps/dir/?api=1';

  let destinationParam = '';
  if (
    typeof options.destLatitude === 'number' &&
    typeof options.destLongitude === 'number' &&
    !isNaN(options.destLatitude) &&
    !isNaN(options.destLongitude)
  ) {
    destinationParam = `${options.destLatitude},${options.destLongitude}`;
  } else {
    destinationParam = options.destAddress.trim();
  }

  const encodedDestination = encodeURIComponent(destinationParam);
  let url = `${baseUrl}&destination=${encodedDestination}&travelmode=driving`;

  if (
    typeof options.originLatitude === 'number' &&
    typeof options.originLongitude === 'number' &&
    !isNaN(options.originLatitude) &&
    !isNaN(options.originLongitude)
  ) {
    url += `&origin=${encodeURIComponent(`${options.originLatitude},${options.originLongitude}`)}`;
  }

  return url;
}

/**
 * Constructs a Google Maps Search/Location URL.
 */
export function buildGoogleMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query.trim())}`;
}

/**
 * Normalizes an Egyptian phone number for WhatsApp and tel: links.
 * Converts 010..., 011..., 012..., 015... to +201...
 */
export function normalizeEgyptianPhoneNumber(phone: string): {
  normalizedPhone: string;
  telLink: string;
  whatsappLink: string;
} {
  const digits = phone.replace(/[^\d+]/g, '');

  let cleanDigits = digits;
  if (cleanDigits.startsWith('+20')) {
    cleanDigits = cleanDigits.substring(1);
  } else if (cleanDigits.startsWith('0020')) {
    cleanDigits = cleanDigits.substring(2);
  } else if (cleanDigits.startsWith('01')) {
    cleanDigits = `20${cleanDigits.substring(1)}`;
  } else if (cleanDigits.startsWith('1') && cleanDigits.length === 10) {
    cleanDigits = `20${cleanDigits}`;
  }

  return {
    normalizedPhone: cleanDigits,
    telLink: `tel:${phone.trim()}`,
    whatsappLink: `https://wa.me/${cleanDigits}`,
  };
}
