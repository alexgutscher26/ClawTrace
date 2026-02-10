'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect, Suspense } from 'react';
import { useFleet } from './FleetContext';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Provides analytics tracking using PostHog for the application.
 *
 * This component initializes the PostHog client when the component mounts, handling pageview and pageleave events manually for both App Router state and hash changes. It manages user identity and session state by utilizing hooks to track changes in the session, pathname, and search parameters. The component ensures that the correct user information is sent to PostHog while configuring various settings for optimal tracking.
 *
 * @param {Object} props - The component props.
 * @param {ReactNode} props.children - The child components to be rendered within the provider.
 * @returns {JSX.Element} The rendered provider component with children.
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

  // Track pageviews on route change
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

/**
 * Initializes the PostHog analytics provider and manages session tracking.
 *
 * This function sets up PostHog with various configurations, including API hosts and session recording options.
 * It also listens for hash changes to capture pageleave and pageview events, and manages user identity based on the session state.
 *
 * @param {Object} props - The properties object.
 * @param {ReactNode} props.children - The child components to be rendered within the provider.
 * @returns {JSX.Element} The rendered AnalyticsProvider component.
 */
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

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
