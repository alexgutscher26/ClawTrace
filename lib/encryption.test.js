import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { verifyKey, encrypt, decrypt } from './encryption';

describe('lib/encryption', () => {
  const originalEnv = process.env;
  let consoleWarnMock;
  let consoleLogMock;
  let consoleErrorMock;

  beforeEach(() => {
    process.env = { ...originalEnv };
    consoleWarnMock = spyOn(console, 'warn').mockImplementation(() => {});
    consoleLogMock = spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorMock = spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleWarnMock.mockRestore();
    consoleLogMock.mockRestore();
    consoleErrorMock.mockRestore();
  });

  describe('verifyKey', () => {
    it('should return false and warn if INTERNAL_ENCRYPTION_KEY is missing', () => {
      delete process.env.INTERNAL_ENCRYPTION_KEY;
      expect(verifyKey()).toBe(false);
      expect(consoleWarnMock).toHaveBeenCalledWith(expect.stringContaining('missing'));
    });

    it('should return false and warn if INTERNAL_ENCRYPTION_KEY length is not 64', () => {
      process.env.INTERNAL_ENCRYPTION_KEY = 'too_short';
      expect(verifyKey()).toBe(false);
      expect(consoleWarnMock).toHaveBeenCalledWith(
        expect.stringContaining('64-character hex string')
      );

      process.env.INTERNAL_ENCRYPTION_KEY = 'a'.repeat(65);
      expect(verifyKey()).toBe(false);
      expect(consoleWarnMock).toHaveBeenCalledTimes(2);
    });

    it('should return true and log success if key is valid and encryption works', () => {
      // 32 bytes hex string = 64 chars
      process.env.INTERNAL_ENCRYPTION_KEY = 'a'.repeat(64);
      expect(verifyKey()).toBe(true);
      expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('verified'));
    });

    it('should return false and log error if encryption verification fails (invalid hex)', () => {
      // Valid length but invalid hex content (Z is not hex)
      process.env.INTERNAL_ENCRYPTION_KEY = 'Z'.repeat(64);
      expect(verifyKey()).toBe(false);
      expect(consoleErrorMock).toHaveBeenCalledWith(
        expect.stringContaining('verification failed'),
        expect.any(String)
      );
    });
  });

  describe('encrypt', () => {
    it('should encrypt data correctly', () => {
      process.env.INTERNAL_ENCRYPTION_KEY = 'a'.repeat(64);
      const data = 'test-data';
      const result = encrypt(data);
      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('authTag');
      expect(result).toHaveProperty('content');
    });

    it('should throw error if key is missing', () => {
      delete process.env.INTERNAL_ENCRYPTION_KEY;
      expect(() => encrypt('test')).toThrow('Encryption KEY missing');
    });
  });

  describe('decrypt', () => {
    it('should decrypt encrypted data correctly', () => {
      process.env.INTERNAL_ENCRYPTION_KEY = 'a'.repeat(64);
      const original = 'test-secret';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it('should handle object encryption/decryption', () => {
      process.env.INTERNAL_ENCRYPTION_KEY = 'a'.repeat(64);
      const original = { foo: 'bar' };
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(JSON.parse(decrypted)).toEqual(original);
    });

    it('should return null if envelope is null/undefined', () => {
      process.env.INTERNAL_ENCRYPTION_KEY = 'a'.repeat(64);
      expect(decrypt(null)).toBe(null);
      expect(decrypt(undefined)).toBe(null);
    });
  });
});
