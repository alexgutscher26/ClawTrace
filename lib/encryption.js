const crypto = require('crypto');

/**
 * lib/encryption.js
 *
 * Provides AES-256-GCM encryption for sensitive database fields.
 * Required Env: INTERNAL_ENCRYPTION_KEY (32-byte hex string)
 */

const ALGORITHM = 'aes-256-gcm';
const get_key = () => process.env.INTERNAL_ENCRYPTION_KEY;

/**
 * Verifies the encryption key is valid on startup.
 */
function verifyKey() {
  const KEY = get_key();
  if (!KEY) {
    console.warn('⚠️ INTERNAL_ENCRYPTION_KEY is missing! Encryption will fail.');
    return false;
  }
  if (KEY.length !== 64) {
    console.warn('⚠️ INTERNAL_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).');
    return false;
  }
  try {
    const testText = 'ClawTrace Encryption Test';
    const encrypted = encrypt(testText);
    const decrypted = decrypt(encrypted);
    if (testText === decrypted) {
      console.log('✅ Encryption system initialized and verified.');
      return true;
    }
  } catch (e) {
    console.error('❌ Encryption verification failed:', e.message);
  }
  return false;
}

/**
 * Encrypts a string or object.
 * @param {string|object} data
 * @returns {object} { iv, authTag, content }
 */
function encrypt(data) {
  const KEY = get_key();
  if (!KEY) throw new Error('Encryption KEY missing');

  const text = typeof data === 'object' ? JSON.stringify(data) : String(data);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(KEY, 'hex'), iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return {
    iv: iv.toString('hex'),
    authTag: authTag,
    content: encrypted,
  };
}

/**
 * Decrypts an encrypted envelope.
 * @param {object|string} envelope JSON string or object { iv, authTag, content }
 * @returns {string} Decrypted plaintext
 */
function decrypt(envelope) {
  const KEY = get_key();
  if (!KEY) throw new Error('Encryption KEY missing');
  if (!envelope) return null;

  try {
    const data = typeof envelope === 'string' ? JSON.parse(envelope) : envelope;
    if (!data.iv || !data.authTag || !data.content) return String(envelope); // Fallback for plaintext

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(KEY, 'hex'),
      Buffer.from(data.iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));

    let decrypted = decipher.update(data.content, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (e) {
    console.error('Decryption failed:', e.message);
    // If it's not valid JSON or doesn't match schema, return as-is (might be legacy plaintext)
    if (typeof envelope === 'string' && !envelope.startsWith('{')) return envelope;
    throw e;
  }
}

/**
 * Utility to check if a value is likely encrypted.
 */
function isEncrypted(val) {
  if (!val) return false;
  try {
    const data = typeof val === 'string' ? JSON.parse(val) : val;
    return !!(data.iv && data.authTag && data.content);
  } catch (e) {
    return false;
  }
}

/**
 * Decrypts an encrypted envelope using the Web Crypto API asynchronously.
 *
 * The function retrieves the encryption key, validates the envelope, and performs decryption using the AES-GCM algorithm.
 * It handles both string and object formats for the envelope and manages errors during the decryption process,
 * ensuring that the event loop remains unblocked by offloading the decryption to a worker thread pool.
 *
 * @param {object|string} envelope - JSON string or object containing { iv, authTag, content } for decryption.
 * @returns {Promise<string|null>} The decrypted plaintext or null if the envelope is missing.
 * @throws Error If the encryption key is missing or if decryption fails.
 */
async function decryptAsync(envelope) {
  const KEY = get_key();
  if (!KEY) throw new Error('Encryption KEY missing');
  if (!envelope) return null;

  try {
    const data = typeof envelope === 'string' ? JSON.parse(envelope) : envelope;
    if (!data.iv || !data.authTag || !data.content) return String(envelope);

    // Web Crypto uses raw key import
    const key = await crypto.webcrypto.subtle.importKey(
      'raw',
      Buffer.from(KEY, 'hex'),
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const iv = Buffer.from(data.iv, 'hex');
    const content = Buffer.from(data.content, 'hex');
    const authTag = Buffer.from(data.authTag, 'hex');

    // Web Crypto expects authTag appended to ciphertext
    const combined = Buffer.concat([content, authTag]);

    const decryptedBuffer = await crypto.webcrypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128,
      },
      key,
      combined
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (e) {
    console.error('Async decryption failed:', e.message);
    if (typeof envelope === 'string' && !envelope.startsWith('{')) return envelope;
    throw e;
  }
}

module.exports = {
  encrypt,
  decrypt,
  decryptAsync,
  verifyKey,
  isEncrypted,
};
