import { expect, test, describe } from 'bun:test';
import { RATE_LIMIT_CONFIG } from './rate-limits';

describe('RATE_LIMIT_CONFIG', () => {
  test('should have free, pro, and enterprise tiers', () => {
    expect(RATE_LIMIT_CONFIG).toHaveProperty('free');
    expect(RATE_LIMIT_CONFIG).toHaveProperty('pro');
    expect(RATE_LIMIT_CONFIG).toHaveProperty('enterprise');
  });

  test('free tier should have correct limits', () => {
    expect(RATE_LIMIT_CONFIG.free.global).toEqual({ capacity: 60, refillRate: 1 });
    expect(RATE_LIMIT_CONFIG.free.handshake).toEqual({ capacity: 5, refillRate: 5 / 600 });
    expect(RATE_LIMIT_CONFIG.free.heartbeat).toEqual({ capacity: 3, refillRate: 1 / 300 });
  });

  test('pro tier should have correct limits', () => {
    expect(RATE_LIMIT_CONFIG.pro.global).toEqual({ capacity: 600, refillRate: 10 });
    expect(RATE_LIMIT_CONFIG.pro.handshake).toEqual({ capacity: 50, refillRate: 50 / 600 });
    expect(RATE_LIMIT_CONFIG.pro.heartbeat).toEqual({ capacity: 20, refillRate: 1 / 15 });
  });

  test('enterprise tier should have correct limits', () => {
    expect(RATE_LIMIT_CONFIG.enterprise.global).toEqual({ capacity: 5000, refillRate: 100 });
    expect(RATE_LIMIT_CONFIG.enterprise.handshake).toEqual({ capacity: 500, refillRate: 1 });
    expect(RATE_LIMIT_CONFIG.enterprise.heartbeat).toEqual({ capacity: 200, refillRate: 2 });
  });
});
