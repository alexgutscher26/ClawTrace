import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';

// Mock next/server before importing the module under test
mock.module('next/server', () => {
  return {
    NextResponse: {
      json: (body, init) => ({ body, init }),
    },
  };
});

const { isValidCronRequest, unauthorizedResponse } = await import('../cron-auth');

describe('isValidCronRequest', () => {
  const originalEnv = process.env;
  let originalConsoleError;

  beforeEach(() => {
    // Clone process.env to avoid polluting global state
    process.env = { ...originalEnv };
    process.env.CRON_SECRET = 'test-secret-123';

    originalConsoleError = console.error;
    console.error = mock(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    console.error = originalConsoleError;
  });

  it('should return true for valid Authorization header', () => {
    const request = new Request('http://localhost', {
      headers: {
        authorization: 'Bearer test-secret-123',
      },
    });
    expect(isValidCronRequest(request)).toBe(true);
  });

  it('should return false for invalid Authorization header', () => {
    const request = new Request('http://localhost', {
      headers: {
        authorization: 'Bearer wrong-secret',
      },
    });
    expect(isValidCronRequest(request)).toBe(false);
  });

  it('should return false for missing Authorization header', () => {
    const request = new Request('http://localhost');
    expect(isValidCronRequest(request)).toBe(false);
  });

  it('should return false for malformed Authorization header', () => {
    const request = new Request('http://localhost', {
      headers: {
        authorization: 'Basic test-secret-123',
      },
    });
    expect(isValidCronRequest(request)).toBe(false);
  });

  it('should return false and log error when CRON_SECRET is not defined', () => {
    delete process.env.CRON_SECRET;
    const request = new Request('http://localhost', {
      headers: {
        authorization: 'Bearer test-secret-123',
      },
    });
    expect(isValidCronRequest(request)).toBe(false);
    expect(console.error).toHaveBeenCalledWith('CRON_SECRET is not defined in environment variables');
  });
});

describe('unauthorizedResponse', () => {
  it('should return 401 JSON response', () => {
    const response = unauthorizedResponse();
    // Verify using our mock structure: { body, init }
    expect(response.init).toEqual({ status: 401 });
    expect(response.body).toEqual({ success: false, error: 'Unauthorized: Invalid or missing CRON_SECRET' });
  });
});
