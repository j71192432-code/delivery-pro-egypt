import { getDb } from '../services/database';
import { DailySummary } from '../types';

export async function getAllSummaries(): Promise<DailySummary[]> {
  const db = await getDb();
  const all = await db.getAll('dailySummaries');
  return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getSummaryByDate(dateStr: string): Promise<DailySummary | undefined> {
  const db = await getDb();
  return db.get('dailySummaries', dateStr);
}

export async function saveDailySummary(summary: DailySummary): Promise<DailySummary> {
  const db = await getDb();
  const existing = await db.get('dailySummaries', summary.id);

  if (existing && existing.isClosed) {
    // Record traceable revision
    const revision = {
      revisedAt: new Date().toISOString(),
      reason: 'تحديث بيانات اليوم بعد الإقفال',
      previousTotals: {
        recognizedIncome: existing.recognizedIncome,
        netCashResult: existing.netCashResult,
        economicProfit: existing.economicProfit,
        deliveredOrders: existing.deliveredOrders,
      },
    };
    summary.revisions = [...(existing.revisions || []), revision];
  } else if (!summary.revisions) {
    summary.revisions = [];
  }

  await db.put('dailySummaries', summary);
  return summary;
}
