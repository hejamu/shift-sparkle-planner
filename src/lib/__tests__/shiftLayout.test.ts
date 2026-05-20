import { describe, expect, it } from "vitest";
import { layoutShiftsForWeek, packOverlappingShifts } from "../shiftLayout";
import type { Shift } from "../shiftApi";

const types = [
  { id: 1, name: "Day", color: "#ff0000" },
  { id: 2, name: "Night", color: "#0000ff" },
];

const baseShift = (over: Partial<Shift>): Shift => ({
  id: 0,
  employee: null,
  date: "2026-05-21", // Thursday
  start_time: "09:00",
  end_time: "17:00",
  shift_type: 1,
  ...over,
});

describe("layoutShiftsForWeek", () => {
  const weekStart = new Date(2026, 4, 21); // Thursday 2026-05-21

  it("filters out shifts outside the week", () => {
    const result = layoutShiftsForWeek(
      [
        baseShift({ id: 1, date: "2026-05-21" }), // in week
        baseShift({ id: 2, date: "2026-05-13" }), // before
        baseShift({ id: 3, date: "2026-05-28" }), // after
      ],
      weekStart,
      types,
    );
    expect(result.map((s) => s.id).sort()).toEqual([1]);
  });

  it("colors each shift by shift_type, falling back when unknown", () => {
    const result = layoutShiftsForWeek(
      [baseShift({ id: 1, shift_type: 1 }), baseShift({ id: 2, shift_type: 99 as unknown as number })],
      weekStart,
      types,
    );
    expect(result.find((s) => s.id === 1)?.color).toBe("#ff0000");
    expect(result.find((s) => s.id === 2)?.color).toBe("#60a5fa");
  });

  it("computes day index relative to Thursday week-start", () => {
    const result = layoutShiftsForWeek(
      [
        baseShift({ id: 1, date: "2026-05-21" }), // Thu → 0
        baseShift({ id: 2, date: "2026-05-25" }), // Mon → 4
        baseShift({ id: 3, date: "2026-05-27" }), // Wed → 6
      ],
      weekStart,
      types,
    );
    expect(result.find((s) => s.id === 1)?.day).toBe(0);
    expect(result.find((s) => s.id === 2)?.day).toBe(4);
    expect(result.find((s) => s.id === 3)?.day).toBe(6);
  });
});

describe("packOverlappingShifts", () => {
  const shift = (id: number, day: number, startMin: number, endMin: number) => ({
    id,
    day,
    startMinutes: startMin,
    endMinutes: endMin,
  });

  it("assigns colCount = 1 when no overlap", () => {
    const result = packOverlappingShifts([
      shift(1, 0, 540, 720),
      shift(2, 0, 780, 960),
    ]);
    expect(result.every((s) => s.colCount === 1)).toBe(true);
  });

  it("places overlapping shifts in separate columns", () => {
    const result = packOverlappingShifts([
      shift(1, 0, 540, 900),
      shift(2, 0, 600, 960),
    ]);
    const cols = result.map((s) => s.colIndex).sort();
    expect(cols).toEqual([0, 1]);
    expect(result.every((s) => s.colCount === 2)).toBe(true);
  });

  it("reuses a column once the previous shift in it has ended", () => {
    const result = packOverlappingShifts([
      shift(1, 0, 540, 720), // 9-12
      shift(2, 0, 600, 780), // 10-13 (overlaps both)
      shift(3, 0, 780, 900), // 13-15 (only overlaps shift 2 at boundary; can reuse col 0)
    ]);
    const byId = Object.fromEntries(result.map((s) => [s.id, s]));
    expect(byId[1].colIndex).toBe(0);
    expect(byId[2].colIndex).toBe(1);
    // shift 3 starts when shift 1 has ended (col 0 free)
    expect(byId[3].colIndex).toBe(0);
  });

  it("packs each day independently", () => {
    const result = packOverlappingShifts([
      shift(1, 0, 540, 900),
      shift(2, 0, 600, 960), // overlaps with 1 on day 0
      shift(3, 1, 540, 900), // alone on day 1
    ]);
    const byId = Object.fromEntries(result.map((s) => [s.id, s]));
    expect(byId[1].colCount).toBe(2);
    expect(byId[2].colCount).toBe(2);
    expect(byId[3].colCount).toBe(1);
  });
});
