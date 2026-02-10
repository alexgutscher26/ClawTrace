'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect, Suspense } from 'react';
import { useFleet } from './FleetContext';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Provides analytics tracking using PostHog for the application.
 *
 * This component initializes the PostHog client when the component mounts, handling pageview and pageleave events based on the application's routing. It also manages user identity and session state, ensuring that user information is sent to PostHog when available. The component listens for hash changes to support legacy routing and captures relevant analytics events accordingly.
 *
 * @param {Object} props - The component props.
 * @param {ReactNode} props.children - The child components to be rendered within the provider.
 * @returns {JSX.Element} The rendered provider component.
 */
export function AnalyticsProvider({ children }) {
  // Initialize PostHog client-side only
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY && !posthog.__loaded) {
      try {
        posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
          api_host: '/api/ph', // Proxied path to bypass ad blockers
          ui_host: 'https://us.posthog.com',
          person_profiles: 'always',
          capture_pageview: false, // We handle it manually for hash routing support
          capture_pageleave: true,
          persistence: 'localStorage',
          autocapture: true,
          capture_performance: true,
          enable_external_api_event_tracking: true,
          session_recording: {
            maskAllInputFields: false,
            maskTextSelector: '.sensitive',
          },
          loaded: (ph) => {
            if (process.env.NODE_ENV === 'development') ph.debug();
            posthog.__loaded = true;
          },
        });
      } catch (e) {
        console.warn('PostHog init failed:', e);
      }
    }
  }, []);

  const { session } = useFleet();
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
    /**
     * Handles the hash change event by capturing pageleave and pageview events.
     */
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
