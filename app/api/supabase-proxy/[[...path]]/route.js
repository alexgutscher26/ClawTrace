import { NextResponse } from 'next/server';

/**
 * Generic Supabase Proxy that handles Auth, REST, and Realtime requests.
 *
 * This function forwards requests from the browser to the Supabase API, managing headers to avoid connectivity issues and implementing a timeout for the fetch operation. It constructs the target URL based on the request parameters and query string, and processes the response, logging errors and returning appropriate responses based on the success or failure of the fetch operation.
 *
 * @param req - The incoming request object.
 * @param params - An object containing route parameters.
 * @returns A NextResponse object containing the response data from the Supabase API.
 * @throws Error If the fetch operation fails or if there is an internal proxy error.
 */
export async function POST(req, { params }) {
    try {
        const segments = (await params).path || [];
        const path = segments.join('/');
        const { searchParams } = new URL(req.url);
        const queryString = searchParams.toString();

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const targetUrl = `${supabaseUrl}/${path}${queryString ? '?' + queryString : ''}`;

        console.log(`[SupabaseProxy] Starting ${req.method} to: ${targetUrl}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

        const body = await req.text();
        const headers = new Headers(req.headers);

        // Crucial: Delete headers that cause connectivity issues when proxied
        headers.delete('host');
        headers.delete('origin');
        headers.delete('referer');
        headers.delete('content-length'); // Let fetch recalculate

        // Ensure the API key is present
        headers.set('apikey', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

        console.time(`proxy-${path}`);
        let res;
        try {
            res = await fetch(targetUrl, {
                method: req.method,
                headers,
                body: body || undefined,
                cache: 'no-store',
                signal: controller.signal,
            });
        } catch (fetchError) {
            console.error(`[SupabaseProxy] Fetch Failed:`, fetchError.name === 'AbortError' ? 'TIMEOUT' : fetchError.message);
            throw fetchError;
        } finally {
            clearTimeout(timeoutId);
            console.timeEnd(`proxy-${path}`);
        }

        const data = await res.text();

        if (!res.ok) {
            console.error(`[SupabaseProxy] Remote Error: ${res.status} ${res.statusText}`);
            // Log a snippet of the response if it's HTML (likely the 522 page)
            if (data.includes('<!DOCTYPE')) {
                console.error(`[SupabaseProxy] Received HTML instead of JSON. Project might be paused or Cloudflare is blocking the IP.`);
            }
        }

        return new NextResponse(data, {
            status: res.status,
            headers: {
                'Content-Type': res.headers.get('Content-Type') || 'application/json',
                'Cache-Control': 'no-store, max-age=0',
            },
        });
    } catch (error) {
        console.error('[SupabaseProxy] Internal Proxy Error:', error);
        return NextResponse.json({
            error: 'Proxy Error',
            details: error.message,
            type: error.name === 'AbortError' ? 'timeout' : 'error'
        }, { status: error.name === 'AbortError' ? 504 : 500 });
    }
}

export async function GET(req, context) { return POST(req, context); }
export async function PUT(req, context) { return POST(req, context); }
export async function DELETE(req, context) { return POST(req, context); }
export async function PATCH(req, context) { return POST(req, context); }
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
            'Access-Control-Allow-Headers': '*',
        }
    });
}
