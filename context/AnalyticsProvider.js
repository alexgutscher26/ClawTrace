'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';
import { useFleet } from './FleetContext';

export function AnalyticsProvider({ children }) {
    const { session } = useFleet();

    useEffect(() => {
        if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
            posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
                api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
                defaults: '2025-11-30',
                person_profiles: 'always',
                capture_performance: true,
            });
            window.posthog = posthog;
        }
    }, []);

    useEffect(() => {
        if (session?.user) {
            posthog.identify(session.user.id, {
                email: session.user.email,
                name: session.user.user_metadata?.full_name,
            });
        } else if (!session && posthog.__loaded) {
            posthog.reset();
        }
    }, [session]);

    return <PHProvider client={posthog}>{children}</PHProvider>;
}
