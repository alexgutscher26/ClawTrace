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

        console.log(`[SupabaseProxy] ${req.method} -> ${path}`);

        // Vercel Hobby limit is 10s. We set timeout to 8s to catch it early.
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const body = await req.text();

        // Create clean headers for the destination
        const forwardHeaders = new Headers();
        forwardHeaders.set('apikey', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
        forwardHeaders.set('Content-Type', req.headers.get('Content-Type') || 'application/json');

        // Pass through Authorization if it exists (for logged in requests)
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
                console.error(`[SupabaseProxy] TIMEOUT at 8s for ${path}`);
                return NextResponse.json({ error: 'Supabase Timeout', detail: 'The request took too long to respond.' }, { status: 504 });
            }
            throw fetchError;
        } finally {
            clearTimeout(timeoutId);
        }

        const data = await res.text();
        const duration = Date.now() - start;
        console.log(`[SupabaseProxy] ${res.status} from ${path} (${duration}ms)`);

        return new NextResponse(data, {
            status: res.status,
            headers: {
                'Content-Type': res.headers.get('Content-Type') || 'application/json',
                'X-Proxy-Time': `${duration}ms`,
            },
        });
    } catch (error) {
        console.error('[SupabaseProxy] Critical Error:', error.message);
        return NextResponse.json({ error: 'Proxy implementation error', detail: error.message }, { status: 500 });
    }
}

// Map all standard methods
/**
 * Handles GET requests by delegating to the POST handler.
 */
export async function GET(req, context) { return POST(req, context); }
export async function PUT(req, context) { return POST(req, context); }
export async function DELETE(req, context) { return POST(req, context); }
export async function PATCH(req, context) { return POST(req, context); }

// Handle preflight OPTIONS
/**
 * Handles the OPTIONS HTTP method and returns CORS headers.
 */
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Max-Age': '86400',
        }
    });
}
