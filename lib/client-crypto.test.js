import { describe, expect, test } from 'bun:test';
import { encryptE2EE, decryptE2EE, isE2E } from './client-crypto';

describe('client-crypto', () => {
  const PASSPHRASE = 'test-passphrase';

  test('encryptE2EE encrypts string data', async () => {
    const data = 'secret message';
    const encrypted = await encryptE2EE(data, PASSPHRASE);

    expect(encrypted).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.salt).toBeDefined();
    expect(encrypted.content).toBeDefined();
    expect(encrypted.version).toBe('v2-e2ee');
    expect(isE2E(encrypted)).toBeTruthy();

    const decrypted = await decryptE2EE(encrypted, PASSPHRASE);
    expect(decrypted).toBe(data);
  });

  test('encryptE2EE encrypts object data', async () => {
    const data = { foo: 'bar', baz: 123 };
    const encrypted = await encryptE2EE(data, PASSPHRASE);

    expect(isE2E(encrypted)).toBeTruthy();

    const decrypted = await decryptE2EE(encrypted, PASSPHRASE);
    expect(decrypted).toEqual(data);
  });

  test('decryptE2EE throws error with wrong passphrase', async () => {
    const data = 'secret message';
    const encrypted = await encryptE2EE(data, PASSPHRASE);
    const wrongPassphrase = 'wrong-passphrase';

    // Expecting the promise to reject with the specific error message
    // Note: crypto.subtle.decrypt throws a generic operation error if decryption fails,
    // but our wrapper catches it and throws 'Decryption failed. Invalid Master Key?'
    expect(decryptE2EE(encrypted, wrongPassphrase)).rejects.toThrow('Decryption failed. Invalid Master Key?');
  });

  test('encryptE2EE produces different output for same input (random IV/salt)', async () => {
    const data = 'same message';
    const encrypted1 = await encryptE2EE(data, PASSPHRASE);
    const encrypted2 = await encryptE2EE(data, PASSPHRASE);

    expect(encrypted1.iv).not.toBe(encrypted2.iv);
    expect(encrypted1.salt).not.toBe(encrypted2.salt);
    expect(encrypted1.content).not.toBe(encrypted2.content);
  });

  test('isE2E validates E2EE objects correctly', () => {
    expect(isE2E({ version: 'v2-e2ee' })).toBeTruthy();
    expect(isE2E({ version: 'v1' })).toBeFalsy();
    expect(isE2E(null)).toBeFalsy();
    expect(isE2E(undefined)).toBeFalsy();
    expect(isE2E('string')).toBeFalsy();
  });
});
