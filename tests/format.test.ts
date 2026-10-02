import {
  formatCompactDuration,
  formatDistanceKm,
  formatDuration,
  formatElevationM,
} from '@/lib/format';

describe('formatDistanceKm', () => {
  it('writes one decimal and a space before km', () => {
    expect(formatDistanceKm(9.6)).toBe('9.6 km');
    expect(formatDistanceKm(9.99)).toBe('10.0 km');
    expect(formatDistanceKm(10)).toBe('10.0 km');
    expect(formatDistanceKm(14.14)).toBe('14.1 km');
  });
});

describe('formatElevationM', () => {
  it('groups thousands without using locale', () => {
    expect(formatElevationM(0)).toBe('0 m');
    expect(formatElevationM(310)).toBe('310 m');
    expect(formatElevationM(2073)).toBe('2,073 m');
    expect(formatElevationM(1000000)).toBe('1,000,000 m');
    expect(formatElevationM(-1200.4)).toBe('-1,200 m');
  });
});

describe('formatDuration', () => {
  it('uses hours once the clock passes an hour', () => {
    expect(formatDuration(0)).toBe('0m 00s');
    expect(formatDuration(90)).toBe('1m 30s');
    expect(formatDuration(3600)).toBe('1h 00m');
    expect(formatDuration(3661)).toBe('1h 01m');
  });
});

describe('formatCompactDuration', () => {
  it('renders a dash for a missing time and a compact clock otherwise', () => {
    expect(formatCompactDuration(null)).toBe('—');
    expect(formatCompactDuration(-5)).toBe('0m');
    expect(formatCompactDuration(59)).toBe('0m');
    expect(formatCompactDuration(90)).toBe('1m');
    expect(formatCompactDuration(3600)).toBe('1:00');
    expect(formatCompactDuration(3670)).toBe('1:01');
    expect(formatCompactDuration(8 * 3600 + 9 * 60)).toBe('8:09');
  });
});
