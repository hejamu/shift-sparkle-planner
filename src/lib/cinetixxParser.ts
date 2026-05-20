// Lightweight parser for Cinetixx show datetime values.
// Supports .NET /Date(1234567890)/ and ISO/RFC timestamps.
export const parseShowDate = (s: string | null): Date | null => {
  if (!s) return null;
  const t = s.trim();
  // .NET style: /Date(169...) /
  const match = t.match(/\/Date\((\d+)(?:[+-]\d+)?\)\//);
  if (match) return new Date(parseInt(match[1], 10));
  // try ISO / RFC
  const d = new Date(t);
  if (!isNaN(d.getTime())) return d;
  // try replacing space with T (loose ISO)
  const d2 = new Date(t.replace(' ', 'T'));
  if (!isNaN(d2.getTime())) return d2;
  return null;
};

export default parseShowDate;
