'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';
import { useFleet } from './FleetContext';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Provides analytics tracking for the application using PostHog.
 *
 * This component initializes PostHog with the necessary configuration and handles manual pageview tracking for both App Router and Hash Router. It also listens for hash changes to capture virtual route changes and identifies users based on the session state. The component ensures that PostHog is only initialized in a browser environment and manages user identification and session resets accordingly.
 *
 * @param {Object} props - The component props.
 * @param {ReactNode} props.children - The child components to be rendered within the provider.
 * @returns {JSX.Element} The rendered provider component with analytics tracking.
 */
export function AnalyticsProvider({ children }) {
  const { session } = useFleet();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
        person_profiles: 'always',
        capture_pageview: false, // We'll handle it manually to support hash routing
        persistence: 'localStorage',
        autocapture: true,
        capture_performance: true, // Enable performance/web vitals tracking
        enable_external_api_event_tracking: true, // Captures API errors
        session_recording: {
          maskAllInputFields: false,
          maskTextSelector: ".sensitive",
        },
        enable_recording_console_log: true, // Required for advanced Error Tracking
      });
      window.posthog = posthog;
    }
  }, []);

  // Manual pageview tracking to support both App Router and Hash Router migrations
  useEffect(() => {
    if (typeof window !== 'undefined' && posthog.__loaded) {
      let url = window.origin + pathname;
      if (searchParams.toString()) {
        url = url + `?${searchParams.toString()}`;
      }
      // Include hash if present (for virtual routes)
      if (window.location.hash) {
        url = url + window.location.hash;
      }

      posthog.capture('$pageview', {
        $current_url: url,
      });
    }
  }, [pathname, searchParams, session]);

  // Additional listener for hash-only changes (common in this app)
  useEffect(() => {
    const handleHashChange = () => {
      if (posthog.__loaded) {
        posthog.capture('$pageview', {
          $current_url: window.location.href,
        });
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (session?.user && posthog.__loaded) {
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
