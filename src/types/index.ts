export type PaymentMethod = 'cash' | 'electronic' | 'prepaid';
export type OrderFinancialStatus = 'pending' | 'earned' | 'refunded' | 'cancelled';
export type OrderStatus = 'new' | 'accepted' | 'picked_up' | 'on_the_way' | 'delivered' | 'cancelled' | 'failed';

export interface Order {
  id: string;
  orderNumber: number;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  customerName?: string;
  customerPhone?: string;
  address: string;
  area?: string;
  city: string;
  latitude?: number;
  longitude?: number;
  merchantName?: string;
  orderValue?: number;
  deliveryFee: number;
  bonus: number;
  tip: number;
  riderDeductions: number;
  paymentMethod: PaymentMethod;
  amountCollected: number;
  financialStatus: OrderFinancialStatus;
  status: OrderStatus;
  createdWorkSessionId?: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancellationCompensation?: number;
  refundAmount?: number;
  notes?: string;
}

export type ExpenseCategory =
  | 'fuel'
  | 'oil'
  | 'maintenance'
  | 'tires'
  | 'repairs'
  | 'spare_parts'
  | 'mobile_data'
  | 'parking'
  | 'road_fees'
  | 'vehicle_rental'
  | 'other';

export type PaymentStatus = 'paid' | 'unpaid';
export type CostTreatment = 'cash_expense' | 'operating_accrual';

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  category: ExpenseCategory;
  amount: number;
  description: string;
  linkedOrderId?: string;
  paymentStatus: PaymentStatus;
  costTreatment: CostTreatment;
  createdAt: string;
  updatedAt: string;
}

export interface FuelLog {
  id: string;
  date: string; // YYYY-MM-DD
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  odometerKm?: number;
  notes?: string;
  createdAt: string;
}

export interface PauseInterval {
  start: string; // ISO
  end?: string;   // ISO
}

export type WorkSessionStatus = 'active' | 'paused' | 'completed';
export type DistanceSource = 'gps' | 'odometer' | 'manual';

export interface WorkSession {
  id: string;
  startTime: string; // ISO
  endTime?: string;  // ISO
  status: WorkSessionStatus;
  pauseIntervals: PauseInterval[];
  startingOdometerKm?: number;
  endingOdometerKm?: number;
  trackedDistanceKm?: number;
  distanceSource: DistanceSource;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  currency: 'EGP';
  theme: 'dark' | 'light';
  motorcycleName: string;
  fuelPricePerLiter: number;      // e.g. 15.00 EGP / L
  estimatedKmPerLiter: number;    // e.g. 30 km / L
  maintenanceCostPerKm: number;   // e.g. 1.50 EGP / km
  defaultCity: string;
  autoAccrueMaintenance: boolean; // default true for economic view
  gpsAccuracyThreshold: number;   // in meters (e.g. 35m)
}

export interface DailySummaryRevision {
  revisedAt: string;
  reason: string;
  previousTotals: Partial<DailySummary>;
}

export interface DailySummary {
  id: string; // YYYY-MM-DD
  date: string;
  closedAt: string;
  isClosed: boolean;
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  recognizedIncome: number;
  paidExpenses: number;
  unpaidExpenses: number;
  maintenanceAccruals: number;
  netCashResult: number;
  economicProfit: number;
  distanceKm: number;
  distanceSource: DistanceSource;
  netWorkDurationSeconds: number;
  fuelPurchasedAmount: number;
  estimatedFuelLiters: number;
  estimatedFuelCost: number;
  revisions: DailySummaryRevision[];
}
