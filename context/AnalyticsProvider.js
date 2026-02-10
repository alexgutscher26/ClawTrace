'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from '@posthog/react';
import { useEffect } from 'react';
import { useFleet } from './FleetContext';
import { usePathname, useSearchParams } from 'next/navigation';

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

  // Handle manual pageview tracking for both App Router state and Hash changes
  useEffect(() => {
    if (typeof window !== 'undefined' && posthog) {
      let url = window.origin + pathname;
      if (searchParams.toString()) {
        url = url + `?${searchParams.toString()}`;
      }
      if (window.location.hash) {
        url = url + window.location.hash;
      }

      posthog.capture('$pageview', {
        $current_url: url,
      });

      // Capture pageleave when the path or search params change
      return () => {
        posthog.capture('$pageleave', {
          $current_url: url,
        });
      };
    }
  }, [pathname, searchParams]);

  // Handle hash changes for legacy hash-routing support
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

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
