import { getDb, DEFAULT_SETTINGS } from '../services/database';
import { Settings } from '../types';

export async function getSettings(): Promise<Settings> {
  const db = await getDb();
  const record = await db.get('settings', 'app_settings');
  if (!record || !record.value) {
    await saveSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
  return { ...DEFAULT_SETTINGS, ...record.value };
}

export async function saveSettings(settings: Settings): Promise<Settings> {
  const db = await getDb();
  await db.put('settings', {
    key: 'app_settings',
    value: settings,
  });
  return settings;
}

export async function updateSettings(partial: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const updated: Settings = {
    ...current,
    ...partial,
  };
  return saveSettings(updated);
}
