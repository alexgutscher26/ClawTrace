import { describe, expect, test } from 'bun:test';
import {
  getPolicy,
  POLICY_PROFILES,
  POLICY_DEV,
  POLICY_OPS,
  POLICY_EXEC,
  DEFAULT_POLICY_PROFILE,
} from './policies';

describe('policies', () => {
  test('constants are correct', () => {
    expect(POLICY_DEV).toBe('dev');
    expect(POLICY_OPS).toBe('ops');
    expect(POLICY_EXEC).toBe('exec');
    expect(DEFAULT_POLICY_PROFILE).toBe('dev');
  });

  test("getPolicy('dev') returns dev profile", () => {
    const policy = getPolicy('dev');
    expect(policy).toBeDefined();
    expect(policy.label).toBe('DEVELOPER');
  });

  test('getPolicy(POLICY_DEV) returns dev profile', () => {
    const policy = getPolicy(POLICY_DEV);
    expect(policy).toBeDefined();
    expect(policy.label).toBe('DEVELOPER');
  });

  test('POLICY_PROFILES has dev, ops, exec', () => {
    expect(POLICY_PROFILES[POLICY_DEV]).toBeDefined();
    expect(POLICY_PROFILES[POLICY_OPS]).toBeDefined();
    expect(POLICY_PROFILES[POLICY_EXEC]).toBeDefined();

    // Legacy access checks
    expect(POLICY_PROFILES.dev).toBeDefined();
    expect(POLICY_PROFILES.ops).toBeDefined();
    expect(POLICY_PROFILES.exec).toBeDefined();
  });
});
