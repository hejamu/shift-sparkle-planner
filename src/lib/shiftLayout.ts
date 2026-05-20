import type { Shift } from "@/lib/shiftApi";
import { getWeekEnd } from "@/lib/week";

export type ShiftType = { id: number; name: string; color: string };

export type LaidOutShift = Shift & {
  day: number;
  time: string;
  duration: number;
  color: string;
  startMinutes: number;
  endMinutes: number;
  colIndex: number;
  colCount: number;
};

const DEFAULT_COLOR = "#60a5fa";
const FALLBACK_DURATION_HOURS = 8;
// Calendar weeks start on Thursday (day 4 in JS Date.getDay()).
const WEEK_START_DAY = 4;

function parseHourMinute(value: string | null | undefined): number {
  if (!value) return 0;
  const [hStr, mStr] = value.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function findColor(shiftTypes: ShiftType[], typeId: Shift["shift_type"]): string {
  return shiftTypes.find((t) => String(t.id) === String(typeId))?.color ?? DEFAULT_COLOR;
}

export function isInWeek(date: Date, weekStart: Date): boolean {
  return date >= weekStart && date <= getWeekEnd(weekStart);
}

export function mapShiftsForWeek(
  shifts: Shift[],
  weekStart: Date,
  shiftTypes: ShiftType[],
): Omit<LaidOutShift, "colIndex" | "colCount">[] {
  return shifts
    .filter((shift) => isInWeek(new Date(shift.date), weekStart))
    .map((shift) => {
      const shiftDate = new Date(shift.date);
      const day = (shiftDate.getDay() + 7 - WEEK_START_DAY) % 7;
      const startMinutes = parseHourMinute(shift.start_time);
      const endMinutes = parseHourMinute(shift.end_time);
      const diffHours = (endMinutes - startMinutes) / 60;
      return {
        ...shift,
        day,
        time: shift.start_time,
        end_time: shift.end_time,
        duration: diffHours > 0 ? diffHours : FALLBACK_DURATION_HOURS,
        color: findColor(shiftTypes, shift.shift_type),
        startMinutes,
        endMinutes,
      };
    });
}

// Greedy column packing: shifts in the same overlap cluster get assigned to
// the lowest-indexed column whose previous shift has already ended.
export function packOverlappingShifts<T extends { day: number; startMinutes: number; endMinutes: number }>(
  shifts: T[],
): (T & { colIndex: number; colCount: number })[] {
  const byDay: Record<number, T[]> = {};
  for (const s of shifts) (byDay[s.day] ||= []).push(s);

  const result: (T & { colIndex: number; colCount: number })[] = [];

  for (const list of Object.values(byDay)) {
    const sorted = list.slice().sort((a, b) => a.startMinutes - b.startMinutes);

    const clusters: T[][] = [];
    let current: T[] = [];
    let currentMax = -1;
    for (const s of sorted) {
      if (current.length === 0) {
        current.push(s);
        currentMax = s.endMinutes;
      } else if (s.startMinutes < currentMax) {
        current.push(s);
        currentMax = Math.max(currentMax, s.endMinutes);
      } else {
        clusters.push(current);
        current = [s];
        currentMax = s.endMinutes;
      }
    }
    if (current.length) clusters.push(current);

    for (const cluster of clusters) {
      const colsEnd: number[] = [];
      const assignments: { shift: T; col: number }[] = [];
      for (const s of cluster) {
        let placed = false;
        for (let ci = 0; ci < colsEnd.length; ci++) {
          if (s.startMinutes >= colsEnd[ci]) {
            assignments.push({ shift: s, col: ci });
            colsEnd[ci] = s.endMinutes;
            placed = true;
            break;
          }
        }
        if (!placed) {
          assignments.push({ shift: s, col: colsEnd.length });
          colsEnd.push(s.endMinutes);
        }
      }
      const colCount = Math.max(1, colsEnd.length);
      for (const a of assignments) result.push({ ...a.shift, colIndex: a.col, colCount });
    }
  }

  return result;
}

export function layoutShiftsForWeek(
  shifts: Shift[],
  weekStart: Date,
  shiftTypes: ShiftType[],
): LaidOutShift[] {
  return packOverlappingShifts(mapShiftsForWeek(shifts, weekStart, shiftTypes));
}
