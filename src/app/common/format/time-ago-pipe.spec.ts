import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TimeAgoPipe } from './time-ago-pipe';

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

describe('TimeAgoPipe', () => {
  // This pipe is a pure, stateless function, so one instance serves every test
  const pipe = new TimeAgoPipe();
  const ago = (ms: number): number => Date.now() - ms;

  // The pipe counts elapsed time, so the spec subtracts milliseconds, not calendar days. The clock is fixed on the day
  // after Europe's spring clock change, where 3 calendar days back in Amsterdam are 71 hours ("2 days ago"), so going
  // back to calendar days fails here instead of only in the last days of March.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-30T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return null if input is null', () => {
    expect(pipe.transform(null)).toBe(null);
  });

  it('should return null if input is undefined', () => {
    expect(pipe.transform(undefined)).toBe(null);
  });

  it('should return null if input is empty string', () => {
    expect(pipe.transform('')).toBe(null);
  });

  it('should return "just now" when less than 29 seconds ago', () => {
    expect(pipe.transform(new Date())).toBe('just now');
  });

  it('should return "years ago" when more than a year (365d) ago', () => {
    expect(pipe.transform(ago(365 * DAY_MS))).toBe('1 year ago');
    expect(pipe.transform(ago(3 * 365 * DAY_MS))).toBe('3 years ago');
  });

  it('should return months ago when more than a month (30d) ago', () => {
    expect(pipe.transform(ago(31 * DAY_MS))).toBe('1 month ago');
    expect(pipe.transform(ago(91 * DAY_MS))).toBe('3 months ago');
  });

  it('should return weeks ago when more than a week ago', () => {
    expect(pipe.transform(ago(8 * DAY_MS))).toBe('1 week ago');
    expect(pipe.transform(ago(22 * DAY_MS))).toBe('3 weeks ago');
  });

  it('should return days ago when more than a day ago', () => {
    expect(pipe.transform(ago(DAY_MS))).toBe('1 day ago');
    expect(pipe.transform(ago(3 * DAY_MS))).toBe('3 days ago');
  });

  it('should return hours ago when more than a hour ago', () => {
    expect(pipe.transform(ago(HOUR_MS))).toBe('1 hour ago');
    expect(pipe.transform(ago(3 * HOUR_MS))).toBe('3 hours ago');
  });

  it('should return minutes ago when more than a minute ago', () => {
    expect(pipe.transform(ago(MINUTE_MS))).toBe('1 minute ago');
    expect(pipe.transform(ago(3 * MINUTE_MS))).toBe('3 minutes ago');
  });

  it('should return seconds ago when more than 29 seconds ago', () => {
    expect(pipe.transform(ago(30 * SECOND_MS))).toBe('30 seconds ago');
  });
});
