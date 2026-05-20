export interface AppSettings {
  auto_assign_limit: string;
  [key: string]: string;
}

export const fetchSettings = async (): Promise<AppSettings> => {
  const res = await fetch('/api/settings');
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
};

export const getSetting = async (key: string): Promise<string | null> => {
  try {
    const res = await fetch(`/api/settings/${key}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.value;
  } catch {
    return null;
  }
};

export const updateSetting = async (key: string, value: string): Promise<{ key: string; value: string }> => {
  const res = await fetch(`/api/settings/${key}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error('Failed to update setting');
  return res.json();
};
