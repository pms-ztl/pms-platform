import {
  MS_PER_SECOND,
  MS_PER_MINUTE,
  MS_PER_HOUR,
  MS_PER_DAY,
  DAYS,
  daysAgo,
  daysBetween,
} from '../constants';

describe('constants', () => {
  describe('time duration constants', () => {
    it('MS_PER_SECOND equals 1000', () => {
      expect(MS_PER_SECOND).toBe(1000);
    });

    it('MS_PER_MINUTE equals 60000', () => {
      expect(MS_PER_MINUTE).toBe(60_000);
    });

    it('MS_PER_HOUR equals 3600000', () => {
      expect(MS_PER_HOUR).toBe(3_600_000);
    });

    it('MS_PER_DAY equals 86400000', () => {
      expect(MS_PER_DAY).toBe(86_400_000);
    });
  });

  describe('DAYS()', () => {
    it('DAYS(1) equals MS_PER_DAY', () => {
      expect(DAYS(1)).toBe(MS_PER_DAY);
    });

    it('DAYS(7) equals 7 * MS_PER_DAY', () => {
      expect(DAYS(7)).toBe(7 * MS_PER_DAY);
    });

    it('DAYS(30) equals 30 * MS_PER_DAY', () => {
      expect(DAYS(30)).toBe(30 * MS_PER_DAY);
    });

    it('DAYS(0) equals 0', () => {
      expect(DAYS(0)).toBe(0);
    });
  });

  describe('daysAgo()', () => {
    it('daysAgo(0) returns today (within 1 second tolerance)', () => {
      const now = Date.now();
      const result = daysAgo(0);
      expect(Math.abs(result.getTime() - now)).toBeLessThan(1000);
    });

    it('daysAgo(1) returns yesterday (within 1 second tolerance)', () => {
      const expected = Date.now() - MS_PER_DAY;
      const result = daysAgo(1);
      expect(Math.abs(result.getTime() - expected)).toBeLessThan(1000);
    });

    it('daysAgo(7) returns one week ago (within 1 second tolerance)', () => {
      const expected = Date.now() - 7 * MS_PER_DAY;
      const result = daysAgo(7);
      expect(Math.abs(result.getTime() - expected)).toBeLessThan(1000);
    });
  });

  describe('daysBetween()', () => {
    it('returns correct number of days between two dates', () => {
      const a = new Date('2025-01-01T00:00:00Z');
      const b = new Date('2025-01-11T00:00:00Z');
      expect(daysBetween(a, b)).toBe(10);
    });

    it('returns 0 for the same date', () => {
      const date = new Date('2025-06-15T12:00:00Z');
      expect(daysBetween(date, date)).toBe(0);
    });

    it('returns a negative number when b is before a', () => {
      const a = new Date('2025-01-11T00:00:00Z');
      const b = new Date('2025-01-01T00:00:00Z');
      expect(daysBetween(a, b)).toBe(-10);
    });

    it('handles fractional days', () => {
      const a = new Date('2025-01-01T00:00:00Z');
      const b = new Date('2025-01-01T12:00:00Z');
      expect(daysBetween(a, b)).toBe(0.5);
    });
  });
});
