export interface EmployeeApi {
  id: number;
  name: string;
  role: string;
  active?: boolean;
}
export const setEmployeeActiveState = async (id: number, active: boolean): Promise<EmployeeApi> => {
  const res = await fetch(`/api/employees/${id}/active`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ active }),
  });
  if (!res.ok) throw new Error("Failed to update employee active state");
  return res.json();
};

export const fetchEmployees = async (): Promise<EmployeeApi[]> => {
  const res = await fetch("/api/employees");
  if (!res.ok) throw new Error("Failed to fetch employees");
  return res.json();
};

export const addEmployeeApi = async (name: string, isManager: boolean): Promise<EmployeeApi> => {
  const res = await fetch("/api/employees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, isManager }),
  });
  if (!res.ok) throw new Error("Failed to add employee");
  return res.json();
};

export const updateEmployeeRoleApi = async (id: number, isManager: boolean): Promise<EmployeeApi> => {
  const res = await fetch(`/api/employees/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isManager }),
  });
  if (!res.ok) throw new Error("Failed to update employee role");
  return res.json();
};
