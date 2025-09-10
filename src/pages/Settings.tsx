
import React, { useState } from "react";
import Header from "@/components/layout/Header";
import ShiftTypeManager from "@/components/settings/ShiftTypeManager";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchEmployees,
  addEmployeeApi,
  updateEmployeeRoleApi,
  EmployeeApi,
} from "../lib/employeeApi";


const Settings: React.FC = () => {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [dbExists, setDbExists] = useState<boolean | null>(null);
  const [dbInitLoading, setDbInitLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // Check DB status on mount
  React.useEffect(() => {
    fetch("/api/db-status")
      .then(res => res.json())
      .then(data => setDbExists(data.exists))
      .catch(() => setDbExists(false));
  }, []);

  const handleInitDb = async () => {
    setDbInitLoading(true);
    setDbError(null);
    try {
      const res = await fetch("/api/init-db", { method: "POST" });
      if (!res.ok) throw new Error("Failed to initialize database");
      setDbExists(true);
    } catch (err: any) {
      setDbError(err.message);
    } finally {
      setDbInitLoading(false);
    }
  };

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: fetchEmployees,
  });

  const addEmployeeMutation = useMutation({
    mutationFn: ({ name, isManager }: { name: string; isManager: boolean }) =>
      addEmployeeApi(name, isManager),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, isManager }: { id: number; isManager: boolean }) =>
      updateEmployeeRoleApi(id, isManager),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  const addEmployee = () => {
    if (newName.trim() === "") return;
    addEmployeeMutation.mutate({ name: newName, isManager: false });
    setNewName("");
  };

  const toggleManager = (id: number, isManager: boolean) => {
    updateRoleMutation.mutate({ id, isManager: !isManager });
  };


  return (
      <>
        <Header />
        <div className="container mx-auto px-6 py-8">
          <h1 className="text-2xl font-bold mb-4">Settings</h1>
          {/* DB Status Section */}
          <div className="mb-8 p-4 bg-gray-50 rounded border">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Database status:</span>
              {dbExists === null ? (
                <span>Checking...</span>
              ) : dbExists ? (
                <span className="text-green-600">Exists</span>
              ) : (
                <span className="text-red-600">Missing</span>
              )}
            </div>
            {dbExists === false && (
              <button
                className="mt-2 bg-blue-500 text-white px-4 py-1 rounded"
                onClick={handleInitDb}
                disabled={dbInitLoading}
              >
                {dbInitLoading ? "Initializing..." : "Initialize Database"}
              </button>
            )}
            {dbError && <div className="text-red-500 mt-2">{dbError}</div>}
          </div>
          {/* Only show ShiftTypeManager if DB exists */}
          {dbExists ? <ShiftTypeManager /> : <div className="text-gray-500 mb-8">Database is missing. Please initialize to manage shift types.</div>}
          <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Add Employee</h2>
          <div className="flex gap-2">
            <input
              className="border px-2 py-1 rounded"
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Employee name"
            />
            <button
              className="bg-blue-500 text-white px-4 py-1 rounded"
              onClick={addEmployee}
              disabled={addEmployeeMutation.isPending}
            >
              Add
            </button>
          </div>
          {addEmployeeMutation.isError && (
            <div className="text-red-500 mt-2">Error adding employee</div>
          )}
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-2">Employees</h2>
          {isLoading ? (
            <div>Loading...</div>
          ) : (
            <ul>
              {employees.map(emp => {
                const isManager = emp.role === "manager";
                return (
                  <li key={emp.id} className="flex items-center justify-between py-2 border-b">
                    <span>{emp.name}</span>
                    <div className="flex items-center gap-2">
                      <span className={isManager ? "text-green-600 font-bold" : "text-gray-500"}>
                        {isManager ? "Manager" : "Employee"}
                      </span>
                      <button
                        className="bg-gray-200 px-2 py-1 rounded"
                        onClick={() => toggleManager(emp.id, isManager)}
                        disabled={updateRoleMutation.isPending}
                      >
                        {isManager ? "Demote" : "Make Manager"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {updateRoleMutation.isError && (
            <div className="text-red-500 mt-2">Error updating role</div>
          )}
        </div>
      </div>
    </>
  );
};

export default Settings;
