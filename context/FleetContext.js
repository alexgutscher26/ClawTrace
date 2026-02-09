'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const FleetContext = createContext();

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
              .catch(() => {});
          }
        })
        .catch(() => {});
    } else {
      setBranding({ name: '', domain: '', logo_url: '' });
    }
  }, [session, api]);

  const value = {
    session,
    loading,
    masterPassphrase,
    setMasterPassphrase,
    branding,
    setBranding,
    api,
  };

  return <FleetContext.Provider value={value}>{children}</FleetContext.Provider>;
}

export function useFleet() {
  const context = useContext(FleetContext);
  if (!context) {
    throw new Error('useFleet must be used within a FleetProvider');
  }
  return context;
}
