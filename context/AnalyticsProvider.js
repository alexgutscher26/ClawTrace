'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect, Suspense } from 'react';
import { useFleet } from './FleetContext';
import { usePathname, useSearchParams } from 'next/navigation';

function PostHogPageview() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { session } = useFleet();

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

  return null;
}

export function AnalyticsProvider({ children }) {
  const { session } = useFleet();

  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: '/ingest',
        ui_host: 'https://us.posthog.com',
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

  // Additional listener for hash-only changes (common in this app)
  useEffect(() => {
    const handleHashChange = (event) => {
      // Capture pageleave for the old URL
      if (event?.oldURL) {
        posthog.capture('$pageleave', {
          $current_url: event.oldURL,
        });
      }

      posthog.capture('$pageview', {
        $current_url: window.location.href,
      });
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Handle identity and session state
  useEffect(() => {
    if (!posthog) return;

    if (session?.user) {
      posthog.identify(session.user.id, {
        email: session.user.email,
        name: session.user.user_metadata?.full_name,
      });
    } else if (!session) {
      posthog.reset();
    }
  }, [session]);

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageview />
      </Suspense>
      {children}
    </PHProvider>
  );
}
