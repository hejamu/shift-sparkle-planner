import { describe, it, expect } from 'vitest';
import { parseShowDate } from '../cinetixxParser';

describe('parseShowDate', () => {
  it('parses .NET /Date(...) format', () => {
    const ms = 1694400000000; // corresponds to 2023-09-11T00:00:00.000Z
    const input = `/Date(${ms})/`;
    const d = parseShowDate(input);
    expect(d).not.toBeNull();
    expect(d!.getTime()).toBe(ms);
  });

  it('parses ISO date/time format', () => {
  // test ISO with timezone offset
  const iso = '2025-09-12T15:30:00+02:00';
    const d = parseShowDate(iso);
    expect(d).not.toBeNull();
    expect(d!.toISOString()).toBe(new Date(iso).toISOString());
  });

  it('returns null for invalid input', () => {
    expect(parseShowDate(null)).toBeNull();
    expect(parseShowDate('not a date')).toBeNull();
  });
});
