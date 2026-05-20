export interface ShiftApplication {
  id: number;
  shift_id: number;
  employee_id: number;
  status: string;
  auto_assigned?: number;
  created_at: string;
}

export interface ApplyForShiftResponse {
  status: 'approved' | 'pending';
  auto_assigned: boolean;
  message: string;
  application?: ShiftApplication;
}

export const applyForShift = async (shift_id: number, employee_id: number): Promise<ApplyForShiftResponse> => {
  const res = await fetch('/api/shift-applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shift_id, employee_id }),
  });
  if (!res.ok) throw new Error('Failed to apply for shift');
  return res.json();
};

export const fetchShiftApplications = async (shift_id?: number, employee_id?: number): Promise<ShiftApplication[]> => {
  const params = new URLSearchParams();
  if (shift_id) params.append('shift_id', String(shift_id));
  if (employee_id) params.append('employee_id', String(employee_id));
  const url = params.toString() ? `/api/shift-applications?${params.toString()}` : '/api/shift-applications';
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
