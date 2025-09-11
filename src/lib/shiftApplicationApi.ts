export interface ShiftApplication {
  id: number;
  shift_id: number;
  employee_id: number;
  status: string;
  created_at: string;
}

export const applyForShift = async (shift_id: number, employee_id: number): Promise<ShiftApplication> => {
  const res = await fetch('/api/shift-applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shift_id, employee_id }),
  });
  if (!res.ok) throw new Error('Failed to apply for shift');
  return res.json();
};

export const fetchShiftApplications = async (shift_id?: number): Promise<ShiftApplication[]> => {
  const url = shift_id ? `/api/shift-applications?shift_id=${shift_id}` : '/api/shift-applications';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch shift applications');
  return res.json();
};

export const updateShiftApplicationStatus = async (id: number, status: string): Promise<{ id: number; status: string }> => {
  const res = await fetch(`/api/shift-applications/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Failed to update application status');
  return res.json();
};
