'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';
import { useFleet } from './FleetContext';
import { usePathname, useSearchParams } from 'next/navigation';

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
