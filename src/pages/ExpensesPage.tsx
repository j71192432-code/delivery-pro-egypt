import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Receipt,
  Fuel,
  Trash2,
} from 'lucide-react';
import { Expense, ExpenseCategory, FuelLog } from '../types';
import {
  getAllExpenses,
  createExpense,
  deleteExpense,
} from '../repositories/expensesRepository';
import {
  getAllFuelLogs,
  createFuelLog,
  deleteFuelLog,
} from '../repositories/fuelRepository';
import { formatEGPStandard } from '../utils/currency';
import { getLocalDateString } from '../utils/date';
import { validateExpenseForm, validateFuelForm } from '../utils/validation';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';

export const ExpensesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'expenses' | 'fuel'>('expenses');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showFuelModal, setShowFuelModal] = useState<boolean>(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [fuelToDelete, setFuelToDelete] = useState<string | null>(null);

  // New Expense Form State
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<ExpenseCategory>('fuel');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>(getLocalDateString());
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid'>('paid');
  const [costTreatment] = useState<'cash_expense' | 'operating_accrual'>('cash_expense');
  const [expenseErrors, setExpenseErrors] = useState<Record<string, string>>({});

  // Fuel Log Form State
  const [fuelLiters, setFuelLiters] = useState<string>('');
  const [fuelPricePerLiter, setFuelPricePerLiter] = useState<string>('15');
  const [fuelOdometer, setFuelOdometer] = useState<string>('');
  const [fuelDate] = useState<string>(getLocalDateString());
  const [fuelNotes, setFuelNotes] = useState<string>('');
  const [, setFuelErrors] = useState<Record<string, string>>({});

  const loadData = async () => {
    try {
      const [allExp, allFuel] = await Promise.all([getAllExpenses(), getAllFuelLogs()]);
      setExpenses(allExp);
      setFuelLogs(allFuel);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const categoryLabels: Record<ExpenseCategory, string> = {
    fuel: 'بنزين ووقود',
    oil: 'تغيير زيت المحرك',
    maintenance: 'صيانة دورية',
    tires: 'إطارات وكاوتش',
    repairs: 'تصليح وأعطال',
    spare_parts: 'قطع غيار',
    mobile_data: 'باقة موبايل ومكالمات',
    parking: 'ركنة وباركينج',
    road_fees: 'كارتة ورسوم طريق',
    vehicle_rental: 'إيجار الموتوسيكل',
    other: 'مصروفات أخرى',
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = validateExpenseForm({ amount, category, date });
    if (!val.isValid) {
      setExpenseErrors(val.errors);
      return;
    }

    try {
      await createExpense({
        amount: parseFloat(amount),
        category,
        description: description.trim() || categoryLabels[category],
        date,
        paymentStatus,
        costTreatment,
      });

      setShowAddModal(false);
      setAmount('');
      setDescription('');
      setExpenseErrors({});
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'فشل إضافة المصروف');
    }
  };

  const handleAddFuelLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = validateFuelForm({ liters: fuelLiters, pricePerLiter: fuelPricePerLiter, date: fuelDate });
    if (!val.isValid) {
      setFuelErrors(val.errors);
      return;
    }

    try {
      const liters = parseFloat(fuelLiters);
      const price = parseFloat(fuelPricePerLiter);
      const totalCost = liters * price;

      // 1. Create fuel log
      await createFuelLog({
        liters,
        pricePerLiter: price,
        totalCost,
        date: fuelDate,
        odometerKm: fuelOdometer.trim() ? parseFloat(fuelOdometer) : undefined,
        notes: fuelNotes.trim() || undefined,
      });

      // 2. Also register as a cash expense automatically so net profit reconciles!
      await createExpense({
        amount: totalCost,
        category: 'fuel',
        description: `تفويلة بنزين (${liters} لتر بسعر ${price} ج.م)`,
        date: fuelDate,
        paymentStatus: 'paid',
        costTreatment: 'cash_expense',
      });

      setShowFuelModal(false);
      setFuelLiters('');
      setFuelOdometer('');
      setFuelNotes('');
      setFuelErrors({});
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'فشل تسجيل الوقود');
    }
  };

  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return;
    try {
      await deleteExpense(expenseToDelete);
      setExpenseToDelete(null);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'فشل حذف المصروف');
    }
  };

  const handleDeleteFuel = async () => {
    if (!fuelToDelete) return;
    try {
      await deleteFuelLog(fuelToDelete);
      setFuelToDelete(null);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'فشل حذف سجل الوقود');
    }
  };

  const filteredExpenses = useMemo(() => {
    if (categoryFilter === 'all') return expenses;
    return expenses.filter((e) => e.category === categoryFilter);
  }, [expenses, categoryFilter]);

  const totalExpenseSum = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  return (
    <div className="pb-24 px-4 max-w-lg mx-auto animate-fadeIn">
      {/* Title & Action Bar */}
      <div className="flex items-center justify-between mt-3 mb-3">
        <div>
          <h1 className="text-xl font-black text-white">المصروفات والوقود</h1>
          <p className="text-xs text-dark-muted">تسجيل تكاليف الصيانة والبنزين</p>
        </div>

        <div className="flex gap-2">
          {activeTab === 'expenses' ? (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1 px-3.5 py-2.5 rounded-xl bg-expense hover:bg-expense-dark text-white font-bold text-xs shadow-lg shadow-expense/25 transition min-h-touch active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة مصروف</span>
            </button>
          ) : (
            <button
              onClick={() => setShowFuelModal(true)}
              className="flex items-center gap-1 px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-lg shadow-amber-500/25 transition min-h-touch active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>تفويلة بنزين</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-dark-card border border-dark-border rounded-xl mb-4">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
            activeTab === 'expenses'
              ? 'bg-brand-500 text-white shadow-md'
              : 'text-dark-muted hover:text-white'
          }`}
        >
          سجل المصروفات العامة
        </button>
        <button
          onClick={() => setActiveTab('fuel')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
            activeTab === 'fuel'
              ? 'bg-brand-500 text-white shadow-md'
              : 'text-dark-muted hover:text-white'
          }`}
        >
          سجل تفويلات الوقود
        </button>
      </div>

      {activeTab === 'expenses' ? (
        <>
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                categoryFilter === 'all'
                  ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                  : 'text-dark-muted hover:text-white hover:bg-dark-card'
              }`}
            >
              الكل
            </button>
            {Object.entries(categoryLabels).map(([catKey, catName]) => (
              <button
                key={catKey}
                onClick={() => setCategoryFilter(catKey)}
                className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  categoryFilter === catKey
                    ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                    : 'text-dark-muted hover:text-white hover:bg-dark-card'
                }`}
              >
                {catName}
              </button>
            ))}
          </div>

          {/* Total Sum banner */}
          <div className="p-3.5 rounded-2xl bg-dark-card border border-dark-border mb-3 flex items-center justify-between">
            <span className="text-xs text-dark-muted">إجمالي المصروفات المعروضة:</span>
            <span className="text-base font-extrabold text-expense-light">
              {formatEGPStandard(totalExpenseSum)}
            </span>
          </div>

          {/* Expense List */}
          {filteredExpenses.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="لا توجد مصروفات مسجلة"
              description="سجل مصاريف البنزين والزيت والصيانة لتحديد صافي أرباحك الحقيقية بدقة."
              actionLabel="تسجيل أول مصروف"
              onAction={() => setShowAddModal(true)}
            />
          ) : (
            <div className="space-y-2.5">
              {filteredExpenses.map((exp) => (
                <div
                  key={exp.id}
                  className="p-3.5 rounded-2xl bg-dark-card border border-dark-border flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-white line-clamp-1">
                        {exp.description}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-dark-muted border border-white/10 shrink-0">
                        {categoryLabels[exp.category]}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-dark-muted">
                      <span>{exp.date}</span>
                      <span
                        className={
                          exp.paymentStatus === 'paid' ? 'text-emerald-400' : 'text-amber-400'
                        }
                      >
                        • {exp.paymentStatus === 'paid' ? 'مدفوع كاش' : 'غير مدفوع (أجل)'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-extrabold text-expense-light">
                      -{formatEGPStandard(exp.amount)}
                    </span>
                    <button
                      onClick={() => setExpenseToDelete(exp.id)}
                      className="p-1.5 text-dark-muted hover:text-expense rounded-lg hover:bg-white/5 transition"
                      aria-label="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Fuel Logs List */}
          {fuelLogs.length === 0 ? (
            <EmptyState
              icon={Fuel}
              title="لا توجد تفويلات وقود مسجلة"
              description="سجل استهلاك وتفويلات البنزين وقراءات العداد لمراقبة معدل استهلاك الموتوسيكل."
              actionLabel="تسجيل تفويلة بنزين"
              onAction={() => setShowFuelModal(true)}
            />
          ) : (
            <div className="space-y-2.5">
              {fuelLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-2xl bg-dark-card border border-dark-border flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-amber-300">
                        {log.liters} لتر بنزين
                      </span>
                      <span className="text-[11px] text-dark-muted">
                        بسعر {formatEGPStandard(log.pricePerLiter)} / لتر
                      </span>
                    </div>
                    <div className="text-[11px] text-dark-muted">
                      <span>{log.date}</span>
                      {log.odometerKm && <span> • عداد: {log.odometerKm} كم</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-extrabold text-white">
                      {formatEGPStandard(log.totalCost)}
                    </span>
                    <button
                      onClick={() => setFuelToDelete(log.id)}
                      className="p-1.5 text-dark-muted hover:text-expense rounded-lg hover:bg-white/5 transition"
                      aria-label="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-dark-card border border-dark-border rounded-2xl p-5 shadow-2xl text-right max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white mb-3">تسجيل مصروف تشغيلي جديد</h3>

            <form onSubmit={handleAddExpense} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-white mb-1">المبلغ (ج.م) *</label>
                <input
                  type="number"
                  step="0.5"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="مثال: 50"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-dark-input border text-white text-sm font-bold focus:outline-none ${
                    expenseErrors.amount ? 'border-expense' : 'border-dark-border focus:border-brand-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white mb-1">بند المصروف *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full px-3 py-2.5 rounded-xl bg-dark-input border border-dark-border text-white text-xs focus:border-brand-500 focus:outline-none"
                >
                  {Object.entries(categoryLabels).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-white mb-1">
                  الوصف / بيان المصروف:
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="مثال: بنزين 92 أو لحام كاوتش..."
                  className="w-full px-3.5 py-2 rounded-xl bg-dark-input border border-dark-border text-white text-xs focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-white mb-1">التاريخ *</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-dark-input border border-dark-border text-white text-xs focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-white mb-1">حالة الدفع</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-dark-input border border-dark-border text-white text-xs focus:border-brand-500 focus:outline-none"
                  >
                    <option value="paid">مدفوع نقداً (كاش)</option>
                    <option value="unpaid">أجل / مؤجل</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-dark-border text-dark-muted text-xs font-medium hover:bg-white/5 min-h-touch"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-lg shadow-brand-500/25 min-h-touch"
                >
                  حفظ المصروف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Fuel Modal */}
      {showFuelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-dark-card border border-dark-border rounded-2xl p-5 shadow-2xl text-right">
            <h3 className="text-base font-bold text-white mb-3">تسجيل تفويلة بنزين</h3>

            <form onSubmit={handleAddFuelLog} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-white mb-1">الكمية باللتر *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={fuelLiters}
                    onChange={(e) => setFuelLiters(e.target.value)}
                    placeholder="مثال: 4.5"
                    className="w-full px-3 py-2 rounded-xl bg-dark-input border border-dark-border text-white text-sm font-bold focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-white mb-1">
                    سعر اللتر (ج.م) *
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    value={fuelPricePerLiter}
                    onChange={(e) => setFuelPricePerLiter(e.target.value)}
                    placeholder="15"
                    className="w-full px-3 py-2 rounded-xl bg-dark-input border border-dark-border text-white text-sm focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              {fuelLiters && fuelPricePerLiter && (
                <div className="p-2.5 rounded-xl bg-dark-input border border-dark-border text-xs flex justify-between">
                  <span className="text-dark-muted">التكلفة الإجمالية:</span>
                  <span className="font-bold text-profit-light">
                    {formatEGPStandard(parseFloat(fuelLiters) * parseFloat(fuelPricePerLiter))}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-white mb-1">
                  قراءة العداد عند التفويل (كم) - اختياري:
                </label>
                <input
                  type="number"
                  value={fuelOdometer}
                  onChange={(e) => setFuelOdometer(e.target.value)}
                  placeholder="مثال: 12400"
                  className="w-full px-3 py-2 rounded-xl bg-dark-input border border-dark-border text-white text-xs focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFuelModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-dark-border text-dark-muted text-xs font-medium hover:bg-white/5 min-h-touch"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-lg shadow-amber-500/25 min-h-touch"
                >
                  تأكيد وحفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Expense Dialog */}
      <ConfirmDialog
        isOpen={Boolean(expenseToDelete)}
        title="حذف المصروف"
        message="هل أنت متأكد من حذف هذا المصروف؟ سيتم تعديل الحسابات المالية مباشرة."
        confirmLabel="نعم، حذف"
        isDestructive={true}
        onConfirm={handleDeleteExpense}
        onCancel={() => setExpenseToDelete(null)}
      />

      {/* Delete Fuel Dialog */}
      <ConfirmDialog
        isOpen={Boolean(fuelToDelete)}
        title="حذف سجل التفويل"
        message="هل أنت متأكد من حذف سجل الوقود هذا؟"
        confirmLabel="نعم، حذف"
        isDestructive={true}
        onConfirm={handleDeleteFuel}
        onCancel={() => setFuelToDelete(null)}
      />
    </div>
  );
};
