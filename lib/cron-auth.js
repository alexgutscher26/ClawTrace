import { NextResponse } from 'next/server';

/**
 * Verifies that the request contains the valid CRON_SECRET authorization header.
 * @param {Request} request
 * @returns {boolean}
 */
export function isValidCronRequest(request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET is not defined in environment variables');
    return false;
  }

  // Check specifically for "Bearer <token>"
  return authHeader === `Bearer ${cronSecret}`;
}

/**
 * Returns a standard 401 Unauthorized response for failed cron auth.
 * @returns {NextResponse}
 */
export function unauthorizedResponse() {
  return NextResponse.json(
    { success: false, error: 'Unauthorized: Invalid or missing CRON_SECRET' },
    { status: 401 }
  );
}
