import { expect, test, describe, beforeAll, afterAll, setSystemTime } from 'bun:test';
import { timeAgo } from './view-utils';

describe('timeAgo', () => {
  // Set a fixed date: 2024-01-01T12:00:00Z
  const fixedDate = new Date('2024-01-01T12:00:00Z');

  beforeAll(() => {
    setSystemTime(fixedDate);
  });

  afterAll(() => {
    setSystemTime(); // Restore system time
  });

  test('returns "Never" for null, undefined, or empty string', () => {
    expect(timeAgo(null)).toBe('Never');
    expect(timeAgo(undefined)).toBe('Never');
    expect(timeAgo('')).toBe('Never');
  });

  test('returns seconds ago for diff < 60s', () => {
    // 0s ago
    expect(timeAgo(fixedDate.toISOString())).toBe('0s ago');
    // 30s ago
    const thirtySecondsAgo = new Date(fixedDate.getTime() - 30 * 1000);
    expect(timeAgo(thirtySecondsAgo.toISOString())).toBe('30s ago');
    // 59s ago
    const fiftyNineSecondsAgo = new Date(fixedDate.getTime() - 59 * 1000);
    expect(timeAgo(fiftyNineSecondsAgo.toISOString())).toBe('59s ago');
  });

  test('returns minutes ago for 60s <= diff < 3600s', () => {
    // 60s ago -> 1m ago
    const oneMinuteAgo = new Date(fixedDate.getTime() - 60 * 1000);
    expect(timeAgo(oneMinuteAgo.toISOString())).toBe('1m ago');
    // 59m 59s ago -> 59m ago
    const almostOneHourAgo = new Date(fixedDate.getTime() - (59 * 60 + 59) * 1000);
    expect(timeAgo(almostOneHourAgo.toISOString())).toBe('59m ago');
  });

  test('returns hours ago for 3600s <= diff < 86400s', () => {
    // 1h ago -> 1h ago
    const oneHourAgo = new Date(fixedDate.getTime() - 3600 * 1000);
    expect(timeAgo(oneHourAgo.toISOString())).toBe('1h ago');
    // 23h 59m 59s ago -> 23h ago
    const almostOneDayAgo = new Date(fixedDate.getTime() - (23 * 3600 + 59 * 60 + 59) * 1000);
    expect(timeAgo(almostOneDayAgo.toISOString())).toBe('23h ago');
  });

  test('returns days ago for diff >= 86400s', () => {
    // 1d ago -> 1d ago
    const oneDayAgo = new Date(fixedDate.getTime() - 86400 * 1000);
    expect(timeAgo(oneDayAgo.toISOString())).toBe('1d ago');
    // 2d ago
    const twoDaysAgo = new Date(fixedDate.getTime() - 2 * 86400 * 1000);
    expect(timeAgo(twoDaysAgo.toISOString())).toBe('2d ago');
    // 30d ago
    const thirtyDaysAgo = new Date(fixedDate.getTime() - 30 * 86400 * 1000);
    expect(timeAgo(thirtyDaysAgo.toISOString())).toBe('30d ago');
  });

  test('handles future dates by returning negative seconds', () => {
    const futureDate = new Date(fixedDate.getTime() + 10 * 1000);
    expect(timeAgo(futureDate.toISOString())).toBe('-10s ago');
  });
});
