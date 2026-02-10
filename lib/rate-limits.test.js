import { describe, expect, test } from 'bun:test';
import { RATE_LIMIT_CONFIG } from './rate-limits';

describe('RATE_LIMIT_CONFIG', () => {
  test('should have free tier configuration', () => {
    expect(RATE_LIMIT_CONFIG).toHaveProperty('free');
    expect(RATE_LIMIT_CONFIG.free).toHaveProperty('global');
    expect(RATE_LIMIT_CONFIG.free.global).toHaveProperty('capacity');
    expect(RATE_LIMIT_CONFIG.free.global).toHaveProperty('refillRate');
  });

  test('should have pro tier configuration', () => {
    expect(RATE_LIMIT_CONFIG).toHaveProperty('pro');
    expect(RATE_LIMIT_CONFIG.pro).toHaveProperty('global');
  });

  test('should have enterprise tier configuration', () => {
    expect(RATE_LIMIT_CONFIG).toHaveProperty('enterprise');
    expect(RATE_LIMIT_CONFIG.enterprise).toHaveProperty('global');
  });
});
