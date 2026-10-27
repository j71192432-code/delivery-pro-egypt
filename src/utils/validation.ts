import { isValidCoordinate } from '../services/distance';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateOrderForm(data: {
  address?: string;
  deliveryFee?: number | string;
  orderValue?: number | string;
  bonus?: number | string;
  tip?: number | string;
  riderDeductions?: number | string;
  latitude?: number | string;
  longitude?: number | string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.address || !data.address.trim()) {
    errors.address = 'عنوان العميل مطلوب';
  }

  const fee = Number(data.deliveryFee);
  if (isNaN(fee) || fee < 0) {
    errors.deliveryFee = 'رسوم التوصيل يجب أن تكون رقماً موجباً أو صفراً';
  }

  if (data.orderValue !== undefined && data.orderValue !== '') {
    const val = Number(data.orderValue);
    if (isNaN(val) || val < 0) {
      errors.orderValue = 'قيمة الأوردر يجب ألا تكون سالبة';
    }
  }

  if (data.bonus !== undefined && data.bonus !== '') {
    const val = Number(data.bonus);
    if (isNaN(val) || val < 0) {
      errors.bonus = 'البونص يجب ألا يكون سالباً';
    }
  }

  if (data.tip !== undefined && data.tip !== '') {
    const val = Number(data.tip);
    if (isNaN(val) || val < 0) {
      errors.tip = 'الإكرامية يجب ألا تكون سالبة';
    }
  }

  if (data.riderDeductions !== undefined && data.riderDeductions !== '') {
    const val = Number(data.riderDeductions);
    if (isNaN(val) || val < 0) {
      errors.riderDeductions = 'الخصومات يجب ألا تكون سالبة';
    }
  }

  if (data.latitude !== undefined && data.latitude !== '' && data.longitude !== undefined && data.longitude !== '') {
    const lat = Number(data.latitude);
    const lng = Number(data.longitude);
    if (!isValidCoordinate(lat, lng)) {
      errors.coordinates = 'الإحداثيات الجغرافية غير صالحة';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateExpenseForm(data: {
  amount?: number | string;
  category?: string;
  date?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  const amt = Number(data.amount);
  if (isNaN(amt) || amt <= 0) {
    errors.amount = 'مبلغ المصروف يجب أن يكون رقماً أكبر من صفر';
  }

  if (!data.category) {
    errors.category = 'يجب اختيار بند المصروف';
  }

  if (!data.date) {
    errors.date = 'يجب تحديد تاريخ المصروف';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateFuelForm(data: {
  liters?: number | string;
  pricePerLiter?: number | string;
  date?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  const liters = Number(data.liters);
  if (isNaN(liters) || liters <= 0) {
    errors.liters = 'كمية الوقود باللتر يجب أن تكون أكبر من صفر';
  }

  const price = Number(data.pricePerLiter);
  if (isNaN(price) || price <= 0) {
    errors.pricePerLiter = 'سعر لتر الوقود يجب أن يكون أكبر من صفر';
  }

  if (!data.date) {
    errors.date = 'يجب تحديد التاريخ';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateOdometerSequence(startKm?: number, endKm?: number): {
  isValid: boolean;
  errorMessage?: string;
} {
  if (startKm === undefined || endKm === undefined) {
    return { isValid: true };
  }

  if (endKm < startKm) {
    return {
      isValid: false,
      errorMessage: `قراءة العداد عند النهاية (${endKm} كم) لا يمكن أن تكون أقل من قراءة البداية (${startKm} كم)`,
    };
  }

  return { isValid: true };
}
