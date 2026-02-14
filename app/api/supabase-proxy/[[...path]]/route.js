import { NextResponse } from 'next/server';

/**
 * Vercel-Optimized Supabase Proxy
 * Bypasses CORS and 522/504 issues by using a server-side "clean" fetch.
 */
export async function POST(req, { params }) {
  const start = Date.now();
  try {
    const segments = (await params).path || [];
    const path = segments.join('/');
    const { searchParams } = new URL(req.url);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const targetUrl = `${supabaseUrl}/${path}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;

    // Vercel Hobby limit is 10s. We set timeout to 8s.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const body = await req.text();

    const forwardHeaders = new Headers();
    forwardHeaders.set('apikey', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    forwardHeaders.set('Content-Type', req.headers.get('Content-Type') || 'application/json');

    const auth = req.headers.get('authorization');
    if (auth) forwardHeaders.set('authorization', auth);

    let res;
    try {
      res = await fetch(targetUrl, {
        method: req.method,
        headers: forwardHeaders,
        body: body || undefined,
        signal: controller.signal,
        cache: 'no-store',
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          {
            error: 'System Overloaded',
            message:
              'Our database is currently processing high traffic. Please try again in 5 minutes.',
            status: 'unhealthy',
          },
          { status: 504 }
        );
      }
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }

    const data = await res.text();
    const duration = Date.now() - start;

    // If Supabase returns a 5xx, it's definitively unhealthy
    if (res.status >= 500) {
      return NextResponse.json(
        {
          error: 'Database Maintenance',
          message:
            'Supabase is currently undergoing maintenance. We are working to restore service.',
          status: 'unhealthy',
        },
        { status: 503 }
      );
    }

    return new NextResponse(data, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'application/json',
        'X-Proxy-Time': `${duration}ms`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Proxy Error', detail: error.message }, { status: 500 });
  }
}

export async function GET(req, context) {
  return POST(req, context);
}
export async function PUT(req, context) {
  return POST(req, context);
}
export async function DELETE(req, context) {
  return POST(req, context);
}
export async function PATCH(req, context) {
  return POST(req, context);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400',
    },
  });
}
