import { describe, expect, it } from "vitest";
import { getISOWeek, getWeekEnd, getWeekStart } from "../week";

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

describe("getWeekStart", () => {
  it("returns the same Thursday for a Thursday input", () => {
    // 2026-05-21 is a Thursday
    const start = getWeekStart(new Date(2026, 4, 21, 10, 0, 0));
    expect(start.getDay()).toBe(4);
    expect(ymd(start)).toBe("2026-05-21");
  });

  it("rolls back to the preceding Thursday for a Wednesday input", () => {
    // 2026-05-20 is a Wednesday; week start should be 2026-05-14
    const start = getWeekStart(new Date(2026, 4, 20, 10, 0, 0));
    expect(ymd(start)).toBe("2026-05-14");
  });

  it("zeroes the time-of-day", () => {
    const start = getWeekStart(new Date(2026, 4, 21, 23, 59, 59));
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
  });
});

describe("getWeekEnd", () => {
  it("returns the Wednesday following the start at end-of-day", () => {
    const end = getWeekEnd(new Date(2026, 4, 21, 10, 0, 0));
    expect(end.getDay()).toBe(3);
    expect(ymd(end)).toBe("2026-05-27");
    expect(end.getHours()).toBe(23);
  });
});

describe("getISOWeek", () => {
  it("returns ISO week 21 for 2026-05-21", () => {
    expect(getISOWeek(new Date("2026-05-21"))).toBe(21);
  });

  it("returns 1 for early January dates in week 1", () => {
    expect(getISOWeek(new Date("2026-01-05"))).toBe(2);
    expect(getISOWeek(new Date("2025-12-31"))).toBe(1);
  });
});
