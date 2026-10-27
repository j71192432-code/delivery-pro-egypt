import React, { useState, useEffect } from 'react';
import {
  Save,
  Download,
  Trash2,
  Shield,
  Smartphone,
  Bike,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Settings } from '../types';
import { getSettings, saveSettings } from '../repositories/settingsRepository';
import {
  createFullBackup,
  validateBackupFile,
  restoreBackup,
  wipeAllLocalData,
  downloadFile,
  BackupPreview,
  BackupPayload,
} from '../services/backup';
import { getLocalDateString } from '../utils/date';
import { ConfirmDialog } from '../components/ConfirmDialog';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Backup & Import states
  const [backupFilePayload, setBackupFilePayload] = useState<BackupPayload | null>(null);
  const [backupPreview, setBackupPreview] = useState<BackupPreview | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [showImportConfirm, setShowImportConfirm] = useState<boolean>(false);
  const [showWipeConfirm, setShowWipeConfirm] = useState<boolean>(false);
  const [importError, setImportError] = useState<string | null>(null);

  // PWA Install Prompt state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    async function load() {
      try {
        const s = await getSettings();
        setSettings(s);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();

    // Check PWA display mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      await saveSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'فشل حفظ الإعدادات');
    }
  };

  const handleExportBackup = async () => {
    try {
      const backup = await createFullBackup();
      const jsonStr = JSON.stringify(backup, null, 2);
      const filename = `delivery-pro-backup-${getLocalDateString()}.json`;
      downloadFile(jsonStr, filename, 'application/json');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'فشل تصدير النسخة الاحتياطية');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const result = validateBackupFile(parsed);

        if (!result.isValid || !result.payload || !result.preview) {
          setImportError(result.error || 'ملف النسخة الاحتياطية غير صالح');
          setBackupFilePayload(null);
          setBackupPreview(null);
          return;
        }

        setBackupFilePayload(result.payload);
        setBackupPreview(result.preview);
      } catch {
        setImportError('تعذر قراءة الملف. تأكد من أنه ملف JSON سليم تم تصديره من التطبيق.');
      }
    };

    reader.readAsText(file);
  };

  const handleExecuteRestore = async () => {
    if (!backupFilePayload) return;

    try {
      await restoreBackup(backupFilePayload, importMode);
      setShowImportConfirm(false);
      setBackupFilePayload(null);
      setBackupPreview(null);
      alert('تم استعادة البيانات بنجاح!');
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'فشلت عملية الاستعادة');
    }
  };

  const handleExecuteWipe = async () => {
    try {
      await wipeAllLocalData();
      setShowWipeConfirm(false);
      alert('تم مسح جميع البيانات المحلية بنجاح');
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'فشل مسح البيانات');
    }
  };

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert(
        'لتثبيت التطبيق على أندرويد:\n1. اضغط على قائمة المتصفح (ثلاث نقاط أعلى اليمين)\n2. اختر "إضافة إلى الشاشة الرئيسية" أو "تثبيت التطبيق".'
      );
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="pb-24 px-4 max-w-lg mx-auto animate-fadeIn">
      {/* Title */}
      <div className="mt-3 mb-4">
        <h1 className="text-xl font-black text-white">إعدادات التطبيق والمركبة</h1>
        <p className="text-xs text-dark-muted">تخصيص الحسابات وتأمين النسخ الاحتياطية</p>
      </div>

      {saveSuccess && (
        <div className="mb-4 p-3 rounded-xl bg-profit-bg border border-profit/30 text-profit-light text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>تم حفظ الإعدادات بنجاح.</span>
        </div>
      )}

      {/* Vehicle & Fuel Rates Form */}
      <form onSubmit={handleSaveSettings} className="bg-dark-card border border-dark-border rounded-2xl p-4 mb-4">
        <h2 className="text-xs font-bold text-white mb-3 flex items-center gap-1.5">
          <Bike className="w-4 h-4 text-brand-400" />
          <span>بيانات الموتوسيكل ومعدلات التشغيل</span>
        </h2>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-dark-muted mb-1 block">
              اسم أو موديل الموتوسيكل:
            </label>
            <input
              type="text"
              value={settings.motorcycleName}
              onChange={(e) => setSettings({ ...settings, motorcycleName: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-dark-input border border-dark-border text-white text-xs focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-medium text-dark-muted mb-1 block">
                سعر لتر البنزين (ج.م):
              </label>
              <input
                type="number"
                step="0.25"
                value={settings.fuelPricePerLiter}
                onChange={(e) =>
                  setSettings({ ...settings, fuelPricePerLiter: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 rounded-xl bg-dark-input border border-dark-border text-white text-sm font-bold focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-dark-muted mb-1 block">
                معدل الاستهلاك (كم / لتر):
              </label>
              <input
                type="number"
                step="1"
                value={settings.estimatedKmPerLiter}
                onChange={(e) =>
                  setSettings({ ...settings, estimatedKmPerLiter: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 rounded-xl bg-dark-input border border-dark-border text-white text-sm font-bold focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-medium text-dark-muted mb-1 block">
                تكلفة الصيانة التقديرية (ج.م/كم):
              </label>
              <input
                type="number"
                step="0.1"
                value={settings.maintenanceCostPerKm}
                onChange={(e) =>
                  setSettings({ ...settings, maintenanceCostPerKm: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 rounded-xl bg-dark-input border border-dark-border text-white text-sm font-bold focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-dark-muted mb-1 block">المدينة الافتراضية:</label>
              <input
                type="text"
                value={settings.defaultCity}
                onChange={(e) => setSettings({ ...settings, defaultCity: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-dark-input border border-dark-border text-white text-xs focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-dark-border/60">
            <div>
              <span className="text-xs font-bold text-white block">احتساب استهلاك الصيانة آلياً</span>
              <span className="text-[10px] text-dark-muted">
                لحساب الربح الاقتصادي الصافي بدقة
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.autoAccrueMaintenance}
              onChange={(e) => setSettings({ ...settings, autoAccrueMaintenance: e.target.checked })}
              className="w-5 h-5 rounded-md accent-brand-500 cursor-pointer"
            />
          </div>

          <button
            type="submit"
            className="w-full mt-2 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-md shadow-brand-500/25 transition min-h-touch"
          >
            <Save className="w-4 h-4" />
            <span>حفظ إعدادات المركبة</span>
          </button>
        </div>
      </form>

      {/* Backup and Restore Center */}
      <div className="bg-dark-card border border-dark-border rounded-2xl p-4 mb-4">
        <h2 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>مركز النسخ الاحتياطي والأمان المحلي</span>
        </h2>
        <p className="text-xs text-dark-muted mb-3 leading-relaxed">
          بياناتك محفوظة داخل هاتفك فقط. احرص على تصدير نسخة احتياطية دورية لنقلها لجهاز آخر أو استرجاعها عند مسح ذاكرة المتصفح.
        </p>

        <div className="space-y-3">
          {/* Export Button */}
          <button
            type="button"
            onClick={handleExportBackup}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-dark-input hover:bg-white/5 border border-dark-border text-white font-bold text-xs transition min-h-touch"
          >
            <Download className="w-4 h-4 text-brand-400" />
            <span>تصدير نسخة احتياطية كاملة (JSON)</span>
          </button>

          {/* Import File Input */}
          <div>
            <label className="block text-xs font-medium text-dark-muted mb-1.5">
              استيراد نسخة احتياطية سابقة:
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="w-full text-xs text-dark-muted file:mr-0 file:ml-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-500/20 file:text-brand-300 hover:file:bg-brand-500/30"
            />
          </div>

          {importError && (
            <div className="p-2.5 rounded-xl bg-expense-bg border border-expense/30 text-expense-light text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          {/* Backup Preview Card */}
          {backupPreview && (
            <div className="p-3.5 rounded-xl bg-dark-input border border-brand-500/40 text-xs animate-fadeIn">
              <div className="font-bold text-white mb-2 flex items-center justify-between">
                <span>معاينة محتويات النسخة:</span>
                <span className="text-[10px] text-brand-300 font-mono">
                  {backupPreview.exportedAt.slice(0, 10)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1 text-dark-muted mb-3">
                <div>الأوردرات: <strong className="text-white">{backupPreview.orderCount}</strong></div>
                <div>المصروفات: <strong className="text-white">{backupPreview.expenseCount}</strong></div>
                <div>سجلات الوقود: <strong className="text-white">{backupPreview.fuelCount}</strong></div>
                <div>الورديات: <strong className="text-white">{backupPreview.sessionCount}</strong></div>
              </div>

              <div className="space-y-2 pt-2 border-t border-dark-border">
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-white cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="merge"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="accent-brand-500"
                    />
                    <span>دمج مع السجلات الحالية</span>
                  </label>

                  <label className="flex items-center gap-1.5 text-xs text-expense-light cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="accent-expense"
                    />
                    <span>استبدال كافة البيانات</span>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => setShowImportConfirm(true)}
                  className="w-full mt-2 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-md shadow-brand-500/25 transition min-h-touch"
                >
                  بدء الاستعادة الآن
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PWA Installation Info */}
      <div className="bg-dark-card border border-dark-border rounded-2xl p-4 mb-4">
        <h2 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
          <Smartphone className="w-4 h-4 text-brand-400" />
          <span>تثبيت التطبيق على هاتف أندرويد (PWA)</span>
        </h2>

        <p className="text-xs text-dark-muted leading-relaxed mb-3">
          يعمل التطبيق كتطبيق هاتف أصلي بدون الحاجة لمتجر Google Play، مع إمكانية التشغيل التام بدون اتصال إنترنت (أوفلاين).
        </p>

        {isInstalled ? (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>التطبيق مثبت ويعمل كـ Progressive Web App مستقل على جهازك.</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleInstallApp}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-purple-600 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-brand-500/25 transition min-h-touch"
          >
            <Smartphone className="w-4 h-4" />
            <span>تثبيت التطبيق على الهاتف الآن</span>
          </button>
        )}
      </div>

      {/* Danger Zone: Wipe All Data */}
      <div className="bg-dark-card border border-expense/30 rounded-2xl p-4">
        <h2 className="text-xs font-bold text-expense-light mb-1.5 flex items-center gap-1.5">
          <Trash2 className="w-4 h-4 text-expense" />
          <span>منطقة الحذف الكامل</span>
        </h2>
        <p className="text-xs text-dark-muted mb-3 leading-relaxed">
          حذف كافة الأوردرات والمصروفات وسجلات الورديات من الهاتف نهائياً. لا يمكن التراجع إلا إذا كنت تملك نسخة احتياطية.
        </p>

        <button
          type="button"
          onClick={() => setShowWipeConfirm(true)}
          className="w-full py-2.5 rounded-xl border border-expense/40 text-expense-light hover:bg-expense/10 text-xs font-bold transition min-h-touch"
        >
          مسح جميع بيانات التطبيق
        </button>
      </div>

      {/* Restore Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showImportConfirm}
        title={importMode === 'replace' ? 'استبدال كامل البيانات' : 'تأكيد دمج النسخة الاحتياطية'}
        message={
          importMode === 'replace'
            ? 'تنبيه: سيتم مسح كافة البيانات الحالية في التطبيق واستبدالها بمحتويات ملف النسخة الاحتياطية. هل تريد المتابعة؟'
            : 'سيتم دمج سجلات الأوردرات والمصروفات مع البيانات الحالية دون حذف السجلات الفريدة. هل تريد المتابعة؟'
        }
        confirmLabel="تأكيد الاستعادة"
        isDestructive={importMode === 'replace'}
        onConfirm={handleExecuteRestore}
        onCancel={() => setShowImportConfirm(false)}
      />

      {/* Wipe Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showWipeConfirm}
        title="تأكيد مسح كافة بيانات التطبيق"
        message="هل أنت متأكد تماماً من رغبتك في حذف كافة السجلات المالية والأوردرات المحفوظة محلياً؟ هذا الإجراء لا يمكن التراجع عنه!"
        confirmLabel="نعم، احذف كل شيء"
        isDestructive={true}
        onConfirm={handleExecuteWipe}
        onCancel={() => setShowWipeConfirm(false)}
      />
    </div>
  );
};
