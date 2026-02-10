
import { describe, expect, test, mock, beforeAll, afterAll } from 'bun:test';

// Mock NextResponse
class MockNextResponse {
  constructor(body, init) {
    this.body = body;
    this.status = init?.status || 200;
    this.statusText = init?.statusText || '';
    this.headers = new Headers(init?.headers);
  }

  static json(body, init) {
    return new MockNextResponse(JSON.stringify(body), {
        ...init,
        headers: { ...(init?.headers || {}), 'Content-Type': 'application/json' }
    });
  }
}

mock.module('next/server', () => {
    return {
        NextResponse: MockNextResponse
    };
});

// Dynamic import after mocking
const { OPTIONS } = await import('../app/api/ph/[...slug]/route.js');

const originalEnv = process.env;

describe('API PH CORS', () => {

    beforeAll(() => {
        // Mock process.env
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    test('OPTIONS request returns * when CORS_ORIGINS is * (default)', async () => {
        process.env.CORS_ORIGINS = '*';

        const request = new Request('http://localhost:3000/api/ph/test');
        const response = await OPTIONS(request);
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
        expect(response.headers.get('Vary')).toBe('Origin');
    });

    test('OPTIONS request returns specific origin when CORS_ORIGINS matches', async () => {
        process.env.CORS_ORIGINS = 'https://example.com';
        const request = new Request('http://localhost:3000/api/ph/test', {
            headers: { Origin: 'https://example.com' }
        });
        const response = await OPTIONS(request);
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
        expect(response.headers.get('Vary')).toBe('Origin');
    });

    test('OPTIONS request returns no Access-Control-Allow-Origin when CORS_ORIGINS does not match', async () => {
        process.env.CORS_ORIGINS = 'https://example.com';
        const request = new Request('http://localhost:3000/api/ph/test', {
            headers: { Origin: 'https://evil.com' }
        });
        const response = await OPTIONS(request);
        expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    test('OPTIONS request handles multiple allowed origins', async () => {
        process.env.CORS_ORIGINS = 'https://example.com, https://app.example.com';

        // Test first origin
        let request = new Request('http://localhost:3000/api/ph/test', {
            headers: { Origin: 'https://example.com' }
        });
        let response = await OPTIONS(request);
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
        expect(response.headers.get('Vary')).toBe('Origin');

        // Test second origin
        request = new Request('http://localhost:3000/api/ph/test', {
            headers: { Origin: 'https://app.example.com' }
        });
        response = await OPTIONS(request);
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example.com');

        // Test disallowed origin
        request = new Request('http://localhost:3000/api/ph/test', {
            headers: { Origin: 'https://evil.com' }
        });
        response = await OPTIONS(request);
        expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    test('OPTIONS request returns * if CORS_ORIGINS is unset (defaulting to permissive)', async () => {
        delete process.env.CORS_ORIGINS;

        const request = new Request('http://localhost:3000/api/ph/test');
        const response = await OPTIONS(request);
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
        expect(response.headers.get('Vary')).toBe('Origin');
    });

    test('OPTIONS request returns no Access-Control-Allow-Origin when CORS_ORIGINS is empty string (strict)', async () => {
        process.env.CORS_ORIGINS = '';
        const request = new Request('http://localhost:3000/api/ph/test', {
            headers: { Origin: 'https://example.com' }
        });
        const response = await OPTIONS(request);
        expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });
});
