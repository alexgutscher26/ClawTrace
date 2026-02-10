import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { encrypt, decrypt, decryptAsync, verifyKey, isEncrypted } from './encryption';

const TEST_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'; // 64 chars

describe('lib/encryption', () => {
  let originalKey;

  beforeAll(() => {
    originalKey = process.env.INTERNAL_ENCRYPTION_KEY;
    process.env.INTERNAL_ENCRYPTION_KEY = TEST_KEY;
  });

  afterAll(() => {
    if (originalKey === undefined) {
      delete process.env.INTERNAL_ENCRYPTION_KEY;
    } else {
      process.env.INTERNAL_ENCRYPTION_KEY = originalKey;
    }
  });

  describe('encrypt', () => {
    test('should return an object with iv, authTag, and content', () => {
      const result = encrypt('test');
      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('authTag');
      expect(result).toHaveProperty('content');
    });

    test('should have correct lengths for iv and authTag', () => {
      const result = encrypt('test');
      expect(result.iv).toHaveLength(24); // 12 bytes * 2 hex chars
      expect(result.authTag).toHaveLength(32); // 16 bytes * 2 hex chars
    });

    test('should encrypt objects by stringifying them', () => {
      const obj = { key: 'value' };
      const result = encrypt(obj);
      expect(result).toHaveProperty('content');
      // Ensure content is encrypted (not containing the original key)
      expect(result.content).not.toContain('key');
    });

    test('should throw if key is missing', () => {
      const currentKey = process.env.INTERNAL_ENCRYPTION_KEY;
      delete process.env.INTERNAL_ENCRYPTION_KEY;
      expect(() => encrypt('test')).toThrow('Encryption KEY missing');
      process.env.INTERNAL_ENCRYPTION_KEY = currentKey;
    });
  });

  describe('decrypt', () => {
    test('should decrypt a string correctly', () => {
      const original = 'hello world';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    test('should decrypt an object correctly (as stringified JSON)', () => {
      const original = { foo: 'bar' };
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(JSON.stringify(original));
    });

    test('should handle string input (stringified envelope)', () => {
      const original = 'hello world';
      const encrypted = encrypt(original);
      const encryptedString = JSON.stringify(encrypted);
      const decrypted = decrypt(encryptedString);
      expect(decrypted).toBe(original);
    });

    test('should return null for null input', () => {
      expect(decrypt(null)).toBeNull();
    });

    test('should return plaintext if input is not a valid envelope', () => {
      const plain = 'not encrypted';
      expect(decrypt(plain)).toBe(plain);
    });

    test('should throw/fail if authTag is invalid (tampering)', () => {
      const original = 'secret';
      const encrypted = encrypt(original);
      // Tamper with the content
      const tampered = {
        ...encrypted,
        content: encrypted.content.substring(0, encrypted.content.length - 2) + '00',
      };
      expect(() => decrypt(tampered)).toThrow();
    });

    test('should throw if key is missing', () => {
      const currentKey = process.env.INTERNAL_ENCRYPTION_KEY;
      delete process.env.INTERNAL_ENCRYPTION_KEY;
      expect(() => decrypt({ iv: 'a', authTag: 'b', content: 'c' })).toThrow(
        'Encryption KEY missing'
      );
      process.env.INTERNAL_ENCRYPTION_KEY = currentKey;
    });
  });

  describe('decryptAsync', () => {
    test('should decrypt a string correctly', async () => {
      const original = 'hello world';
      const encrypted = encrypt(original);
      const decrypted = await decryptAsync(encrypted);
      expect(decrypted).toBe(original);
    });

    test('should decrypt an object correctly (as stringified JSON)', async () => {
      const original = { foo: 'bar' };
      const encrypted = encrypt(original);
      const decrypted = await decryptAsync(encrypted);
      expect(decrypted).toBe(JSON.stringify(original));
    });

    test('should handle string input (stringified envelope)', async () => {
      const original = 'hello world';
      const encrypted = encrypt(original);
      const encryptedString = JSON.stringify(encrypted);
      const decrypted = await decryptAsync(encryptedString);
      expect(decrypted).toBe(original);
    });

    test('should return null for null input', async () => {
      expect(await decryptAsync(null)).toBeNull();
    });

    test('should return plaintext if input is not a valid envelope', async () => {
      const plain = 'not encrypted';
      expect(await decryptAsync(plain)).toBe(plain);
    });

    test('should throw/fail if authTag is invalid (tampering)', async () => {
      const original = 'secret';
      const encrypted = encrypt(original);
      // Tamper with the content
      const tampered = {
        ...encrypted,
        content: encrypted.content.substring(0, encrypted.content.length - 2) + '00',
      };
      try {
        await decryptAsync(tampered);
        // Should not reach here
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    test('should throw if key is missing', async () => {
      const currentKey = process.env.INTERNAL_ENCRYPTION_KEY;
      delete process.env.INTERNAL_ENCRYPTION_KEY;
      try {
        await decryptAsync({ iv: 'a', authTag: 'b', content: 'c' });
        // Should not reach here
        expect(true).toBe(false);
      } catch (e) {
        expect(e.message).toBe('Encryption KEY missing');
      } finally {
        process.env.INTERNAL_ENCRYPTION_KEY = currentKey;
      }
    });
  });

  describe('verifyKey', () => {
    test('should return true for valid key', () => {
      expect(verifyKey()).toBe(true);
    });

    test('should return false for invalid key length', () => {
      const currentKey = process.env.INTERNAL_ENCRYPTION_KEY;
      process.env.INTERNAL_ENCRYPTION_KEY = 'short';
      // Suppress console.warn for this test
      const originalWarn = console.warn;
      console.warn = () => {};

      expect(verifyKey()).toBe(false);

      console.warn = originalWarn;
      process.env.INTERNAL_ENCRYPTION_KEY = currentKey;
    });

    test('should return false for missing key', () => {
      const currentKey = process.env.INTERNAL_ENCRYPTION_KEY;
      delete process.env.INTERNAL_ENCRYPTION_KEY;
      // Suppress console.warn for this test
      const originalWarn = console.warn;
      console.warn = () => {};

      expect(verifyKey()).toBe(false);

      console.warn = originalWarn;
      process.env.INTERNAL_ENCRYPTION_KEY = currentKey;
    });
  });

  describe('isEncrypted', () => {
    test('should return true for valid encrypted object', () => {
      const encrypted = encrypt('test');
      expect(isEncrypted(encrypted)).toBe(true);
    });

    test('should return true for valid encrypted string (JSON)', () => {
      const encrypted = encrypt('test');
      expect(isEncrypted(JSON.stringify(encrypted))).toBe(true);
    });

    test('should return false for plain object', () => {
      expect(isEncrypted({ foo: 'bar' })).toBe(false);
    });

    test('should return false for plain string', () => {
      expect(isEncrypted('hello')).toBe(false);
    });

    test('should return false for null/undefined', () => {
      expect(isEncrypted(null)).toBe(false);
      expect(isEncrypted(undefined)).toBe(false);
    });
  });
});
