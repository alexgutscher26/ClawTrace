
import { NextResponse } from 'next/server';

const POSTHOG_API_HOST = 'https://us.i.posthog.com';
const POSTHOG_ASSETS_HOST = 'https://us-assets.i.posthog.com';

async function proxyRequest(request, { params }) {
    const { slug } = await params;
    const path = slug.join('/');

    const isStatic = path.startsWith('static');
    const host = isStatic ? POSTHOG_ASSETS_HOST : POSTHOG_API_HOST;
    const targetUrl = new URL(`${host}/${path}`);

    // Forward query parameters
    const requestUrl = new URL(request.url);
    requestUrl.searchParams.forEach((value, key) => {
        targetUrl.searchParams.append(key, value);
    });

    const headers = new Headers(request.headers);
    headers.set('host', targetUrl.host); // Set correct host header for the target

    const requestInit = {
        method: request.method,
        headers,
        // Do not set body for GET/HEAD requests
        body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.arrayBuffer() : undefined,
        duplex: 'half', // Required for streaming bodies in recent Node/Next versions
    };

    try {
        const response = await fetch(targetUrl.toString(), requestInit);

        const responseHeaders = new Headers(response.headers);

        // Strip headers that cause issues with proxying
        responseHeaders.delete('content-encoding');
        responseHeaders.delete('content-length');
        responseHeaders.delete('transfer-encoding');

        // Ensure CORS headers if needed, though usually handled by browser for same-origin proxy
        responseHeaders.set('Access-Control-Allow-Origin', '*');

        return new NextResponse(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
        });
    } catch (error) {
        console.error('Proxy Error:', error);
        return NextResponse.json({ error: 'Proxy failed' }, { status: 500 });
    }
}

/**
 * Handles GET requests by proxying them.
 */
export async function GET(request, context) {
    return proxyRequest(request, context);
}

/**
 * Handles POST requests by proxying them.
 */
export async function POST(request, context) {
    return proxyRequest(request, context);
}

/**
 * Handles OPTIONS HTTP requests and returns a 204 response with CORS headers.
 */
export async function OPTIONS(request) {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
