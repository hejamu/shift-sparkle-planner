
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
// Drop all tables API call
const dropAllTables = async (): Promise<void> => {
  const res = await fetch('/api/drop-tables', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to drop tables');
};
import Header from "@/components/layout/Header";
import ShiftTypeManager from "@/components/settings/ShiftTypeManager";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchEmployees,
  addEmployeeApi,
  updateEmployeeRoleApi,
  EmployeeApi,
} from "../lib/employeeApi";


const Administration: React.FC = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [newName, setNewName] = useState("");
  const dbName = "shiftplanner.sqlite";
  const [dbExists, setDbExists] = useState<boolean | null>(null);
  const [dbValid, setDbValid] = useState<boolean | null>(null);
  const [missingTables, setMissingTables] = useState<string[]>([]);
  const [dbInitLoading, setDbInitLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  // ...existing code...
  // Replace visible text in JSX with t() as needed

  // Check DB status on mount and when dbName changes
  useEffect(() => {
    setDbExists(null);
    setDbValid(null);
    setMissingTables([]);
    fetch(`/api/db-exists`)
      .then(res => res.json())
      .then(data => setDbExists(data.exists))
      .catch(() => setDbExists(false));
    fetch(`/api/db-tables`)
      .then(res => res.json())
      .then(data => {
        setDbValid(data.valid);
        setMissingTables(data.missing || []);
      })
      .catch(() => setDbValid(false));
  }, []);

  const handleInitDb = async () => {
    setDbInitLoading(true);
    setDbError(null);
    try {
      const res = await fetch(`/api/init-db`, { method: "POST" });
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

    // Fetch shift types
    const [shiftTypes, setShiftTypes] = useState<any[] | null>(null);
    const [shiftTypesError, setShiftTypesError] = useState<string | null>(null);
    useEffect(() => {
      fetch('/api/shift-types')
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch shift types');
          return res.json();
        })
        .then(data => setShiftTypes(data))
        .catch(err => setShiftTypesError(err.message));
    }, []);

  return (
      <>
        <Header />
        <div className="container mx-auto px-6 py-8">
          <h1 className="text-2xl font-bold mb-4">Administration</h1>
          {/* DB Name Config Section removed */}
          {/* DB Status Section */}
          <div className="mb-8 p-4 bg-gray-50 rounded border">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Database file:</span>
              {dbExists === null ? (
                <span>Checking...</span>
              ) : dbExists ? (
                <span className="text-green-600">Exists</span>
              ) : (
                <span className="text-red-600">Missing</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="font-semibold">Tables:</span>
              {dbValid === null ? (
                <span>Checking...</span>
              ) : dbValid ? (
                <span className="text-green-600">All required tables exist</span>
              ) : (
                <span className="text-red-600">Missing tables: {missingTables.join(", ")}</span>
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
            {/* Option to initialize missing tables if DB exists but tables are missing */}
            {dbExists && dbValid === false && (
              <button
                className="mt-2 bg-yellow-500 text-white px-4 py-1 rounded"
                onClick={handleInitDb}
                disabled={dbInitLoading}
              >
                {dbInitLoading ? "Initializing..." : `Initialize Missing Tables (${missingTables.join(", ")})`}
              </button>
            )}
            {/* Drop All Tables button */}
            {dbExists && (
              <button
                className="mt-2 bg-red-600 text-white px-4 py-1 rounded"
                onClick={async () => {
                  try {
                    await dropAllTables();
                    setDbValid(false);
                    setDbExists(true);
                  } catch (err: any) {
                    setDbError(err.message);
                  }
                }}
              >
                Drop All Tables
              </button>
            )}
            {dbError && <div className="text-red-500 mt-2">{dbError}</div>}
          </div>
            {/* Only show ShiftTypeManager if shift types are successfully fetched */}
            {shiftTypes && Array.isArray(shiftTypes) ? (
              <ShiftTypeManager />
            ) : (
              <div className="text-gray-500 mb-8">Shift types could not be loaded. Please check database and API.</div>
            )}

          {/* Removed duplicate Drop All Tables button */}
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

export default Administration;
