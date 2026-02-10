export function register() {
    // Initialization logic for the server runtime can go here
}

/**
 * Hook provided by Next.js to catch server-side request errors.
 */
export const onRequestError = async (err, request, context) => {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        try {
            const { getPostHogServer } = await import('./lib/posthog-server');
            const posthog = getPostHogServer();

            if (!posthog) return;

            let distinctId = null;

            // Extract PostHog distinct_id from cookies to associate error with the correct user
            if (request.headers.cookie) {
                const cookieString = Array.isArray(request.headers.cookie)
                    ? request.headers.cookie.join('; ')
                    : request.headers.cookie;

                // Match the PostHog cookie (usually prefixed with ph_<project_key>_posthog)
                const postHogCookieMatch = cookieString.match(/ph_.*?_posthog=([^;]+)/);

                if (postHogCookieMatch && postHogCookieMatch[1]) {
                    try {
                        const decodedCookie = decodeURIComponent(postHogCookieMatch[1]);
                        const postHogData = JSON.parse(decodedCookie);
                        distinctId = postHogData.distinct_id;
                    } catch (e) {
                        // Silently fail cookie parsing
                    }
                }
            }

            await posthog.captureException(err, {
                distinctId: distinctId || undefined,
                properties: {
                    path: request.url,
                    method: request.method,
                    runtime: process.env.NEXT_RUNTIME,
                },
            });
        } catch (e) {
            console.error('Error reporting to PostHog:', e);
        }
    }
};
