import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Header from "../components/layout/Header";

const fetchEmployees = async () => {
  const res = await fetch("/api/employees");
  if (!res.ok) throw new Error("Failed to fetch employees");
  return res.json();
};

const addEmployee = async (employee: { name: string; role: string; username: string; password: string }) => {
  const res = await fetch("/api/employees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(employee),
  });
  if (!res.ok) throw new Error("Failed to add employee");
  return res.json();
};

const updateEmployee = async (id: number, data: { role: string; name: string; username: string; password: string }) => {
  const res = await fetch(`/api/employees/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update employee");
  return res.json();
};

const deleteEmployee = async (id: number) => {
  const res = await fetch(`/api/employees/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete employee");
  return res.json();
};

const EmployeesPage = () => {
  const queryClient = useQueryClient();
  const { data: employees = [], isLoading, error } = useQuery({
    queryKey: ["employees"],
    queryFn: fetchEmployees,
  });
  const addMutation = useMutation({
    mutationFn: addEmployee,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number; role: string; name: string; username: string; password: string }) => updateEmployee(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteEmployee(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
  });
  const [name, setName] = useState("");
  const [role, setRole] = useState("employee");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!name || !username || !password) {
      setFormError("Name, username, and password required");
      return;
    }
    try {
      await addMutation.mutateAsync({ name, role, username, password });
      setName("");
      setRole("employee");
      setUsername("");
      setPassword("");
    } catch (err: any) {
      setFormError(err.message || "Failed to add employee");
    }
  };

  return (
    <>
      <Header />
      <div className="max-w-xl mx-auto py-8">
        <h2 className="text-2xl font-bold mb-4">Employees</h2>
      <form onSubmit={handleAdd} className="mb-6 flex gap-2 items-end">
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={e => setName(e.target.value)}
          className="border p-2 rounded w-32"
        />
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          className="border p-2 rounded w-32"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="border p-2 rounded w-32"
        />
        <select value={role} onChange={e => setRole(e.target.value)} className="border p-2 rounded">
          <option value="employee">Employee</option>
          <option value="manager">Manager</option>
        </select>
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">Add</button>
      </form>
      {formError && <div className="text-red-500 mb-2">{formError}</div>}
      {isLoading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-500">{String(error)}</div>
      ) : (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Username</th>
              <th className="p-2 text-left">Role</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp: any) => (
              <tr key={emp.id} className="border-t">
                <td className="p-2">{emp.name}</td>
                <td className="p-2">{emp.username}</td>
                <td className="p-2">
                  <select
                    value={emp.role || "employee"}
                    onChange={e => updateMutation.mutate({ id: emp.id, role: e.target.value, name: emp.name, username: emp.username, password: "" })}
                    className="border p-1 rounded"
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                  </select>
                </td>
                <td className="p-2">
                  <button
                    className="bg-red-500 text-white px-2 py-1 rounded"
                    onClick={() => deleteMutation.mutate(emp.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      </div>
    </>
  );
};

export default EmployeesPage;
