'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const FleetContext = createContext();

/**
 * Provides the context for the fleet management application.
 *
 * This component manages the authentication session, loading state, and branding information. It utilizes the Supabase API to fetch the current session and branding details based on the user's subscription plan. The component also handles public branding for non-local domains. The context value includes session, loading state, master passphrase, branding, and the API function for making requests.
 *
 * @param {Object} props - The component props.
 * @param {ReactNode} props.children - The child components to be rendered within the context provider.
 * @returns {JSX.Element} The FleetContext provider wrapping the children.
 */
export function FleetProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [masterPassphrase, setMasterPassphrase] = useState(null);
  const [branding, setBranding] = useState({ name: '', domain: '', logo_url: '' });

  const api = useCallback(async (url, opts = {}) => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();
    const headers = { ...opts.headers };
    if (currentSession?.access_token) {
      headers['Authorization'] = `Bearer ${currentSession.access_token}`;
    }

    const res = await fetch(url, { ...opts, headers });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Request failed');
    return json;
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      api('/api/billing')
        .then((res) => {
          if (res.subscription?.plan?.toLowerCase() === 'enterprise') {
            api('/api/enterprise/branding')
              .then((bRes) => {
                if (bRes.branding) setBranding(bRes.branding);
              })
              .catch(() => { });
          }
        })
        .catch(() => { });
    } else {
      // Check for custom domain branding (public)
      const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      const isMainDomain = typeof window !== 'undefined' && window.location.hostname.endsWith('clawtrace.dev');

      if (!isLocal && !isMainDomain && typeof window !== 'undefined') {
        const domain = window.location.hostname;
        // Fetch public branding
        fetch(`/api/branding/public?domain=${domain}`)
          .then(res => res.json())
          .then(res => {
            if (res.branding) {
              setBranding(res.branding);
            } else {
              setBranding({ name: '', domain: '', logo_url: '' });
            }
          })
          .catch(() => setBranding({ name: '', domain: '', logo_url: '' }));
      } else {
        setBranding({ name: '', domain: '', logo_url: '' });
      }
    }
  }, [session, api]);

  const value = React.useMemo(() => ({
    session,
    loading,
    masterPassphrase,
    setMasterPassphrase,
    branding,
    setBranding,
    api,
  }), [session, loading, masterPassphrase, setMasterPassphrase, branding, setBranding, api]);

  return <FleetContext.Provider value={value}>{children}</FleetContext.Provider>;
}

export function useFleet() {
  const context = useContext(FleetContext);
  if (!context) {
    throw new Error('useFleet must be used within a FleetProvider');
  }
  return context;
}
