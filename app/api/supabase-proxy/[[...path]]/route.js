import { NextResponse } from 'next/server';

/**
 * Generic Supabase Proxy that handles Auth, REST, and Realtime requests.
 *
 * This function forwards requests from the browser to the Supabase API, ensuring that headers are cleaned to avoid connectivity issues. It constructs the target URL based on the incoming request and parameters, retrieves the request body, and sends the request to Supabase. It also handles errors and logs relevant information for debugging.
 *
 * @param req - The incoming request object.
 * @param params - An object containing route parameters.
 * @returns A NextResponse object containing the response from the Supabase API.
 * @throws Error If an internal proxy error occurs.
 */
export async function POST(req, { params }) {
    try {
        const segments = (await params).path || [];
        const path = segments.join('/');
        const { searchParams } = new URL(req.url);
        const queryString = searchParams.toString();

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const targetUrl = `${supabaseUrl}/${path}${queryString ? '?' + queryString : ''}`;

        console.log(`[SupabaseProxy] Forwarding ${req.method} to: ${targetUrl}`);

        const body = await req.text();
        const headers = new Headers(req.headers);

        // Crucial: Delete headers that cause connectivity issues when proxied
        headers.delete('host');
        headers.delete('origin');
        headers.delete('referer');
        headers.delete('content-length'); // Let fetch recalculate

        // Ensure the API key is present
        headers.set('apikey', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

        const res = await fetch(targetUrl, {
            method: req.method,
            headers,
            body: body || undefined,
            cache: 'no-store',
        });

        const data = await res.text();

        if (!res.ok) {
            console.error(`[SupabaseProxy] Remote Error: ${res.status} ${res.statusText}`);
            // Log a snippet of the response if it's HTML (likely the 522 page)
            if (data.includes('<!DOCTYPE')) {
                console.error(`[SupabaseProxy] Received HTML instead of JSON. Check if Supabase project is paused.`);
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
        return NextResponse.json({ error: 'Proxy Error', details: error.message }, { status: 500 });
    }
}

/**
 * Handles GET requests by delegating to the POST function.
 */
export async function GET(req, context) { return POST(req, context); }
/**
 * Handles the PUT request by delegating to the POST function.
 */
export async function PUT(req, context) { return POST(req, context); }
export async function DELETE(req, context) { return POST(req, context); }
/**
 * Handles a PATCH request by delegating to the POST function.
 */
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
