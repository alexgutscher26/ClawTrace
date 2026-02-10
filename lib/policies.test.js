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

  test('getPolicy returns custom policy when name matches id', () => {
    const customPolicy = {
      name: 'custom-role',
      label: 'CUSTOM',
      description: 'A custom role',
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      skills: ['custom-skill'],
      tools: ['custom-tool'],
      data_access: 'custom-access',
      heartbeat_interval: 120,
    };

    const policy = getPolicy('custom-role', customPolicy);
    expect(policy).toEqual({
      label: 'CUSTOM',
      description: 'A custom role',
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      skills: ['custom-skill'],
      tools: ['custom-tool'],
      data_access: 'custom-access',
      heartbeat_interval: 120,
      guardrails: {},
    });
  });

  test('getPolicy applies defaults for missing fields in custom policy', () => {
    const customPolicy = {
      name: 'minimal-role',
      label: 'MINIMAL',
      description: 'Minimal role description',
    };

    const policy = getPolicy('minimal-role', customPolicy);

    expect(policy.label).toBe('MINIMAL');
    expect(policy.description).toBe('Minimal role description');

    // Check defaults
    expect(policy.color).toBe('text-blue-400 border-blue-500/30');
    expect(policy.bg).toBe('bg-blue-500/10');
    expect(policy.skills).toEqual([]);
    expect(policy.tools).toEqual([]);
    expect(policy.data_access).toBe('restricted');
    expect(policy.heartbeat_interval).toBe(300);
  });

  test('getPolicy falls back to default profile for unknown id', () => {
    const policy = getPolicy('unknown-id');
    const defaultPolicy = POLICY_PROFILES[DEFAULT_POLICY_PROFILE];

    expect(policy).toBeDefined();
    expect(policy).toEqual(defaultPolicy);
    expect(policy.label).toBe('DEVELOPER'); // confirming it's the dev profile
  });

  test('getPolicy ignores custom policy if name does not match id', () => {
    const customPolicy = {
      name: 'other-role',
      label: 'OTHER',
    };

    // requesting 'dev' but passing a custom policy named 'other-role'
    // should return 'dev' profile
    const policy = getPolicy('dev', customPolicy);
    expect(policy.label).toBe('DEVELOPER');
  });

  test('getPolicy ignores custom policy if it is not an object', () => {
    // requesting 'custom-role' but passing a string as custom policy
    // should fall back to default profile since 'custom-role' is not a built-in
    const policy = getPolicy('custom-role', 'invalid-policy-object');
    const defaultPolicy = POLICY_PROFILES[DEFAULT_POLICY_PROFILE];

    expect(policy).toEqual(defaultPolicy);
  });

  test('getPolicy handles null custom policy gracefully', () => {
    const policy = getPolicy('dev', null);
    expect(policy.label).toBe('DEVELOPER');
  });
});
