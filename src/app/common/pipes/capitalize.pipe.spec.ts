import { CapitalizePipe } from './capitalize.pipe';

describe('CapitalizePipe', () => {
  // This pipe is a pure, stateless function so no need for BeforeEach
  const pipe = new CapitalizePipe();

  it('should return null if input is null', () => {
    expect(pipe.transform(null)).toBe(null);
  });

  it('should return null if input is undefined', () => {
    expect(pipe.transform(undefined)).toBe(null);
  });

  it('should return string if input is empty string', () => {
    expect(pipe.transform('')).toBe('');
  });

  it('should capitalize the first letter of each word', () => {
    expect(pipe.transform('hello world')).toBe('Hello World');
    expect(pipe.transform('This is 1 reason')).toBe('This Is 1 Reason');
  });
});
