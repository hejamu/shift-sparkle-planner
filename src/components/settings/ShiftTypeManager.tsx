
import React, { useEffect, useState } from "react";

export interface ShiftType {
  id: number;
  name: string;
  duration: number;
  color: string;
}

const fetchShiftTypes = async (): Promise<ShiftType[]> => {
  const res = await fetch("/api/shift-types");
  if (!res.ok) throw new Error("Failed to fetch shift types");
  return res.json();
};

const addShiftType = async (name: string, duration: number): Promise<ShiftType> => {
const addShiftType = async (name: string, duration: number, color: string): Promise<ShiftType> => {
  const res = await fetch("/api/shift-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, duration, color }),
  });
  if (!res.ok) throw new Error("Failed to add shift type");
  return res.json();
};

const updateShiftType = async (id: number, name: string, duration: number): Promise<ShiftType> => {
const updateShiftType = async (id: number, name: string, duration: number, color: string): Promise<ShiftType> => {
  const res = await fetch(`/api/shift-types/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, duration, color }),
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
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newDuration, setNewDuration] = useState<number>(8);
  const [newColor, setNewColor] = useState<string>("#60a5fa");
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDuration, setEditDuration] = useState<number>(8);
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
    if (!newName.trim() || newDuration <= 0) return;
    try {
      const added = await addShiftType(newName.trim(), newDuration, newColor);
      setShiftTypes([...shiftTypes, added]);
      setNewName("");
      setNewDuration(8);
      setNewColor("#60a5fa");
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (st: ShiftType) => {
  setEditingId(st.id);
  setEditName(st.name);
  setEditDuration(st.duration);
  setEditColor(st.color || "#60a5fa");
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim() || editDuration <= 0) return;
    try {
      const updated = await updateShiftType(id, editName.trim(), editDuration, editColor);
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
        <h2 className="text-lg font-semibold mb-4">Shift Types</h2>
        {/* Add new shift type form */}
  {/* Add shift type as a card at the end of the list */}
  {/* ...existing code... */}
        {loading ? (
          <div>Loading shift types...</div>
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
                      type="number"
                      min={1}
                      value={editDuration}
                      onChange={e => setEditDuration(Number(e.target.value))}
                    />
                    <input
                      className="border px-2 py-1 rounded w-24 mb-2"
                      type="color"
                      value={editColor}
                      onChange={e => setEditColor(e.target.value)}
                      title="Card color"
                    />
                    <div className="flex gap-2">
                      <button
                        className="bg-green-500 text-white px-3 py-1 rounded"
                        onClick={() => handleUpdate(st.id)}
                      >
                        Save
                      </button>
                      <button
                        className="bg-gray-300 text-gray-700 px-3 py-1 rounded"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-bold text-lg mb-1">{st.name}</div>
                    <div className="text-gray-600 mb-2">Duration: {st.duration} hours</div>
                    <button
                      className="absolute top-2 right-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full p-2"
                      onClick={() => handleEdit(st)}
                      title="Edit"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-2.828 0L9 13zm0 0V17m0 0H5m4 0h4" /></svg>
                    </button>
                    <button
                      className="absolute bottom-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2"
                      onClick={() => handleDelete(st.id)}
                      title="Delete"
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
                  title="Add shift type"
                  onClick={() => {
                    setAddOpen(true);
                    setNewName("");
                    setNewDuration(8);
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
                    placeholder="Shift type name"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    required
                  />
                  <input
                    className="border px-2 py-1 rounded w-24"
                    type="number"
                    min={1}
                    placeholder="Duration (h)"
                    value={newDuration}
                    onChange={e => setNewDuration(Number(e.target.value))}
                    required
                  />
                  <input
                    className="border px-2 py-1 rounded w-24"
                    type="color"
                    value={newColor}
                    onChange={e => setNewColor(e.target.value)}
                    title="Card color"
                  />
                  <div className="flex gap-2">
                    <button
                      className="bg-blue-500 text-white px-4 py-1 rounded"
                      type="submit"
                    >
                      Add
                    </button>
                    <button
                      className="bg-gray-300 text-gray-700 px-4 py-1 rounded"
                      type="button"
                      onClick={() => {
                        setNewName("");
                        setNewDuration(8);
                        setNewColor("#60a5fa");
                        setError(null);
                        setAddOpen(false);
                      }}
                    >
                      Cancel
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
