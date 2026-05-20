// Weeks are anchored on Thursday (4) — matches the schedule and Cinetixx cadence.
const WEEK_START_DAY = 4;

export const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - ((day + 7 - WEEK_START_DAY) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
};

export const getWeekEnd = (date: Date): Date => {
  const end = getWeekStart(date);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
};

export const getISOWeek = (date: Date): number => {
  const tempDate = new Date(date.getTime());
  tempDate.setHours(0, 0, 0, 0);
  tempDate.setDate(tempDate.getDate() + 3 - ((tempDate.getDay() + 6) % 7));
  const week1 = new Date(tempDate.getFullYear(), 0, 4);
  week1.setDate(week1.getDate() + 3 - ((week1.getDay() + 6) % 7));
  return 1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3) / 7);
};
