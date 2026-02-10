import { PostHog } from 'posthog-node';

let posthogInstance = null;

/**
 * Returns a singleton instance of the PostHog Server SDK.
 */
export function getPostHogServer() {
    if (!posthogInstance && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
        posthogInstance = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
            host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
            flushAt: 1,
            flushInterval: 0,
        });
    }
    return posthogInstance;
}
