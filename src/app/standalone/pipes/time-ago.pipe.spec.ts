import { TimeAgoPipe } from './time-ago.pipe';

describe('TimeAgoPipe', () => {
  // This pipe is a pure, stateless function so no need for BeforeEach
  const pipe = new TimeAgoPipe();

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

  it('should return "years ago" when more than a year ago', () => {
    expect(pipe.transform(new Date().setFullYear(new Date().getFullYear() - 1))).toBe('1 year ago');
    expect(pipe.transform(new Date().setFullYear(new Date().getFullYear() - 3))).toBe('3 years ago');
  });

  it('should return months ago when more than a month (30d) ago', () => {
    expect(pipe.transform(new Date().setDate(new Date().getDate() - 31))).toBe('1 month ago');
    expect(pipe.transform(new Date().setDate(new Date().getDate() - 91))).toBe('3 months ago');
  });

  it('should return weeks ago when more than a week ago', () => {
    expect(pipe.transform(new Date().setDate(new Date().getDate() - 8))).toBe('1 week ago');
    expect(pipe.transform(new Date().setDate(new Date().getDate() - 22))).toBe('3 weeks ago');
  });

  it('should return days ago when more than a day ago', () => {
    expect(pipe.transform(new Date().setDate(new Date().getDate() - 1))).toBe('1 day ago');
    expect(pipe.transform(new Date().setDate(new Date().getDate() - 3))).toBe('3 days ago');
  });

  it('should return hours ago when more than a hour ago', () => {
    expect(pipe.transform(new Date().setHours(new Date().getHours() - 1))).toBe('1 hour ago');
    expect(pipe.transform(new Date().setHours(new Date().getHours() - 3))).toBe('3 hours ago');
  });

  it('should return minutes ago when more than a minute ago', () => {
    expect(pipe.transform(new Date().setMinutes(new Date().getMinutes() - 1))).toBe('1 minute ago');
    expect(pipe.transform(new Date().setMinutes(new Date().getMinutes() - 3))).toBe('3 minutes ago');
  });

  it('should return seconds ago when more than 29 seconds ago', () => {
    expect(pipe.transform(new Date().setSeconds(new Date().getSeconds() - 30))).toBe('30 seconds ago');
  });
});
