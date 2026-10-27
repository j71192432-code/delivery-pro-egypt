import { roundCurrency } from './profitCalculator';

export interface FuelCalculationResult {
  estimatedLiters: number | null;
  estimatedCost: number | null;
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Calculates estimated fuel consumption and estimated fuel cost.
 * Validates inputs: distance, kmPerLiter, and pricePerLiter must be strictly positive.
 * Missing or invalid inputs return null (not a misleading 0).
 */
export function calculateFuelConsumption(
  distanceKm: number,
  kmPerLiter: number,
  pricePerLiter: number
): FuelCalculationResult {
  if (distanceKm < 0 || kmPerLiter < 0 || pricePerLiter < 0) {
    return {
      estimatedLiters: null,
      estimatedCost: null,
      isValid: false,
      errorMessage: 'المسافة ومعدل الاستهلاك وسعر اللتر يجب ألا تكون قيماً سالبة',
    };
  }

  if (kmPerLiter <= 0 || isNaN(kmPerLiter) || !isFinite(kmPerLiter)) {
    return {
      estimatedLiters: null,
      estimatedCost: null,
      isValid: false,
      errorMessage: 'معدل استهلاك الوقود غير محدد أو غير صالح',
    };
  }

  if (pricePerLiter <= 0 || isNaN(pricePerLiter) || !isFinite(pricePerLiter)) {
    // If distance and kmPerLiter are valid, we can still calculate liters, but cost is unknown
    const liters = roundCurrency(distanceKm / kmPerLiter);
    return {
      estimatedLiters: liters,
      estimatedCost: null,
      isValid: false,
      errorMessage: 'سعر لتر الوقود غير محدد',
    };
  }

  const estimatedLiters = roundCurrency(distanceKm / kmPerLiter);
  const estimatedCost = roundCurrency(estimatedLiters * pricePerLiter);

  return {
    estimatedLiters,
    estimatedCost,
    isValid: true,
  };
}
