import { DateOrdinalPipe } from './date-ordinal.pipe';

describe('DateOrdinalPipe', () => {
  // This pipe is a pure, stateless function so no need for BeforeEach
  const pipe = new DateOrdinalPipe();

  it('should return null if input is null', () => {
    expect(pipe.transform(null, new Date())).toBe(null);
  });

  it('should return null if input is undefined', () => {
    expect(pipe.transform(undefined, new Date())).toBe(null);
  });

  it('should return null if input is empty string', () => {
    expect(pipe.transform('', new Date())).toBe(null);
  });

  it('should return the date with the correct ordinal', () => {
    expect(pipe.transform('1', new Date('2020-01-01'))).toBe('1st');
    expect(pipe.transform('2', new Date('2020-01-02'))).toBe('2nd');
    expect(pipe.transform('3', new Date('2020-01-03'))).toBe('3rd');
    expect(pipe.transform('4', new Date('2020-01-04'))).toBe('4th');
    expect(pipe.transform('5', new Date('2020-01-05'))).toBe('5th');
    expect(pipe.transform('6', new Date('2020-01-06'))).toBe('6th');
    expect(pipe.transform('7', new Date('2020-01-07'))).toBe('7th');
    expect(pipe.transform('8', new Date('2020-01-08'))).toBe('8th');
    expect(pipe.transform('9', new Date('2020-01-09'))).toBe('9th');
    expect(pipe.transform('10', new Date('2020-01-10'))).toBe('10th');
    expect(pipe.transform('11', new Date('2020-01-11'))).toBe('11th');
    expect(pipe.transform('12', new Date('2020-01-12'))).toBe('12th');
    expect(pipe.transform('13', new Date('2020-01-13'))).toBe('13th');
    expect(pipe.transform('14', new Date('2020-01-14'))).toBe('14th');
    expect(pipe.transform('15', new Date('2020-01-15'))).toBe('15th');
    expect(pipe.transform('16', new Date('2020-01-16'))).toBe('16th');
    expect(pipe.transform('17', new Date('2020-01-17'))).toBe('17th');
    expect(pipe.transform('18', new Date('2020-01-18'))).toBe('18th');
    expect(pipe.transform('19', new Date('2020-01-19'))).toBe('19th');
    expect(pipe.transform('20', new Date('2020-01-20'))).toBe('20th');
    expect(pipe.transform('21', new Date('2020-01-21'))).toBe('21st');
    expect(pipe.transform('22', new Date('2020-01-22'))).toBe('22nd');
    expect(pipe.transform('23', new Date('2020-01-23'))).toBe('23rd');
    expect(pipe.transform('24', new Date('2020-01-24'))).toBe('24th');
    expect(pipe.transform('25', new Date('2020-01-25'))).toBe('25th');
    expect(pipe.transform('26', new Date('2020-01-26'))).toBe('26th');
    expect(pipe.transform('27', new Date('2020-01-27'))).toBe('27th');
    expect(pipe.transform('28', new Date('2020-01-28'))).toBe('28th');
    expect(pipe.transform('29', new Date('2020-01-29'))).toBe('29th');
    expect(pipe.transform('30', new Date('2020-01-30'))).toBe('30th');
    expect(pipe.transform('31', new Date('2020-01-31'))).toBe('31st');
  });
});
