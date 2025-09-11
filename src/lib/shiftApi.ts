export interface Shift {
  id: number;
  employee: number; // employee id
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  shift_type: number; // shift type id
  notes?: string;
}

export const fetchShifts = async (): Promise<Shift[]> => {
  const res = await fetch('/api/shifts');
  if (!res.ok) throw new Error('Failed to fetch shifts');
  return res.json();
};

export const addShift = async (shift: Omit<Shift, 'id'>): Promise<Shift> => {
  const res = await fetch('/api/shifts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(shift),
  });
  if (!res.ok) throw new Error('Failed to add shift');
  return res.json();
};

export const updateShift = async (id: number, shift: Omit<Shift, 'id'>): Promise<Shift> => {
  const res = await fetch(`/api/shifts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(shift),
  });
  if (!res.ok) throw new Error('Failed to update shift');
  return res.json();
};

export const deleteShift = async (id: number): Promise<{ id: number }> => {
  const res = await fetch(`/api/shifts/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete shift');
  return res.json();
};
