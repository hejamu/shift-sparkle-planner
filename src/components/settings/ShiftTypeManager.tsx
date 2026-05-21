import * as React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export interface ShiftType {
  id: number;
  name: string;
  color: string;
}

const fetchShiftTypes = async (): Promise<ShiftType[]> => {
  const res = await fetch("/api/shift-types");
  if (!res.ok) throw new Error("Failed to fetch shift types");
  return res.json();
};

// Remove duplicate declaration and use correct signature
const addShiftType = async (name: string, color: string): Promise<ShiftType> => {
  const res = await fetch("/api/shift-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, color }),
  });
  if (!res.ok) throw new Error("Failed to add shift type");
  return res.json();
};

// Remove duplicate declaration and use correct signature
const updateShiftType = async (id: number, name: string, color: string): Promise<ShiftType> => {
  const res = await fetch(`/api/shift-types/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, color }),
  });
  if (!res.ok) throw new Error("Failed to update shift type");
  return res.json();
};

const deleteShiftType = async (id: number): Promise<{ id: number }> => {
  const res = await fetch(`/api/shift-types/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete shift type");
  return res.json();
};

const ShiftTypeManager: React.FC = () => {
  const { t } = useTranslation();
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>("#60a5fa");
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<string>("#60a5fa");

    useEffect(() => {
      fetchShiftTypes()
        .then(data => {
          setShiftTypes(data);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message);
          setLoading(false);
        });
    }, []);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      const added = await addShiftType(newName.trim(), newColor);
      setShiftTypes([...shiftTypes, added]);
      setNewName("");
      setNewColor("#60a5fa");
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (st: ShiftType) => {
  setEditingId(st.id);
  setEditName(st.name);
  setEditColor(st.color || "#60a5fa");
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim()) return;
    try {
      const updated = await updateShiftType(id, editName.trim(), editColor);
      setShiftTypes(shiftTypes.map(st => st.id === id ? updated : st));
      setEditingId(null);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteShiftType(id);
      setShiftTypes(shiftTypes.filter(st => st.id !== id));
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="mb-8">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{t("shiftTypes")}</h2>
      </div>
      {loading ? (
        <div>{t("loadingShiftTypes")}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shiftTypes.map(st => (
            <div key={st.id} className="shadow rounded-lg p-4 relative flex flex-col" style={{ background: st.color }}>
                  {editingId === st.id ? (
                <>
                  <input
                    className="border px-2 py-1 rounded mb-2"
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                  />
                  
                  <input
                    className="border px-2 py-1 rounded w-24 mb-2"
                    type="color"
                    value={editColor}
                    onChange={e => setEditColor(e.target.value)}
                    title={t("cardColor")}
                  />
                  <div className="flex gap-2">
                    <button
                      className="bg-green-500 text-white px-3 py-1 rounded"
                      onClick={() => handleUpdate(st.id)}
                    >
                      {t("save")}
                    </button>
                    <button
                      className="bg-gray-300 text-gray-700 px-3 py-1 rounded"
                      onClick={() => setEditingId(null)}
                    >
                      {t("cancel")}
                    </button>
                  </div>
                </>
                  ) : (
                <>
                  <div className="font-bold text-lg mb-1">{st.name}</div>
                  <div className="text-gray-600 mb-2">{t("colorLabel")}: {st.color}</div>
                  <button
                    className="absolute top-2 right-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full p-2"
                    onClick={() => handleEdit(st)}
                    title={t("edit")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-2.828 0L9 13zm0 0V17m0 0H5m4 0h4" /></svg>
                  </button>
                  <button
                    className="absolute bottom-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2"
                    onClick={() => handleDelete(st.id)}
                    title={t("delete")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </>
              )}
            </div>
          ))}
          {/* Add card for new shift type */}
          <div className="bg-white shadow rounded-lg p-4 relative flex flex-col justify-center items-center min-h-[120px]">
            {!addOpen ? (
              <button
                className="bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full p-3"
                title={t("addShiftType")}
                onClick={() => {
                  setAddOpen(true);
                  setNewName("");
                  setNewColor("#60a5fa");
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </button>
            ) : (
              <form
                className="flex flex-col gap-2 w-full"
                onSubmit={e => {
                  e.preventDefault();
                  handleAdd();
                  setAddOpen(false);
                }}
              >
                <input
                  className="border px-2 py-1 rounded"
                  type="text"
                  placeholder={t("shiftTypeName")}
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  required
                />
                <input
                  className="border px-2 py-1 rounded w-24"
                  type="color"
                  value={newColor}
                  onChange={e => setNewColor(e.target.value)}
                  title={t("cardColor")}
                />
                <div className="flex gap-2">
                  <button
                    className="bg-blue-500 text-white px-4 py-1 rounded"
                    type="submit"
                  >
                    {t("add")}
                  </button>
                  <button
                    className="bg-gray-300 text-gray-700 px-4 py-1 rounded"
                    type="button"
                    onClick={() => {
                      setNewName("");
                      setNewColor("#60a5fa");
                      setError(null);
                      setAddOpen(false);
                    }}
                  >
                    {t("cancel")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {error && <div className="text-red-500 mt-2">{error}</div>}
    </div>
  );
};

export default ShiftTypeManager;
