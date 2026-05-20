import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Header from "@/components/layout/Header";
import ShiftTypeManager from "@/components/settings/ShiftTypeManager";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchEmployees,
  addEmployeeApi,
  updateEmployeeRoleApi,
  EmployeeApi,
} from "../lib/employeeApi";
import { getSetting, updateSetting } from "../lib/settingsApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Settings2, Save, Loader2 } from "lucide-react";

const dropAllTables = async (): Promise<void> => {
  const res = await fetch('/api/drop-tables', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to drop tables');
};

const Administration: React.FC = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [newName, setNewName] = useState("");
  const [dbExists, setDbExists] = useState<boolean | null>(null);
  const [dbValid, setDbValid] = useState<boolean | null>(null);
  const [missingTables, setMissingTables] = useState<string[]>([]);
  const [dbInitLoading, setDbInitLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // Check DB status on mount
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

  // Auto-assign settings
  const [autoAssignLimit, setAutoAssignLimit] = useState<string>("");
  const [autoAssignLoading, setAutoAssignLoading] = useState(true);
  const [autoAssignSaving, setAutoAssignSaving] = useState(false);
  const [autoAssignError, setAutoAssignError] = useState<string | null>(null);
  const [autoAssignSuccess, setAutoAssignSuccess] = useState(false);

  useEffect(() => {
    getSetting("auto_assign_limit")
      .then((value) => {
        setAutoAssignLimit(value || "1");
        setAutoAssignLoading(false);
      })
      .catch((err) => {
        setAutoAssignError(err.message);
        setAutoAssignLoading(false);
      });
  }, []);

  const handleSaveAutoAssignLimit = async () => {
    setAutoAssignSaving(true);
    setAutoAssignError(null);
    setAutoAssignSuccess(false);
    try {
      await updateSetting("auto_assign_limit", autoAssignLimit);
      setAutoAssignSuccess(true);
      setTimeout(() => setAutoAssignSuccess(false), 2000);
    } catch (err: any) {
      setAutoAssignError(err.message);
    } finally {
      setAutoAssignSaving(false);
    }
  };

  return (
      <>
        <Header />
        <div className="container mx-auto px-6 py-8">
          <h1 className="text-2xl font-bold mb-4">{t("administration")}</h1>
          {/* DB Name Config Section removed */}
          {/* DB Status Section */}
          <div className="mb-8 p-4 bg-gray-50 rounded border">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{t("databaseFile")}:</span>
              {dbExists === null ? (
                <span>{t("checking")}</span>
              ) : dbExists ? (
                <span className="text-green-600">{t("exists")}</span>
              ) : (
                <span className="text-red-600">{t("missing")}</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="font-semibold">{t("tables")}:</span>
              {dbValid === null ? (
                <span>{t("checking")}</span>
              ) : dbValid ? (
                <span className="text-green-600">{t("allTablesExist")}</span>
              ) : (
                <span className="text-red-600">{t("missingTables")}: {missingTables.join(", ")}</span>
              )}
            </div>
            {dbExists === false && (
              <button
                className="mt-2 bg-blue-500 text-white px-4 py-1 rounded"
                onClick={handleInitDb}
                disabled={dbInitLoading}
              >
                {dbInitLoading ? t("initializing") : t("initializeDatabase")}
              </button>
            )}
            {/* Option to initialize missing tables if DB exists but tables are missing */}
            {dbExists && dbValid === false && (
              <button
                className="mt-2 bg-yellow-500 text-white px-4 py-1 rounded"
                onClick={handleInitDb}
                disabled={dbInitLoading}
              >
                {dbInitLoading ? t("initializing") : `${t("initializeMissingTables")} (${missingTables.join(", ")})`}
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
                {t("dropAllTables")}
              </button>
            )}
            {dbError && <div className="text-red-500 mt-2">{dbError}</div>}
          </div>

          {/* Auto-Assign Settings */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                {t("autoAssignSettings")}
              </CardTitle>
              <CardDescription>
                {t("autoAssignDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {autoAssignLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("loadingSettings")}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-end gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="autoAssignLimit">
                        {t("autoAssignLimitLabel")}
                      </Label>
                      <Input
                        id="autoAssignLimit"
                        type="number"
                        min="0"
                        max="10"
                        className="w-32"
                        value={autoAssignLimit}
                        onChange={(e) => setAutoAssignLimit(e.target.value)}
                      />
                    </div>
                    <Button 
                      onClick={handleSaveAutoAssignLimit}
                      disabled={autoAssignSaving}
                    >
                      {autoAssignSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("saving")}
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          {t("save")}
                        </>
                      )}
                    </Button>
                  </div>
                  {autoAssignError && (
                    <p className="text-sm text-red-500">{autoAssignError}</p>
                  )}
                  {autoAssignSuccess && (
                    <p className="text-sm text-green-600">{t("settingsSaved")}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {t("autoAssignDisableHint")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

            {/* Only show ShiftTypeManager if shift types are successfully fetched */}
            {shiftTypes && Array.isArray(shiftTypes) ? (
              <ShiftTypeManager />
            ) : (
              <div className="text-gray-500 mb-8">{t("shiftTypesLoadError")}</div>
            )}

          {/* Removed duplicate Drop All Tables button */}
          <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">{t("addEmployee")}</h2>
          <div className="flex gap-2">
            <input
              className="border px-2 py-1 rounded"
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder={t("employeeName")}
            />
            <button
              className="bg-blue-500 text-white px-4 py-1 rounded"
              onClick={addEmployee}
              disabled={addEmployeeMutation.isPending}
            >
              {t("add")}
            </button>
          </div>
          {addEmployeeMutation.isError && (
            <div className="text-red-500 mt-2">{t("errorAddingEmployee")}</div>
          )}
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-2">{t("employees")}</h2>
          {isLoading ? (
            <div>{t("loading")}</div>
          ) : (
            <ul>
              {employees.map(emp => {
                const isManager = emp.role === "manager";
                return (
                  <li key={emp.id} className="flex items-center justify-between py-2 border-b">
                    <span>{emp.name}</span>
                    <div className="flex items-center gap-2">
                      <span className={isManager ? "text-green-600 font-bold" : "text-gray-500"}>
                        {isManager ? t("manager") : t("employee")}
                      </span>
                      <button
                        className="bg-gray-200 px-2 py-1 rounded"
                        onClick={() => toggleManager(emp.id, isManager)}
                        disabled={updateRoleMutation.isPending}
                      >
                        {isManager ? t("demote") : t("makeManager")}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {updateRoleMutation.isError && (
            <div className="text-red-500 mt-2">{t("errorUpdatingRole")}</div>
          )}
        </div>
      </div>
    </>
  );
};

export default Administration;
