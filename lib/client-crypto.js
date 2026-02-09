/**
 * client-crypto.js
 * End-to-End Encryption (E2EE) utilities for the browser.
 * Uses the native Web Crypto API (SubtleCrypto).
 */

const ALGORITHM = 'AES-GCM';
const PBKDF2_ITERATIONS = 100000;

/**
 * Derives a cryptographic key from a password.
 * @param {string} password 
 * @param {Uint8Array} salt 
 */
export async function deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256'
        },
        passwordKey,
        { name: ALGORITHM, length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypts data using AES-GCM.
 */
export async function encryptE2EE(data, passphrase) {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveKey(passphrase, salt);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = encoder.encode(typeof data === 'string' ? data : JSON.stringify(data));

    const encrypted = await crypto.subtle.encrypt(
        { name: ALGORITHM, iv },
        key,
        encodedData
    );

    return {
        iv: uint8ArrayToHex(iv),
        salt: uint8ArrayToHex(salt),
        content: uint8ArrayToHex(new Uint8Array(encrypted)),
        version: 'v2-e2ee'
    };
}

/**
 * Decrypts data using AES-GCM.
 */
export async function decryptE2EE(envelope, passphrase) {
    const decoder = new TextDecoder();
    const salt = hexToUint8Array(envelope.salt);
    const iv = hexToUint8Array(envelope.iv);
    const content = hexToUint8Array(envelope.content);

    const key = await deriveKey(passphrase, salt);

    try {
        const decrypted = await crypto.subtle.decrypt(
            { name: ALGORITHM, iv },
            key,
            content
        );
        const text = decoder.decode(decrypted);
        try {
            return JSON.parse(text);
        } catch {
            return text;
        }
    } catch (e) {
        throw new Error('Decryption failed. Invalid Master Key?');
    }
}

/**
 * Validates a value is an E2EE envelope.
 */
export function isE2E(val) {
    return val && typeof val === 'object' && val.version === 'v2-e2ee';
}

// Helpers
function hexToUint8Array(hex) {
    if (!hex) return new Uint8Array(0);
    const view = new Uint8Array(hex.length / 2);
    for (let i = 0; i < view.length; i++) {
        view[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return view;
}

function uint8ArrayToHex(buffer) {
    return Array.from(buffer)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}
