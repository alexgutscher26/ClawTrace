'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Zap,
  ArrowLeft,
  ArrowRight,
  Menu,
  X,
  Bell,
  Webhook,
  Building2,
  Copy,
  Box,
  Globe,
  Settings2,
  AlertTriangle,
  Trash2,
  Plus,
  Search,
  MoreVertical,
  Activity,
  Cpu,
  Layers,
  Shield,
  Clock,
  ArrowUpRight,
  CheckCircle,
  RefreshCw,
  Play,
  Square,
  FileCode,
  Settings,
  ChevronRight,
  Slack,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

import { getPolicy } from '@/lib/policies';
import { encryptE2EE, decryptE2EE, isE2E } from '@/lib/client-crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const STATUS_CONFIG = {
  healthy: {
    color: 'bg-white',
    text: 'text-white',
    border: 'border-white/20',
    label: 'OPERATIONAL',
    bgLight: 'bg-white/10',
  },
  idle: {
    color: 'bg-zinc-500',
    text: 'text-zinc-400',
    border: 'border-white/10',
    label: 'IDLE',
    bgLight: 'bg-white/5',
  },
  error: {
    color: 'bg-white',
    text: 'text-white',
    border: 'border-white/40',
    label: 'ERROR',
    bgLight: 'bg-white/20',
  },
  offline: {
    color: 'bg-zinc-700',
    text: 'text-zinc-500',
    border: 'border-white/5',
    label: 'OFFLINE',
    bgLight: 'bg-white/5',
  },
};

/**
 * Returns a human-readable string representing the time elapsed since a given date.
 *
 * The function checks if the dateString is provided; if not, it returns 'Never'. It then calculates
 * the difference in seconds between the current time and the provided dateString. Based on the
 * magnitude of this difference, it formats the output into seconds, minutes, hours, or days.
 *
 * @param {string} dateString - The date string to calculate the time ago from.
 */
function timeAgo(dateString) {
  if (!dateString) return 'Never';
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/**
 * Custom hook to manage routing based on the URL hash.
 *
 * It initializes the route state and sets up an effect to parse the hash from the URL.
 * The hash is used to determine the current view and any associated parameters.
 * The hook also provides a navigate function to change the hash, triggering a re-evaluation of the route.
 *
 * @returns An object containing the current route view and parameters, along with a navigate function to change the route.
 */
function useHashRouter() {
  const [route, setRoute] = useState({ view: 'landing', params: {} });
  useEffect(() => {
    /**
     * Parse the current URL hash and return the corresponding view and parameters.
     *
     * The function retrieves the hash from the window's location, checks it against predefined routes such as 'landing', 'login', 'register', 'dashboard', 'pricing', 'settings', and 'changelog'.
     * If the hash matches the pattern for an agent detail, it extracts the agent ID and returns it.
     * If no valid hash is found, it defaults to the 'landing' view.
     *
     * @returns An object containing the view and associated parameters.
     */
    const parseHash = () => {
      const hash = window.location.hash.slice(1) || '/';
      if (hash === '/' || hash === '') return { view: 'landing', params: {} };
      if (hash === '/login') return { view: 'login', params: {} };
      if (hash === '/register') return { view: 'register', params: {} };
      if (hash === '/dashboard') return { view: 'dashboard', params: {} };
      if (hash === '/pricing') return { view: 'pricing', params: {} };
      if (hash === '/settings') return { view: 'settings', params: {} };
      if (hash === '/changelog') return { view: 'changelog', params: {} };
      const m = hash.match(/^\/agent\/(.+)$/);
      if (m) return { view: 'agent-detail', params: { id: m[1] } };
      return { view: 'landing', params: {} };
    };
    /**
     * Updates the route based on the parsed hash.
     */
    const handle = () => setRoute(parseHash());
    handle();
    window.addEventListener('hashchange', handle);
    return () => window.removeEventListener('hashchange', handle);
  }, []);
  const navigate = useCallback((p) => {
    window.location.hash = p;
  }, []);
  return { ...route, navigate };
}

const CHANGELOG_DATA = [
  {
    date: 'February 2026',
    version: 'v1.4.1',
    title: 'Authentication & UX Improvements',
    items: [
      {
        type: 'fix',
        text: 'Fixed PowerShell agent handshake timestamp bug causing 6-hour offset on Windows systems.',
      },
      {
        type: 'improvement',
        text: 'Enhanced HMAC-SHA256 signature validation with comprehensive debug logging.',
      },
      {
        type: 'improvement',
        text: 'Updated default AI model from gpt-4 to claude-sonnet-4 for better cost-efficiency.',
      },
      {
        type: 'fix',
        text: 'Resolved E2EE master key prompt appearing incorrectly for server-side encrypted configs.',
      },
    ],
  },
  {
    date: 'February 2026',
    version: 'v1.4.0',
    title: 'Deep Intelligence & Smart Alerts',
    items: [
      {
        type: 'feature',
        text: 'Implemented real-time threshold monitoring for CPU, Memory, and Latency.',
      },
      { type: 'feature', text: 'Added integration for Slack, Discord, and Custom Webhooks.' },
      {
        type: 'improvement',
        text: 'Built-in alert fatigue prevention (Squelch logic) for high-frequency events.',
      },
      { type: 'feature', text: 'New Settings panel for managing notification channels globally.' },
    ],
  },
  {
    date: 'January 2026',
    version: 'v1.3.0',
    title: 'Policy Engine v2',
    items: [
      { type: 'feature', text: 'Revamped Policy profiles with deep hardware enforcement rules.' },
      { type: 'feature', text: 'Added real-time cost calculation based on agent token usage.' },
      {
        type: 'improvement',
        text: 'Optimized heartbeat frequency for large-scale fleets (10k+ agents).',
      },
    ],
  },
  {
    date: 'December 2025',
    version: 'v1.2.0',
    title: 'Security Hardening',
    items: [
      { type: 'feature', text: 'AES-256-GCM encryption for all sensitive agent configurations.' },
      {
        type: 'improvement',
        text: 'Implemented Row Level Security (RLS) across all core database tables.',
      },
      { type: 'feature', text: 'New Team Management system with invite-only access control.' },
    ],
  },
];

/**
 * Renders the changelog view displaying platform updates and release information.
 */
function ChangelogView({ navigate, session, branding }) {
  return (
    <div className="bg-background min-h-screen text-white">
      <Navbar navigate={navigate} session={session} branding={branding} />

      <div className="container mx-auto max-w-4xl px-6 pt-32 pb-20">
        <div className="mb-16">
          <Badge
            variant="outline"
            className="mb-4 border-emerald-500/30 bg-emerald-500/5 px-3 py-1 font-mono text-[10px] tracking-widest text-emerald-400 uppercase"
          >
            Platform Updates
          </Badge>
          <h1 className="flex items-center gap-4 text-5xl font-black tracking-tight uppercase italic">
            Changelog <div className="h-1 flex-1 bg-white/10" />
          </h1>
          <p className="mt-4 font-mono text-sm tracking-widest text-zinc-500 uppercase italic">
            Tracking the evolution of deep fleet orchestration.
          </p>
        </div>

        <div className="relative space-y-16">
          {/* Timeline Line */}
          <div className="absolute top-0 bottom-0 left-0 ml-[18px] hidden w-px bg-linear-to-b from-emerald-500/50 via-white/10 to-transparent sm:block md:ml-[34px]" />

          {CHANGELOG_DATA.map((release, idx) => (
            <div key={idx} className="relative pl-12 sm:pl-24">
              {/* Point */}
              <div className="absolute top-1.5 left-0 z-10 flex h-10 w-10 items-center justify-center rounded-none border border-white/20 bg-black sm:left-4 sm:ml-4">
                <div className="h-2 w-2 rotate-45 bg-emerald-500" />
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <span className="border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-xs font-bold tracking-tighter text-emerald-400">
                    {release.version}
                  </span>
                  <span className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
                    {release.date}
                  </span>
                </div>

                <h2 className="text-2xl font-bold tracking-tight uppercase italic">
                  {release.title}
                </h2>

                <Card className="glass-card border-white/5 bg-white/2">
                  <CardContent className="space-y-4 pt-6">
                    {release.items.map((item, i) => (
                      <div key={i} className="group flex gap-4">
                        <div
                          className={`mt-0.5 h-fit shrink-0 rounded-sm px-2 py-1 font-mono text-[9px] font-bold tracking-tighter uppercase ${
                            item.type === 'feature'
                              ? 'bg-white text-black'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {item.type}
                        </div>
                        <p className="text-sm leading-relaxed text-zinc-300 transition-colors group-hover:text-white">
                          {item.text}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-24 border-t border-white/5 pt-12 text-center">
          <p className="font-mono text-xs leading-loose tracking-widest text-zinc-500 uppercase">
            Want to see a specific feature? <br />
            <button className="font-bold text-white underline-offset-4 hover:underline">
              Request it on GitHub
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Render the SettingsView component for managing alert channels and custom policies.
 *
 * This component handles the state and lifecycle of alert channels and custom policies, including loading data from the API, adding new channels and policies, and managing branding settings. It utilizes various hooks to manage state and side effects, ensuring that the UI reflects the current application state based on user interactions and API responses.
 *
 * @param {Object} props - The properties for the SettingsView component.
 * @param {Function} props.navigate - Function to navigate to different routes.
 * @param {Function} props.api - Function to make API calls.
 * @param {Object} props.session - The current user session information.
 * @param {Object} props.branding - Initial branding settings.
 * @param {Function} props.setGlobalBranding - Function to update global branding settings.
 */
function SettingsView({ navigate, api, session, branding: initialBranding, setGlobalBranding }) {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newChannel, setNewChannel] = useState({ name: '', type: 'slack', webhook_url: '' });
  const [tier, setTier] = useState('free');
  const [policies, setPolicies] = useState([]);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [newPolicy, setNewPolicy] = useState({
    name: '',
    label: '',
    description: '',
    skills: '',
    tools: '',
    heartbeat_interval: 300,
  });
  const [branding, setBranding] = useState(initialBranding || { domain: '', name: '' });
  const [savingBranding, setSavingBranding] = useState(false);

  useEffect(() => {
    if (initialBranding) setBranding(initialBranding);
  }, [initialBranding]);

  useEffect(() => {
    api('/api/billing')
      .then((res) => {
        const p = res.subscription?.plan || 'free';
        setTier(p.toLowerCase());
      })
      .catch(() => {});
  }, [api]);

  useEffect(() => {
    if (tier === 'enterprise') {
      api('/api/enterprise/branding')
        .then((res) => {
          if (res.branding) setBranding(res.branding);
        })
        .catch(() => {});
    }
  }, [tier, api]);

  const loadPolicies = useCallback(async () => {
    try {
      const res = await api('/api/custom-policies');
      setPolicies(res.policies || []);
    } catch (err) {
      toast.error('Failed to load policies');
      console.error(err);
    }
  }, [api]);

  useEffect(() => {
    if (tier === 'enterprise' || tier === 'pro') loadPolicies();
  }, [tier, loadPolicies]);

  const loadChannels = useCallback(async () => {
    try {
      const res = await api('/api/alert-channels');
      setChannels(res.channels || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  /**
   * Handles the addition of a new alert channel via an API call.
   */
  const handleAddChannel = async () => {
    try {
      await api('/api/alert-channels', {
        method: 'POST',
        body: JSON.stringify({
          name: newChannel.name,
          type: newChannel.type,
          config: { webhook_url: newChannel.webhook_url },
        }),
      });
      toast.success('Channel added!');
      setAddOpen(false);
      setNewChannel({ name: '', type: 'slack', webhook_url: '' });
      loadChannels();
    } catch (err) {
      toast.error(err.message);
    }
  };

  /**
   * Handles the addition of a new custom policy.
   *
   * This function sends a POST request to the API to create a new policy using the data from `newPolicy`.
   * It processes the `skills` and `tools` fields by splitting them into arrays, trimming whitespace, and filtering out any empty values.
   * Upon successful creation, it displays a success message, resets the policy form, and reloads the list of policies.
   * In case of an error, it displays an error message.
   */
  const handleAddPolicy = async () => {
    try {
      await api('/api/custom-policies', {
        method: 'POST',
        body: JSON.stringify({
          ...newPolicy,
          skills: newPolicy.skills
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          tools: newPolicy.tools
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      toast.success('Custom policy created!');
      setPolicyOpen(false);
      setNewPolicy({
        name: '',
        label: '',
        description: '',
        skills: '',
        tools: '',
        heartbeat_interval: 300,
      });
      loadPolicies();
    } catch (err) {
      toast.error(err.message);
    }
  };

  /**
   * Prompts the user for confirmation to delete a custom policy and executes the deletion.
   */
  const handleDeletePolicy = (id) => {
    toast('Delete this custom policy?', {
      action: {
        label: 'Confirm',
        onClick: async () => {
          try {
            await api(`/api/custom-policies/${id}`, { method: 'DELETE' });
            toast.success('Policy removed');
            loadPolicies();
          } catch (err) {
            toast.error(err.message);
          }
        },
      },
    });
  };

  /**
   * Handles the saving of branding information.
   *
   * This function sets a loading state while making an asynchronous POST request to update branding data.
   * It processes the response to update global branding state if available and displays a success message.
   * In case of an error, it shows an error message. Finally, it resets the loading state.
   */
  const handleSaveBranding = async () => {
    setSavingBranding(true);
    try {
      const res = await api('/api/enterprise/branding', {
        method: 'POST',
        body: JSON.stringify(branding),
      });
      if (res.branding && setGlobalBranding) {
        setGlobalBranding(res.branding);
      }
      toast.success('Branding updated successfully');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingBranding(false);
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <Navbar navigate={navigate} session={session} branding={initialBranding} />
      <div className="container mx-auto px-6 pt-24 pb-20">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white uppercase italic">
              Settings
            </h1>
            <p className="text-muted-foreground mt-1 font-mono text-sm">
              CONFIGURE YOUR FLEET ORCHESTRATOR
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="h-9 rounded-none border-white/10 text-xs font-bold text-white hover:bg-white/5 disabled:opacity-50"
              onClick={() => setPolicyOpen(true)}
              disabled={tier === 'free'}
            >
              <Shield className="mr-2 h-4 w-4" /> CREATE POLICY{' '}
              {tier === 'free' && '(UPGRADE REQUIRED)'}
            </Button>
            <Button
              className="h-9 rounded-none bg-white text-xs font-bold text-black hover:bg-zinc-200"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> ADD NOTIFICATION CHANNEL
            </Button>
          </div>
        </div>

        <Tabs defaultValue="alert-channels" className="w-full">
          <TabsList className="mb-8 h-10 rounded-none border border-white/10 bg-zinc-950 p-0">
            <TabsTrigger
              value="alert-channels"
              className="h-full rounded-none px-8 font-mono text-[10px] tracking-widest uppercase data-[state=active]:bg-white data-[state=active]:text-black"
            >
              Alert Channels
            </TabsTrigger>
            <TabsTrigger
              value="policies"
              className="flex h-full items-center gap-2 rounded-none px-8 font-mono text-[10px] tracking-widest uppercase data-[state=active]:bg-white data-[state=active]:text-black"
            >
              Custom Policies{' '}
              {tier !== 'enterprise' && (
                <Badge className="h-3.5 rounded-none border-amber-500/30 bg-amber-500/20 px-1 py-0 text-[7px] text-amber-500">
                  {tier === 'pro' ? 'PREMIUM' : 'UPGRADE'}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="enterprise"
              className="h-full rounded-none px-8 font-mono text-[10px] tracking-widest uppercase data-[state=active]:bg-white data-[state=active]:text-black"
            >
              Enterprise
            </TabsTrigger>
            <TabsTrigger
              value="general"
              className="h-full rounded-none px-8 font-mono text-[10px] tracking-widest uppercase data-[state=active]:bg-white data-[state=active]:text-black"
            >
              General
            </TabsTrigger>
          </TabsList>

          <TabsContent value="alert-channels">
            <div className="grid gap-4">
              {loading ? (
                <LoadingScreen />
              ) : channels.length === 0 ? (
                <Card className="glass-card border-dashed border-white/10 p-12 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
                    <Slack className="h-6 w-6 text-zinc-500" />
                  </div>
                  <h3 className="mb-1 text-sm font-bold text-white uppercase">No channels yet</h3>
                  <p className="text-muted-foreground mx-auto mb-6 max-w-xs font-mono text-xs">
                    Create a Slack or Discord webhook to receive deep intelligence alerts from your
                    agents.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-none border-white/20 text-[10px] font-bold"
                    onClick={() => setAddOpen(true)}
                  >
                    CREATE FIRST CHANNEL
                  </Button>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {channels.map((c) => (
                    <Card
                      key={c.id}
                      className="glass-card border-white/5 transition-colors hover:border-white/10"
                    >
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                          <CardTitle className="text-sm font-bold text-white">{c.name}</CardTitle>
                          <CardDescription className="mt-1 font-mono text-[10px] tracking-tighter text-emerald-400 uppercase">
                            {c.type}
                          </CardDescription>
                        </div>
                        <div
                          className={`rounded-sm p-2 ${c.type === 'slack' ? 'bg-emerald-500/10' : 'bg-indigo-500/10'}`}
                        >
                          {c.type === 'slack' ? (
                            <Slack className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <MoreVertical className="h-4 w-4 text-indigo-400" />
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="mt-2 flex items-center gap-2">
                          <code className="flex-1 truncate rounded border border-white/5 bg-black/50 px-2 py-1 font-mono text-[9px] text-zinc-500">
                            {c.config?.webhook_url || '••••••••••••••••'}
                          </code>
                          <Badge className="rounded-none bg-emerald-500 text-[9px] font-bold text-black">
                            ACTIVE
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="policies">
            <div className="grid gap-4">
              {tier === 'free' && (
                <div className="mb-4 rounded-sm border border-amber-500/20 bg-amber-500/10 p-4">
                  <p className="flex items-center gap-2 font-mono text-[10px] tracking-widest text-amber-400 uppercase">
                    <AlertTriangle className="h-3 w-3" /> Custom policies are an Enterprise feature.
                    Part of your current plan limits.
                  </p>
                </div>
              )}
              {policies.length === 0 ? (
                <Card className="glass-card border-dashed border-white/10 p-12 text-center">
                  <Shield className="mx-auto mb-4 h-12 w-12 text-zinc-700" />
                  <h3 className="mb-1 text-sm font-bold text-white uppercase">
                    No custom policies
                  </h3>
                  <p className="text-muted-foreground mx-auto mb-6 max-w-xs font-mono text-xs">
                    Create specialized policies for your enterprise agents.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-none border-white/20 text-[10px] font-bold"
                    onClick={() => setPolicyOpen(true)}
                    disabled={tier === 'free'}
                  >
                    CREATE FIRST POLICY
                  </Button>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {policies.map((p) => (
                    <Card
                      key={p.id}
                      className="glass-card group relative overflow-hidden border-white/5"
                    >
                      <div className="absolute top-0 right-0 p-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-500 hover:bg-red-500/10 hover:text-red-400"
                          onClick={() => handleDeletePolicy(p.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <CardHeader className="pb-3">
                        <Badge
                          variant="outline"
                          className={`mb-2 w-fit rounded-none font-mono text-[9px] ${p.color}`}
                        >
                          {p.label}
                        </Badge>
                        <CardTitle className="text-sm font-bold text-white uppercase italic">
                          {p.name}
                        </CardTitle>
                        <CardDescription className="line-clamp-2 h-8 text-[10px] leading-relaxed">
                          {p.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex flex-wrap gap-1">
                          {p.skills?.slice(0, 3).map((s) => (
                            <Badge
                              key={s}
                              className="rounded-none border-none bg-white/5 px-1 font-mono text-[8px] text-zinc-500 lowercase shadow-none"
                            >
                              {s}
                            </Badge>
                          ))}
                          {p.skills?.length > 3 && (
                            <span className="font-mono text-[8px] text-zinc-600">
                              +{p.skills.length - 3}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between border-t border-white/5 pt-2">
                          <span className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
                            Interval
                          </span>
                          <span className="font-mono text-[10px] text-white">
                            {p.heartbeat_interval}s
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="enterprise">
            <div className="grid gap-4">
              {tier !== 'enterprise' ? (
                <Card className="glass-card relative overflow-hidden border-dashed border-white/10 p-12 text-center">
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/5 p-8 backdrop-blur-[2px]">
                    <Building2 className="mb-6 h-12 w-12 animate-pulse text-white" />
                    <h3 className="mb-2 text-xl font-bold tracking-tight text-white uppercase italic">
                      Enterprise Infrastructure Locked
                    </h3>
                    <p className="mb-8 max-w-sm font-mono text-xs leading-relaxed text-zinc-500">
                      On-Premise deployment, white-labeling, and dedicated SLAs require an
                      Enterprise license.
                    </p>
                    <Button
                      className="h-11 rounded-none bg-white px-10 font-black tracking-widest text-black uppercase italic"
                      onClick={() => navigate('/pricing')}
                    >
                      UPGRADE TO ENTERPRISE
                    </Button>
                  </div>
                  <div className="opacity-10 blur-sm grayscale">
                    <div className="mb-4 h-48 w-full rounded-sm border border-white/10 bg-zinc-900" />
                    <div className="h-48 w-full rounded-sm border border-white/10 bg-zinc-900" />
                  </div>
                </Card>
              ) : (
                <div className="space-y-6">
                  <Card className="glass-card border-emerald-500/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-sm font-bold text-white">
                          <Globe className="h-4 w-4 text-emerald-400" /> SELF-HOSTING / ON-PREMISE
                        </CardTitle>
                        <CardDescription className="mt-1 font-mono text-[10px] text-zinc-500">
                          Deploy Fleet OS on your own infrastructure.
                        </CardDescription>
                      </div>
                      <Badge className="rounded-none bg-emerald-500 text-[9px] font-bold text-black">
                        ENTERPRISE ACTIVE
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-2">
                      <div className="grid gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] text-zinc-400 uppercase">
                            On-Premise API Key
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              readOnly
                              type="password"
                              value="ent_live_x882_99ac_f221_0b44"
                              className="border-white/10 bg-zinc-950 font-mono text-xs text-emerald-400"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 rounded-none border-white/10"
                              onClick={() => {
                                navigator.clipboard.writeText('ent_live_x882_99ac_f221_0b44');
                                toast.success('Key copied!');
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="font-mono text-[9px] text-zinc-600 uppercase">
                            THIS KEY ALLOWS YOUR ON-PREM NODE TO SYNC WITH GLOBAL FLEET POLICY.
                          </p>
                        </div>

                        <Separator className="bg-white/5" />

                        <div className="space-y-3">
                          <h4 className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-zinc-300 uppercase">
                            <Box className="h-3 w-3" /> Quick Deployment (Docker)
                          </h4>
                          <div className="group relative">
                            <pre className="overflow-x-auto rounded-sm border border-white/10 bg-black/60 p-4 font-mono text-[10px] text-zinc-400">
                              {`version: '3.8'
services:
  fleet-node:
    image: ghcr.io/openclaw/fleet:latest
    environment:
      - FLEET_KEY=ent_live_x882_99ac_f221_0b44
      - SAAS_URL=${window.location.origin}
      - MODE=on-premise
    ports:
      - "8080:8080"`}
                            </pre>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute top-2 right-2 h-6 bg-white text-[9px] font-bold text-black uppercase opacity-0 transition-opacity group-hover:opacity-100 hover:bg-zinc-200"
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  `version: '3.8'\nservices:\n  fleet-node:\n    image: ghcr.io/openclaw/fleet:latest\n    environment:\n      - FLEET_KEY=ent_live_x882_99ac_f221_0b44\n      - SAAS_URL=${window.location.origin}\n      - MODE=on-premise\n    ports:\n      - "8080:8080"`
                                );
                                toast.success('Config copied!');
                              }}
                            >
                              COPY
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="glass-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm font-bold text-white">
                        <Settings2 className="h-4 w-4 text-zinc-400" /> Enterprise Branding
                      </CardTitle>
                      <CardDescription className="mt-1 font-mono text-[10px] text-zinc-500">
                        Configure white-label appearance for your customers.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-2">
                        <Label className="text-[10px] text-zinc-500 uppercase">
                          Dashboard Domain
                        </Label>
                        <Input
                          placeholder="fleet.yourcompany.com"
                          className="h-9 border-white/5 bg-zinc-900 text-xs"
                          value={branding.domain}
                          onChange={(e) => setBranding((p) => ({ ...p, domain: e.target.value }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-[10px] text-zinc-500 uppercase">
                          Organization Name
                        </Label>
                        <Input
                          placeholder="Acme Logistics OS"
                          className="h-9 border-white/5 bg-zinc-900 text-xs"
                          value={branding.name}
                          onChange={(e) => setBranding((p) => ({ ...p, name: e.target.value }))}
                        />
                      </div>
                      <Button
                        className="h-10 w-full rounded-none bg-white text-xs font-bold tracking-widest text-black uppercase hover:bg-zinc-200 disabled:opacity-50"
                        onClick={handleSaveBranding}
                        disabled={savingBranding}
                      >
                        {savingBranding ? 'SAVING...' : 'SAVE BRANDING'}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="general">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-white">Project Identity</CardTitle>
                <CardDescription className="text-xs">
                  General settings for your OpenClaw account.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label className="text-[10px] text-zinc-500 uppercase">User ID</Label>
                  <Input
                    readOnly
                    value={session.user.id}
                    className="h-9 border-white/5 bg-zinc-900 font-mono text-xs"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] text-zinc-500 uppercase">Email</Label>
                  <Input
                    readOnly
                    value={session.user.email}
                    className="h-9 border-white/5 bg-zinc-900 font-mono text-xs"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-none border-white/10 bg-black text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm tracking-widest uppercase italic">
              New Alert Channel
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Configure where your smart alerts should be sent.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label className="text-[10px] text-zinc-500 uppercase">Channel Name</Label>
              <Input
                placeholder="e.g., #production-alerts"
                className="h-9 border-white/5 bg-zinc-900 text-xs"
                value={newChannel.name}
                onChange={(e) => setNewChannel((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] text-zinc-500 uppercase">Type</Label>
              <Select
                value={newChannel.type}
                onValueChange={(v) => setNewChannel((p) => ({ ...p, type: v }))}
              >
                <SelectTrigger className="h-9 border-white/5 bg-zinc-900 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-black">
                  <SelectItem value="slack" className="text-xs">
                    Slack Node
                  </SelectItem>
                  <SelectItem value="discord" className="text-xs">
                    Discord Webhook
                  </SelectItem>
                  <SelectItem value="webhook" className="text-xs">
                    Generic Webhook
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] text-zinc-500 uppercase">Webhook URL</Label>
              <Input
                placeholder="https://hooks.slack.com/services/..."
                className="h-9 border-white/5 bg-zinc-900 text-xs"
                value={newChannel.webhook_url}
                onChange={(e) => setNewChannel((p) => ({ ...p, webhook_url: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="rounded-none border-white/10 text-xs font-bold"
              onClick={() => setAddOpen(false)}
            >
              CANCEL
            </Button>
            <Button
              size="sm"
              className="rounded-none bg-white text-xs font-black text-black uppercase italic hover:bg-zinc-200"
              onClick={handleAddChannel}
            >
              ACTIVATE CHANNEL
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={policyOpen} onOpenChange={setPolicyOpen}>
        <DialogContent className="rounded-none border-white/10 bg-black text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm tracking-widest uppercase italic">
              New Custom Policy
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Define a specialized profile for your enterprise agents.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-[10px] text-zinc-500 uppercase">Policy Code Name</Label>
                <Input
                  placeholder="data-analyst"
                  className="h-9 border-white/5 bg-zinc-900 text-xs"
                  value={newPolicy.name}
                  onChange={(e) => setNewPolicy((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] text-zinc-500 uppercase">Display Label</Label>
                <Input
                  placeholder="Data Analyst"
                  className="h-9 border-white/5 bg-zinc-900 text-xs"
                  value={newPolicy.label}
                  onChange={(e) => setNewPolicy((p) => ({ ...p, label: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] text-zinc-500 uppercase">Description</Label>
              <Input
                placeholder="Specialized in SQL and Python data processing."
                className="h-9 border-white/5 bg-zinc-900 text-xs"
                value={newPolicy.description}
                onChange={(e) => setNewPolicy((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] text-zinc-500 uppercase">
                Skills (comma separated)
              </Label>
              <Input
                placeholder="coding, debugging, research"
                className="h-9 border-white/5 bg-zinc-900 text-xs"
                value={newPolicy.skills}
                onChange={(e) => setNewPolicy((p) => ({ ...p, skills: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] text-zinc-500 uppercase">Tools (comma separated)</Label>
              <Input
                placeholder="terminal, git, vscode"
                className="h-9 border-white/5 bg-zinc-900 text-xs"
                value={newPolicy.tools}
                onChange={(e) => setNewPolicy((p) => ({ ...p, tools: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] text-zinc-500 uppercase">
                Heartbeat Interval (Seconds)
              </Label>
              <Input
                type="number"
                className="h-9 border-white/5 bg-zinc-900 text-xs"
                value={newPolicy.heartbeat_interval}
                onChange={(e) =>
                  setNewPolicy((p) => ({ ...p, heartbeat_interval: parseInt(e.target.value) }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="rounded-none border-white/10 text-xs font-bold"
              onClick={() => setPolicyOpen(false)}
            >
              CANCEL
            </Button>
            <Button
              size="sm"
              className="rounded-none bg-white text-xs font-black text-black uppercase italic hover:bg-zinc-200"
              onClick={handleAddPolicy}
            >
              CREATE POLICY
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Renders the Smart Alerts Card component for managing alert configurations.
 *
 * This component fetches alert configurations and channels from the API, manages the state for loading, adding new configurations, and displays the current alerts. It utilizes the loadAlertData function to load data asynchronously and handles user interactions for adding new alert configurations. The component also provides a dialog for configuring new alerts with specific thresholds.
 *
 * @param {Object} props - The properties for the SmartAlertsCard component.
 * @param {Object} props.agent - The agent object containing agent details.
 * @param {Function} props.api - The API function for making requests.
 * @returns {JSX.Element} The rendered Smart Alerts Card component.
 */
function SmartAlertsCard({ agent, api }) {
  const [configs, setConfigs] = useState([]);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingConfig, setAddingConfig] = useState(false);
  const [newConfig, setNewConfig] = useState({
    channel_id: '',
    cpu_threshold: 90,
    mem_threshold: 90,
    latency_threshold: 1000,
  });

  const loadAlertData = useCallback(async () => {
    try {
      const [confRes, chanRes] = await Promise.all([
        api(`/api/alert-configs?agent_id=${agent.id}`),
        api('/api/alert-channels'),
      ]);
      setConfigs(confRes.configs || []);
      setChannels(chanRes.channels || []);
    } catch (err) {
      toast.error('Failed to load alert configuration');
      console.error('Failed to load alert data:', err);
    } finally {
      setLoading(false);
    }
  }, [api, agent.id]);

  useEffect(() => {
    loadAlertData();
  }, [loadAlertData]);

  /**
   * Handles the addition of a new alert configuration.
   *
   * This function checks if a channel ID is selected; if not, it displays an error message.
   * If a channel ID is present, it sends a POST request to the API to create a new alert configuration
   * using the provided `newConfig` and the current agent's ID. Upon success, it shows a success message,
   * updates the state to stop adding the configuration, and reloads the alert data.
   * In case of an error during the API call, it displays the error message.
   */
  const handleAddConfig = async () => {
    if (!newConfig.channel_id) return toast.error('Select a channel');
    try {
      await api('/api/alert-configs', {
        method: 'POST',
        body: JSON.stringify({ ...newConfig, agent_id: agent.id }),
      });
      toast.success('Alert configured!');
      setAddingConfig(false);
      loadAlertData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="border-b border-white/5 bg-white/2 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-emerald-400" />
            <CardTitle className="font-mono text-xs tracking-widest text-zinc-400 uppercase">
              Smart Alerts
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setAddingConfig(true)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-0 pt-4">
        {loading ? (
          <div className="text-muted-foreground p-4 text-center text-xs">Loading alerts...</div>
        ) : configs.length === 0 ? (
          <div className="space-y-3 p-8 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5">
              <AlertTriangle className="h-5 w-5 text-zinc-600" />
            </div>
            <div>
              <p className="text-xs font-bold tracking-tight text-white uppercase">
                No alerts active
              </p>
              <p className="mt-1 text-[10px] text-zinc-500">
                Get notified via Slack or email when thresholds are exceeded.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 border-white/10 text-[10px] font-bold hover:bg-white/5"
              onClick={() => setAddingConfig(true)}
            >
              CONFIGURE ALERTS
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {configs.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-3 transition-colors hover:bg-white/2"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-sm border border-emerald-500/20 bg-emerald-500/10">
                    {c.channel?.type === 'slack' ? (
                      <Slack className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Webhook className="h-3.5 w-3.5 text-emerald-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-white">{c.channel?.name}</p>
                    <p className="font-mono text-[9px] text-zinc-500 uppercase">
                      CPU &gt; {c.cpu_threshold}% • LAT &gt; {c.latency_threshold}ms
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="border-white/10 bg-emerald-400/5 font-mono text-[9px] text-emerald-400"
                >
                  ACTIVE
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={addingConfig} onOpenChange={setAddingConfig}>
        <DialogContent className="border-white/10 bg-black text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm tracking-widest uppercase">
              New Smart Alert
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Route threshold alerts to a notification channel.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label className="text-[10px] text-zinc-500 uppercase">Channel</Label>
              <Select
                value={newConfig.channel_id}
                onValueChange={(v) => setNewConfig((p) => ({ ...p, channel_id: v }))}
              >
                <SelectTrigger className="h-9 border-white/5 bg-zinc-900 text-xs">
                  <SelectValue placeholder="Select Channel" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-black">
                  {channels.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name} ({c.type.toUpperCase()})
                    </SelectItem>
                  ))}
                  {channels.length === 0 && (
                    <p className="p-2 text-[10px] text-zinc-500">
                      No channels configured. Go to Settings.
                    </p>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-[10px] text-zinc-500 uppercase">CPU Threshold (%)</Label>
                <Input
                  type="number"
                  className="h-9 border-white/5 bg-zinc-900 text-xs"
                  value={newConfig.cpu_threshold}
                  onChange={(e) =>
                    setNewConfig((p) => ({ ...p, cpu_threshold: parseInt(e.target.value) }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] text-zinc-500 uppercase">
                  Latency Threshold (ms)
                </Label>
                <Input
                  type="number"
                  className="h-9 border-white/5 bg-zinc-900 text-xs"
                  value={newConfig.latency_threshold}
                  onChange={(e) =>
                    setNewConfig((p) => ({ ...p, latency_threshold: parseInt(e.target.value) }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="border-white/10 text-xs"
              onClick={() => setAddingConfig(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-emerald-500 text-xs font-bold text-black hover:bg-emerald-600"
              onClick={handleAddConfig}
            >
              ACTIVATE ALERT
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ============ MASTER KEY MODAL ============
/**
 * Renders a modal for entering a master key to decrypt configurations.
 * @param {Object} props - The component props.
 * @param {Function} props.onSetKey - Callback to set the master key.
 */
function MasterKeyModal({ onSetKey }) {
  const [passphrase, setPassphrase] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    /**
     * Opens the modal.
     */
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-master-key-modal', handleOpen);

    const saved = sessionStorage.getItem('master_passphrase');
    if (!saved) setIsOpen(true);
    else onSetKey(saved);

    return () => window.removeEventListener('open-master-key-modal', handleOpen);
  }, [onSetKey]);

  /**
   * Handles the save action for the master passphrase.
   */
  const handleSave = (e) => {
    e.preventDefault();
    if (passphrase.length < 8) return toast.error('Key must be at least 8 characters');
    sessionStorage.setItem('master_passphrase', passphrase);
    onSetKey(passphrase);
    setIsOpen(false);
    toast.success('Master Key active (Session only)');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="rounded-none border-white/20 bg-black text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight uppercase italic">
            <Shield className="h-5 w-5 text-emerald-400" /> E2EE Master Key Required
          </DialogTitle>
          <DialogDescription className="mt-2 font-mono text-xs tracking-widest text-zinc-500 uppercase">
            Your fleet configurations are end-to-end encrypted. Enter your master key to decrypt
            them.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-[10px] text-zinc-500 uppercase">Master Passphrase</Label>
            <Input
              type="password"
              placeholder="••••••••••••••••"
              className="h-11 rounded-none border-white/10 bg-zinc-900"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              required
            />
          </div>
          <p className="border border-white/5 bg-white/5 p-3 font-mono text-[9px] leading-relaxed text-zinc-600">
            NOTICE: THIS KEY IS NEVER SENT TO THE SERVER. IT IS STORED ONLY IN YOUR BROWSER'S
            VOLATILE MEMORY. IF YOU FORGET THIS KEY, ENCRYPTED CONFIGURATIONS CANNOT BE RECOVERED.
          </p>
          <Button
            type="submit"
            className="h-11 w-full rounded-none bg-white font-bold tracking-widest text-black uppercase hover:bg-zinc-200"
          >
            UNLOCK CONFIGURATIONS
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Main application component that manages user sessions and routing.
 *
 * This component utilizes hooks to manage authentication state and loading status. It fetches user session data from Supabase and updates the UI based on the current view and session state. The component also handles API requests for branding and subscription details, conditionally rendering different views based on the user's authentication status and selected route.
 *
 * @returns A JSX element representing the application UI.
 */
export default function App() {
  const { view, params, navigate } = useHashRouter();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [masterPassphrase, setMasterPassphrase] = useState(null);
  const [branding, setBranding] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const api = useCallback(
    async (url, options = {}) => {
      const headers = {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      };
      const res = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      return data;
    },
    [session]
  );

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
      setBranding(null);
    }
  }, [session, api]);

  if (loading) return <LoadingScreen />;
  if (['dashboard', 'agent-detail', 'settings'].includes(view) && !session) {
    if (typeof window !== 'undefined') window.location.hash = '/login';
    return <LoadingScreen />;
  }

  return (
    <div className="bg-background min-h-screen">
      <Toaster richColors position="top-right" theme="dark" />
      {session && ['dashboard', 'agent-detail', 'settings'].includes(view) && (
        <MasterKeyModal onSetKey={setMasterPassphrase} />
      )}

      {view === 'landing' && (
        <LandingView navigate={navigate} session={session} branding={branding} />
      )}
      {view === 'login' && <LoginView navigate={navigate} session={session} branding={branding} />}
      {view === 'register' && (
        <RegisterView navigate={navigate} session={session} branding={branding} />
      )}
      {view === 'dashboard' && (
        <DashboardView
          navigate={navigate}
          session={session}
          api={api}
          masterPassphrase={masterPassphrase}
          branding={branding}
        />
      )}
      {view === 'agent-detail' && (
        <AgentDetailView
          navigate={navigate}
          session={session}
          api={api}
          agentId={params.id}
          masterPassphrase={masterPassphrase}
          branding={branding}
        />
      )}
      {view === 'settings' && (
        <SettingsView
          navigate={navigate}
          session={session}
          api={api}
          branding={branding}
          setGlobalBranding={setBranding}
        />
      )}
      {view === 'changelog' && (
        <ChangelogView navigate={navigate} session={session} branding={branding} />
      )}
      {view === 'pricing' && (
        <PricingView navigate={navigate} session={session} branding={branding} />
      )}
    </div>
  );
}

// ============ NAVBAR ============
// ============ NAVBAR ============
/**
 * Renders a responsive navigation bar with authentication options.
 *
 * The Navbar component displays branding, navigation links, and authentication buttons based on the user's session state.
 * It includes a mobile menu toggle and handles logout functionality through the `handleLogout` function, which signs out the user and navigates to the home page.
 * The layout adapts for mobile and desktop views, ensuring a seamless user experience.
 *
 * @param {Object} props - The properties for the Navbar component.
 * @param {Function} props.navigate - Function to navigate to different routes.
 * @param {Object} props.session - The current user session object.
 * @param {Object} props.branding - Branding information for the application.
 * @param {boolean} [props.transparent=false] - Indicates if the navbar should be transparent.
 */
function Navbar({ navigate, session, branding, transparent = false }) {
  const [open, setOpen] = useState(false);
  /**
   * Logs out the user and navigates to the home page.
   */
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <nav className="fixed top-0 right-0 left-0 z-50 border-b border-white bg-black">
      <div className="container mx-auto grid h-16 grid-cols-2 md:grid-cols-12">
        {/* Logo Section */}
        <div className="col-span-1 flex items-center border-r border-white/20 px-4 md:col-span-3 md:px-6">
          <div
            className="group flex cursor-pointer items-center gap-2"
            onClick={() => navigate('/')}
          >
            <div className="flex h-5 w-5 items-center justify-center bg-white transition-transform group-hover:rotate-180">
              <Zap className="h-3 w-3 fill-black text-black" />
            </div>
            {branding?.name ? (
              <span className="font-mono text-lg font-bold tracking-tighter text-white uppercase italic">
                {branding.name}
              </span>
            ) : (
              <span className="font-mono text-lg font-bold tracking-tighter text-white">
                FLEET<span className="text-zinc-500">//</span>OS
              </span>
            )}
          </div>
        </div>

        {/* Center / Spacer */}
        <div className="col-span-5 hidden items-center border-r border-white/20 px-6 md:flex">
          <div className="flex gap-6 font-mono text-xs tracking-widest text-zinc-500 uppercase">
            {session && (
              <button
                onClick={() => navigate('/settings')}
                className="transition-colors hover:text-white"
              >
                SETTINGS
              </button>
            )}
            <button
              onClick={() => navigate('/changelog')}
              className="transition-colors hover:text-white"
            >
              CHANGELOG
            </button>
            <button
              onClick={() => navigate('/pricing')}
              className="transition-colors hover:text-white"
            >
              PRICING
            </button>
            <button
              onClick={() => window.open('https://github.com/alexgutscher26/fleet', '_blank')}
              className="transition-colors hover:text-white"
            >
              GITHUB
            </button>
          </div>
        </div>

        {/* Auth Actions */}
        <div className="col-span-1 flex items-center justify-end md:col-span-4">
          {session ? (
            <div className="flex h-full w-full">
              <button
                onClick={() => navigate('/dashboard')}
                className="h-full flex-1 border-r border-white/20 text-xs font-bold uppercase transition-colors hover:bg-white hover:text-black"
              >
                CONSOLE
              </button>
              <button
                onClick={handleLogout}
                className="h-full w-24 text-xs font-bold text-red-500 uppercase transition-colors hover:bg-red-500 hover:text-black"
              >
                LOGOUT
              </button>
            </div>
          ) : (
            <div className="flex h-full w-full">
              <button
                onClick={() => navigate('/login')}
                className="h-full flex-1 border-r border-white/20 text-xs text-white uppercase transition-colors hover:bg-white/10"
              >
                LOGIN
              </button>
              <button
                onClick={() => navigate('/register')}
                className="h-full flex-1 bg-white text-xs font-bold text-black uppercase transition-colors hover:bg-zinc-200"
              >
                GET KEY
              </button>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            className="flex h-full w-16 items-center justify-center border-l border-white/20 text-white md:hidden"
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="border-b border-white bg-black p-0 md:hidden">
          <button
            onClick={() => {
              navigate('/pricing');
              setOpen(false);
            }}
            className="block w-full border-b border-white/10 p-4 text-left font-mono text-xs text-white uppercase hover:bg-white/10"
          >
            PRICING
          </button>
          {session ? (
            <>
              <button
                onClick={() => {
                  navigate('/dashboard');
                  setOpen(false);
                }}
                className="block w-full border-b border-white/10 p-4 text-left font-mono text-xs text-white uppercase hover:bg-white/10"
              >
                CONSOLE
              </button>
              <button
                onClick={() => {
                  handleLogout();
                  setOpen(false);
                }}
                className="block w-full p-4 text-left font-mono text-xs text-red-500 uppercase hover:bg-red-500 hover:text-black"
              >
                LOGOUT
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  navigate('/login');
                  setOpen(false);
                }}
                className="block w-full border-b border-white/10 p-4 text-left font-mono text-xs text-white uppercase hover:bg-white/10"
              >
                LOGIN
              </button>
              <button
                onClick={() => {
                  navigate('/register');
                  setOpen(false);
                }}
                className="block w-full bg-white p-4 text-left text-xs font-bold text-black uppercase"
              >
                GET KEY
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}

// ============ LANDING ============
// ============ TERMINAL MOCK ============
/**
 * Renders a mock terminal interface that simulates command execution and displays metrics.
 *
 * The TerminalMock component maintains state for visible lines, metrics visibility, and CPU/MEM widths.
 * It executes a sequence of simulated terminal commands with specified delays, updating the visible lines
 * accordingly. Once the sequence is complete, it displays metrics and initiates an oscillation effect for
 * CPU and memory usage.
 */
function TerminalMock() {
  const [visibleLines, setVisibleLines] = useState([]);
  const [showMetrics, setShowMetrics] = useState(false);
  const [cpuWidth, setCpuWidth] = useState(0);
  const [memWidth, setMemWidth] = useState(0);

  const sequence = [
    {
      type: 'line',
      content: (
        <>
          <span className="text-emerald-500">user@fleet:~$</span> curl -sL https://fleet.sh/install
          | bash
        </>
      ),
      delay: 500,
    },
    {
      type: 'line',
      content: (
        <span className="font-mono text-zinc-500">[INFO] Downloading Fleet Agent v2.0...</span>
      ),
      delay: 1000,
    },
    {
      type: 'line',
      content: <span className="font-mono text-zinc-500">[INFO] Verifying checksums...</span>,
      delay: 800,
    },
    {
      type: 'line',
      content: <span className="font-mono text-zinc-500">[INFO] Expanding package...</span>,
      delay: 600,
    },
    {
      type: 'line',
      content: (
        <>
          <span className="mr-2 font-bold text-emerald-500">➜</span>{' '}
          <span className="font-bold text-white">Agent node initialized.</span>
        </>
      ),
      delay: 800,
    },
    {
      type: 'line',
      content: (
        <>
          <span className="mr-2 font-bold text-emerald-500">➜</span>{' '}
          <span className="font-bold text-white">Connected to gateway: 192.168.1.40</span>
        </>
      ),
      delay: 600,
    },
    {
      type: 'line',
      content: (
        <>
          <span className="mr-2 font-bold text-emerald-500">➜</span>{' '}
          <span className="font-bold text-white">Status: </span>
          <span className="ml-1 bg-white px-2 py-0.5 text-[10px] font-black text-black">
            ONLINE
          </span>
        </>
      ),
      delay: 800,
    },
  ];

  useEffect(() => {
    let timeoutId;
    /**
     * Executes a sequence of actions with delays, updating visibility and metrics.
     */
    const runSequence = async () => {
      for (let i = 0; i < sequence.length; i++) {
        await new Promise((resolve) => (timeoutId = setTimeout(resolve, sequence[i].delay)));
        setVisibleLines((prev) => [...prev, sequence[i].content]);
      }
      setShowMetrics(true);
      setTimeout(() => {
        setCpuWidth(45);
        setMemWidth(62);
      }, 500);
    };
    runSequence();
    return () => clearTimeout(timeoutId);
  }, []);

  // CPU/MEM oscillation effect
  useEffect(() => {
    if (!showMetrics) return;
    const interval = setInterval(() => {
      setCpuWidth((prev) => {
        const delta = (Math.random() - 0.5) * 4;
        return Math.min(Math.max(prev + delta, 40), 50);
      });
      setMemWidth((prev) => {
        const delta = (Math.random() - 0.5) * 2;
        return Math.min(Math.max(prev + delta, 60), 65);
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [showMetrics]);

  return (
    <div className="relative min-h-[400px] flex-1 overflow-hidden border border-white/10 bg-black p-6 pt-12 font-mono text-xs leading-relaxed md:text-sm">
      {/* Terminal Header */}
      <div className="absolute top-0 left-0 flex h-10 w-full items-center border-b border-white/10 bg-zinc-900/40 px-4">
        <div className="group flex gap-2">
          <div className="flex h-3 w-3 cursor-pointer items-center justify-center rounded-full border border-black/20 bg-red-500/80 transition-all hover:scale-110 active:scale-95">
            <span className="hidden text-[8px] font-bold text-black group-hover:block">×</span>
          </div>
          <div className="flex h-3 w-3 cursor-pointer items-center justify-center rounded-full border border-black/20 bg-yellow-500/80 transition-all hover:scale-110 active:scale-95">
            <span className="hidden text-[8px] font-bold text-black group-hover:block">−</span>
          </div>
          <div className="flex h-3 w-3 cursor-pointer items-center justify-center rounded-full border border-black/20 bg-emerald-500/80 transition-all hover:scale-110 active:scale-95">
            <span className="hidden text-[8px] font-bold text-black group-hover:block">+</span>
          </div>
        </div>
        <span className="ml-auto font-mono text-[10px] tracking-widest text-zinc-500 uppercase opacity-50">
          bash - 80x24
        </span>
      </div>

      {/* Terminal Content */}
      <div className="mt-4 space-y-2">
        {visibleLines.map((line, i) => (
          <div
            key={i}
            className="animate-in fade-in slide-in-from-left-2 fill-mode-both duration-500"
          >
            {line}
          </div>
        ))}

        {showMetrics && (
          <div className="animate-in fade-in duration-1000">
            <div className="my-8 h-px bg-white/5" />
            <div className="grid grid-cols-2 gap-10">
              <div className="space-y-2">
                <p className="text-[10px] font-bold tracking-[0.2em] text-zinc-500">CPU LOAD</p>
                <div className="relative h-1 w-full bg-zinc-900">
                  <div
                    className="absolute top-0 left-0 h-full bg-white transition-all duration-2000 ease-in-out"
                    style={{ width: `${cpuWidth}%` }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-bold tracking-[0.2em] text-zinc-500">MEMORY</p>
                <div className="relative h-1 w-full bg-zinc-900">
                  <div
                    className="absolute top-0 left-0 h-full bg-white transition-all duration-2000 ease-in-out"
                    style={{ width: `${memWidth}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Blinking Cursor */}
      <div className="absolute right-6 bottom-6 animate-pulse font-bold text-white">_</div>

      {/* CRT Scanline Effect (Subtle) */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-size-[100%_2px,3px_100%]" />
    </div>
  );
}

// ============ LANDING ============
/**
 * Renders the landing view of the application.
 * @param {Object} props - The component props.
 * @param {Function} props.navigate - Function to navigate to different routes.
 * @param {Object} props.session - User session information.
 * @param {Object} props.branding - Branding information for the application.
 */
function LandingView({ navigate, session, branding }) {
  const features = [
    // ... (features)
  ];

  return (
    <div className="flex min-h-screen flex-col bg-black font-mono text-white selection:bg-white selection:text-black">
      <div className="scanline" />

      {/* Top Bar Navigation - Grid Style */}
      <nav className="z-50 border-b border-white bg-black">
        <div className="container mx-auto grid h-14 grid-cols-2 md:h-16 md:grid-cols-12">
          <div className="col-span-1 flex items-center border-r border-white/20 px-4 md:col-span-3 md:px-6">
            <div
              className="group flex cursor-pointer items-center gap-2"
              onClick={() => navigate('/')}
            >
              <div className="flex h-5 w-5 items-center justify-center bg-white transition-transform group-hover:rotate-180">
                <Zap className="h-3 w-3 fill-black text-black" />
              </div>
              {branding?.name ? (
                <span className="text-lg font-bold tracking-tighter uppercase italic">
                  {branding.name}
                </span>
              ) : (
                <span className="text-lg font-bold tracking-tighter">
                  FLEET<span className="text-zinc-500">//</span>OS
                </span>
              )}
            </div>
          </div>

          <div className="col-span-6 hidden items-center justify-center border-r border-white/20 md:flex">
            <span className="animate-pulse text-xs tracking-widest text-zinc-500 uppercase">
              System Status: 100% Operational
            </span>
          </div>

          <div className="col-span-1 flex items-center justify-end px-4 md:col-span-3 md:px-0">
            {session ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="flex h-full w-full items-center justify-center gap-2 text-sm font-bold uppercase transition-colors hover:bg-white hover:text-black"
              >
                Enter Console <ArrowLeft className="h-4 w-4 rotate-180" />
              </button>
            ) : (
              <div className="grid h-full w-full grid-cols-2">
                <button
                  onClick={() => navigate('/login')}
                  className="h-full border-r border-white/20 text-xs uppercase transition-colors hover:bg-white/10"
                >
                  Login
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="h-full bg-white text-xs font-bold text-black uppercase transition-colors hover:bg-zinc-200"
                >
                  Get Key
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Grid */}
      <main className="container mx-auto flex-1 border-x border-white/20">
        {/* Hero Section */}
        <section className="grid min-h-[70vh] grid-cols-1 border-b border-white mix-blend-screen lg:grid-cols-2">
          {/* Left Column: Typography */}
          <div className="group relative flex flex-col justify-between overflow-hidden border-b border-white/20 p-8 md:p-12 lg:border-r lg:border-b-0 lg:p-20">
            <div className="grid-bg pointer-events-none absolute inset-0 opacity-20" />

            <div className="relative z-10">
              <Badge
                variant="outline"
                className="mb-6 inline-flex items-center gap-2 rounded-none border-white px-2 py-1 font-mono text-[10px] tracking-widest text-white uppercase"
              >
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> v2.0.4 Released
              </Badge>
              <h1 className="mb-8 text-6xl leading-[0.8] font-black tracking-tighter sm:text-7xl md:text-8xl lg:text-[7rem]">
                COMMAND
                <br />
                YOUR
                <br />
                <span
                  className="stroke-text text-transparent"
                  style={{ WebkitTextStroke: '2px white' }}
                >
                  SWARM
                </span>
              </h1>
              <p className="max-w-md font-mono text-base leading-relaxed tracking-wide text-zinc-400 uppercase sm:text-lg">
                The minimal orchestration layer for self-hosted AI fleets. Zero latency. Total
                visibility.
              </p>
            </div>

            <div className="relative z-10 mt-12">
              <div className="flex flex-col gap-4 sm:flex-row">
                <Button
                  size="lg"
                  className="h-14 rounded-none border border-white bg-white px-8 text-base font-bold text-black hover:bg-zinc-200"
                  onClick={() => navigate('/register')}
                >
                  INITIALIZE FLEET
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 rounded-none border-white/20 px-8 font-mono text-sm text-zinc-400 hover:border-white hover:text-white"
                  onClick={() => navigate('/pricing')}
                >
                  VIEW PROTOCOLS
                </Button>
              </div>
            </div>
          </div>

          {/* Right Column: Visual/Terminal */}
          <div className="flex flex-col justify-center border-white/0 bg-zinc-950 p-8 md:border-l md:p-12 lg:min-h-[600px]">
            <TerminalMock />
          </div>
        </section>

        {/* Ticker Tape */}
        <div className="overflow-hidden border-b border-white/20 bg-white py-3 text-black">
          <div className="animate-marquee flex gap-12 font-mono text-sm font-bold tracking-widest whitespace-nowrap uppercase">
            <span>/// SYSTEM READY</span>
            <span>/// 99.99% UPTIME</span>
            <span>/// GLOBAL LATENCY &lt; 50MS</span>
            <span>/// END-TO-END ENCRYPTION</span>
            <span>/// OPEN SOURCE CORE</span>
            <span>/// SCALABLE ARCHITECTURE</span>
            <span>/// SYSTEM READY</span>
            <span>/// 99.99% UPTIME</span>
            <span>/// GLOBAL LATENCY &lt; 50MS</span>
            <span>/// END-TO-END ENCRYPTION</span>
          </div>
        </div>

        {/* Features Grid */}
        <section className="grid grid-cols-1 divide-y divide-white/20 border-b border-white/20 md:grid-cols-3 md:divide-x md:divide-y-0">
          {features.slice(0, 3).map((f, i) => (
            <div
              key={i}
              className="group cursor-default p-8 transition-colors hover:bg-white hover:text-black sm:p-12"
            >
              <f.icon className="mb-6 h-8 w-8 text-zinc-500 transition-colors group-hover:text-black" />
              <h3 className="mb-4 text-xl font-bold tracking-tight uppercase">{f.title}</h3>
              <p className="font-mono text-sm leading-relaxed text-zinc-500 group-hover:text-zinc-600">
                {f.desc}
              </p>
            </div>
          ))}
        </section>
        <section className="grid grid-cols-1 divide-y divide-white/20 border-b border-white/20 md:grid-cols-3 md:divide-x md:divide-y-0">
          {features.slice(3, 6).map((f, i) => (
            <div
              key={i}
              className="group cursor-default p-8 transition-colors hover:bg-white hover:text-black sm:p-12"
            >
              <f.icon className="mb-6 h-8 w-8 text-zinc-500 transition-colors group-hover:text-black" />
              <h3 className="mb-4 text-xl font-bold tracking-tight uppercase">{f.title}</h3>
              <p className="font-mono text-sm leading-relaxed text-zinc-500 group-hover:text-zinc-600">
                {f.desc}
              </p>
            </div>
          ))}
        </section>

        {/* Footer */}
        <footer className="flex flex-col items-end justify-between gap-8 p-8 font-mono text-xs text-zinc-600 uppercase sm:p-12 md:flex-row">
          <div className="flex flex-col gap-4">
            <div className="flex h-8 w-8 items-center justify-center border border-white/10 bg-zinc-900">
              <Zap className="h-4 w-4 text-zinc-500" />
            </div>
            <p className="max-w-xs leading-relaxed">
              OpenClaw Fleet Orchestrator.
              <br />
              Built for the next generation of
              <br />
              autonomous agent swarms.
            </p>
          </div>
          <div className="text-right">
            <p>&copy; 2026 OPENCLAW SYSTEMS INC.</p>
            <div className="mt-2 flex justify-end gap-4 text-zinc-400">
              <a href="https://github.com/alexgutscher26/fleet" className="hover:text-white">
                GITHUB
              </a>
              <a href="/docs" className="hover:text-white">
                DOCS
              </a>
            </div>
          </div>
        </footer>
      </main>

      <style jsx global>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
      `}</style>
    </div>
  );
}

// ============ LOGIN ============
/**
 * Renders the login view for user authentication.
 *
 * This component manages the login process through both direct email/password and enterprise SSO methods.
 * It utilizes state hooks to handle form inputs and loading states, and effects to navigate to the dashboard upon session validation.
 * The login and SSO functions handle authentication with error handling and user feedback via toast notifications.
 *
 * @param {Object} props - The component props.
 * @param {function} props.navigate - Function to navigate to different routes.
 * @param {Object} props.session - The current user session object.
 */
function LoginView({ navigate, session }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ssoDomain, setSsoDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState('direct');

  useEffect(() => {
    if (session) navigate('/dashboard');
  }, [session, navigate]);

  /**
   * Handles user login by processing the login form submission.
   *
   * This function prevents the default form submission behavior and sets a loading state.
   * It attempts to sign in the user using Supabase's authentication with the provided email
   * and password. If the sign-in is successful, a success message is displayed and the user
   * is navigated to the dashboard. In case of an error, an error message is shown. The loading
   * state is reset in the finally block.
   *
   * @param {Event} e - The event object from the form submission.
   */
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles the Single Sign-On (SSO) authentication process.
   *
   * This function prevents the default form submission, checks for a valid SSO domain, and initiates the sign-in process using Supabase.
   * If an error occurs during the sign-in, it displays an error message. Finally, it manages the loading state throughout the process.
   *
   * @param e - The event object from the form submission.
   * @returns void
   */
  const handleSSO = async (e) => {
    e.preventDefault();
    if (!ssoDomain) {
      toast.error('Enter your enterprise domain');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithSSO({
        domain: ssoDomain.trim(),
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black p-6">
      <div className="grid-bg absolute inset-0 opacity-20" />
      <Card className="relative z-10 w-full max-w-md overflow-hidden rounded-none border border-white/20 bg-black">
        <div className="h-1 bg-white" />
        <CardHeader className="pb-2 text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center bg-white">
              <Zap className="h-6 w-6 fill-black text-black" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">
            SYSTEM ACCESS
          </CardTitle>
          <CardDescription className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
            Identify Yourself to console
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={authMode} onValueChange={setAuthMode} className="mb-6 w-full">
            <TabsList className="grid h-10 grid-cols-2 rounded-none border border-white/10 bg-zinc-900 p-1">
              <TabsTrigger
                value="direct"
                className="rounded-none font-mono text-[10px] tracking-wider uppercase data-[state=active]:bg-white data-[state=active]:text-black"
              >
                DIRECT OPS
              </TabsTrigger>
              <TabsTrigger
                value="enterprise"
                className="rounded-none font-mono text-[10px] tracking-wider uppercase data-[state=active]:bg-white data-[state=active]:text-black"
              >
                ENTERPRISE SSO
              </TabsTrigger>
            </TabsList>

            <TabsContent value="direct">
              <form onSubmit={handleLogin} className="space-y-6 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-mono text-[10px] text-zinc-400 uppercase">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    className="h-10 rounded-none border-white/10 bg-zinc-900 text-white focus:border-white/40 focus:ring-0"
                    placeholder="USER@EXAMPLE.COM"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="font-mono text-[10px] text-zinc-400 uppercase"
                  >
                    Security Key
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    className="h-10 rounded-none border-white/10 bg-zinc-900 text-white focus:border-white/40 focus:ring-0"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="h-11 w-full rounded-none bg-white text-xs font-bold tracking-widest text-black uppercase hover:bg-zinc-200"
                  disabled={loading}
                >
                  {loading ? 'VERIFYING...' : 'INITIATE LOGIN'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="enterprise">
              <div className="space-y-4 pt-2">
                <div className="border border-white/10 bg-zinc-900 p-3">
                  <p className="font-mono text-[10px] leading-relaxed text-zinc-400 uppercase">
                    Accessing as an organization? Redirect to your identity provider via SAML 2.0.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="sso-domain"
                    className="font-mono text-[10px] text-zinc-400 uppercase"
                  >
                    Enterprise Domain
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <Input
                      id="sso-domain"
                      type="text"
                      className="h-10 rounded-none border-white/10 bg-zinc-900 pl-10 text-white focus:border-white/40 focus:ring-0"
                      placeholder="ACME.COM"
                      value={ssoDomain}
                      onChange={(e) => setSsoDomain(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSSO}
                  className="h-11 w-full rounded-none border border-white/20 bg-transparent text-xs font-bold tracking-widest text-white uppercase transition-all hover:bg-white hover:text-black"
                  disabled={loading}
                >
                  {loading ? 'REDIRECTING...' : 'SSO AUTHENTICATION'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="mt-2 justify-center border-t border-white/10 pt-4">
          <p className="font-mono text-xs text-zinc-500 italic">
            UNAUTHORIZED ACCESS IS PROHIBITED. IP LOGGED.
          </p>
        </CardFooter>
      </Card>
      <div className="absolute bottom-4 left-4 flex gap-4 font-mono text-[10px] text-zinc-600 uppercase">
        <button onClick={() => navigate('/register')} className="hover:text-white">
          New Operator
        </button>
        <button onClick={() => navigate('/')} className="hover:text-white">
          Terminal Home
        </button>
      </div>
    </div>
  );
}

/**
 * Renders the registration view for new users.
 *
 * This component manages the registration process by capturing user input for email and password.
 * It utilizes the Supabase authentication service to create a new account. Upon successful registration,
 * it navigates the user to the dashboard or prompts them to check their email for confirmation.
 * The component also handles loading states and displays appropriate success or error messages.
 *
 * @param {Object} props - The component props.
 * @param {Function} props.navigate - Function to navigate to different routes.
 * @param {Object} props.session - The current user session object.
 */
function RegisterView({ navigate, session }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) navigate('/dashboard');
  }, [session, navigate]);

  /**
   * Handles user registration by signing up with Supabase.
   *
   * This function prevents the default form submission, sets a loading state, and attempts to sign up a user using the provided email and password.
   * If the sign-up is successful and a session is created, it redirects the user to the dashboard.
   * If the sign-up is successful but no session is created, it prompts the user to check their email for confirmation and redirects to the login page.
   * In case of an error, it displays an error message.
   *
   * @param {Event} e - The event object from the form submission.
   */
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (data.session) {
        toast.success('Account created! Redirecting...');
        navigate('/dashboard');
      } else {
        toast.success('Account created! Check your email to confirm, then sign in.');
        navigate('/login');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black p-6">
      <div className="grid-bg absolute inset-0 opacity-20" />
      <Card className="relative z-10 w-full max-w-md rounded-none border border-white/20 bg-black">
        <CardHeader className="pb-2 text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center bg-white">
              <Zap className="h-6 w-6 fill-black text-black" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">
            NEW OPERATOR
          </CardTitle>
          <CardDescription className="font-mono text-xs tracking-widest text-zinc-500 uppercase">
            Initialize Account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="reg-email" className="font-mono text-xs text-zinc-400 uppercase">
                Email Address
              </Label>
              <Input
                id="reg-email"
                type="email"
                className="h-10 rounded-none border-white/10 bg-zinc-900 text-white focus:border-white/40"
                placeholder="USER@EXAMPLE.COM"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-password" className="font-mono text-xs text-zinc-400 uppercase">
                Password
              </Label>
              <Input
                id="reg-password"
                type="password"
                className="h-10 rounded-none border-white/10 bg-zinc-900 text-white focus:border-white/40"
                placeholder="MIN 6 CHARACTERS"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button
              type="submit"
              className="h-10 w-full rounded-none bg-white font-bold tracking-widest text-black uppercase hover:bg-zinc-200"
              disabled={loading}
            >
              {loading ? 'CREATING PROFILE...' : 'ESTABLISH ACCOUNT'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="mt-2 justify-center border-t border-white/10 pt-4">
          <p className="font-mono text-xs text-zinc-500">
            ALREADY REGISTERED?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-white uppercase hover:underline"
            >
              LOGIN
            </button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

// ============ DASHBOARD ============
/**
 * DashboardView component for managing and monitoring AI agent fleets.
 *
 * This component fetches and displays statistics, fleets, agents, and alerts related to the AI agents. It handles loading data from the API, adding and deleting agents, and resolving alerts. The component also manages the state for various UI elements and provides a dialog for adding new agents with specific configurations based on user input and subscription tier.
 *
 * @param {Object} props - The properties for the DashboardView component.
 * @param {Function} props.navigate - Function to navigate to different routes.
 * @param {Object} props.session - The current user session information.
 * @param {Function} props.api - Function to make API calls.
 * @param {string} props.masterPassphrase - The master passphrase for encryption.
 * @param {Object} props.branding - Branding information for the application.
 * @returns {JSX.Element} The rendered DashboardView component.
 */
function DashboardView({ navigate, session, api, masterPassphrase, branding }) {
  const [stats, setStats] = useState(null);
  const [fleets, setFleets] = useState([]);
  const [agents, setAgents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedFleet, setSelectedFleet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [tier, setTier] = useState('free');
  const [customPolicies, setCustomPolicies] = useState([]);
  const [newAgent, setNewAgent] = useState({ name: '', gateway_url: '', policy_profile: 'dev' });

  useEffect(() => {
    api('/api/billing')
      .then((res) => {
        const p = res.subscription?.plan || 'free';
        setTier(p.toLowerCase());
      })
      .catch(() => {});
  }, [api]);

  useEffect(() => {
    if (tier === 'enterprise' || tier === 'pro') {
      api('/api/custom-policies')
        .then((res) => setCustomPolicies(res.policies || []))
        .catch(() => {});
    }
  }, [api, tier]);

  const loadData = useCallback(async () => {
    try {
      const [statsRes, fleetsRes, alertsRes] = await Promise.all([
        api('/api/dashboard/stats'),
        api('/api/fleets'),
        api('/api/alerts'),
      ]);
      setStats(statsRes.stats);
      setFleets(fleetsRes.fleets);
      setAlerts(alertsRes.alerts);
      if (fleetsRes.fleets.length > 0 && !selectedFleet) {
        setSelectedFleet(fleetsRes.fleets[0].id);
      }
    } catch (err) {
      if (err.message === 'Unauthorized') return;
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [api, selectedFleet]);

  const loadAgents = useCallback(async () => {
    try {
      const url = selectedFleet ? `/api/agents?fleet_id=${selectedFleet}` : '/api/agents';
      const res = await api(url);
      setAgents(res.agents);
    } catch (err) {
      toast.error('Failed to load agents');
      console.error(err);
    }
  }, [api, selectedFleet]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  /**
   * Handles the seeding of demo data.
   *
   * This function sets the seeding state to true, makes a POST request to the API to load demo data,
   * and displays a success message upon completion. If an error occurs, it displays an error message.
   * Finally, it resets the seeding state to false and loads additional data.
   */
  const handleSeedDemo = async () => {
    setSeeding(true);
    try {
      await api('/api/seed-demo', { method: 'POST' });
      toast.success('Demo data loaded!');
      setSelectedFleet(null);
      await loadData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSeeding(false);
    }
  };

  /**
   * Handles the addition of a new agent.
   *
   * This function prevents the default form submission behavior and retrieves the policy configuration based on the provided agent's profile. It prepares the agent's configuration, optionally encrypts it if a master passphrase is provided, and sends a POST request to register the agent. The UI is updated accordingly, and error messages are displayed if any issues occur during the process.
   *
   * @param {Event} e - The event object from the form submission.
   */
  const handleAddAgent = async (e) => {
    e.preventDefault();
    try {
      const policyId = newAgent.policy_profile || 'dev';
      const customPolicy = customPolicies.find((p) => p.name === policyId);
      const policy = getPolicy(policyId, customPolicy);

      let config = {
        profile: policyId,
        skills: policy.skills,
        model: 'claude-sonnet-4',
        data_scope: policyId === 'dev' ? 'full' : 'restricted',
      };

      if (masterPassphrase) {
        config = await encryptE2EE(config, masterPassphrase);
        toast.info('Agent created with E2EE protection');
      }

      await api('/api/agents', {
        method: 'POST',
        body: JSON.stringify({
          ...newAgent,
          fleet_id: selectedFleet,
          config_json: config,
        }),
      });
      toast.success('Agent registered!');
      setAddOpen(false);
      setNewAgent({ name: '', gateway_url: '' });
      loadAgents();
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  /**
   * Prompts the user to confirm deletion of an agent and handles the deletion process.
   */
  const handleDeleteAgent = (id) => {
    toast('Delete this agent?', {
      action: {
        label: 'Confirm',
        onClick: async () => {
          try {
            await api(`/api/agents/${id}`, { method: 'DELETE' });
            toast.success('Agent deleted');
            loadAgents();
            loadData();
          } catch (err) {
            toast.error(err.message);
          }
        },
      },
    });
  };

  /**
   * Resolves an alert by its ID and handles success or error notifications.
   */
  const handleResolveAlert = async (id) => {
    try {
      await api(`/api/alerts/${id}/resolve`, { method: 'POST' });
      toast.success('Alert resolved');
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-emerald-400" />
      </div>
    );

  return (
    <div className="bg-background min-h-screen">
      <Navbar navigate={navigate} session={session} branding={branding} />
      <div className="container mx-auto px-6 pt-20 pb-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Fleet Dashboard</h1>
            <p className="text-muted-foreground text-sm">Monitor and manage your AI agent fleet</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="mr-1 h-4 w-4" />
              Refresh
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Agent
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { label: 'TOTAL AGENTS', value: stats.total_agents, icon: Server },
              { label: 'OPERATIONAL', value: stats.healthy, icon: CheckCircle },
              { label: 'ERRORS', value: stats.error, icon: XCircle },
              {
                label: 'TASKS EXECUTED',
                value: stats.total_tasks?.toLocaleString(),
                icon: BarChart3,
              },
            ].map((s) => (
              <div
                key={s.label}
                className="group flex items-start justify-between border border-white/10 bg-black p-6 transition-colors hover:border-white/30"
              >
                <div>
                  <div className="mb-1 text-3xl font-black tracking-tighter text-white">
                    {s.value}
                  </div>
                  <div className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
                    {s.label}
                  </div>
                </div>
                <s.icon className="h-5 w-5 text-zinc-700 transition-colors group-hover:text-white" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {agents.length === 0 && (
          <Card className="glass-card border-dashed">
            <CardContent className="py-16 text-center">
              <Server className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
              <h3 className="mb-2 text-lg font-semibold">No agents yet</h3>
              <p className="text-muted-foreground mb-6 text-sm">
                Get started by adding your first agent or load demo data to explore.
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setAddOpen(true)}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add Agent
                </Button>
                <Button variant="outline" onClick={handleSeedDemo} disabled={seeding}>
                  <Database className="mr-1 h-4 w-4" />
                  {seeding ? 'Loading...' : 'Load Demo Data'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fleet Selector */}
        {fleets.length > 0 && (
          <div className="mb-4 flex items-center gap-3">
            <span className="text-muted-foreground text-sm">Fleet:</span>
            <Select value={selectedFleet || ''} onValueChange={setSelectedFleet}>
              <SelectTrigger className="h-9 w-[200px]">
                <SelectValue placeholder="Select fleet" />
              </SelectTrigger>
              <SelectContent>
                {fleets.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Agent Table */}
        {agents.length > 0 && (
          <Card className="glass-card mb-8">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Agents ({agents.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-border/40 border-b">
                      <th className="text-muted-foreground p-3 text-left text-xs font-medium">
                        Name
                      </th>
                      <th className="text-muted-foreground p-3 text-left text-xs font-medium">
                        Status
                      </th>
                      <th className="text-muted-foreground hidden p-3 text-left text-xs font-medium md:table-cell">
                        Gateway
                      </th>
                      <th className="text-muted-foreground p-3 text-left text-xs font-medium">
                        Policy
                      </th>
                      <th className="text-muted-foreground hidden p-3 text-left text-xs font-medium md:table-cell">
                        Model
                      </th>
                      <th className="text-muted-foreground hidden p-3 text-left text-xs font-medium lg:table-cell">
                        Location
                      </th>
                      <th className="text-muted-foreground p-3 text-left text-xs font-medium">
                        Heartbeat
                      </th>
                      <th className="text-muted-foreground p-3 text-right text-xs font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map((agent) => {
                      const sc = STATUS_CONFIG[agent.status] || STATUS_CONFIG.offline;
                      return (
                        <tr
                          key={agent.id}
                          className="cursor-pointer border-b border-white/5 transition hover:bg-white/5"
                          onClick={() => navigate(`/agent/${agent.id}`)}
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`h-1.5 w-1.5 rounded-full ${agent.status === 'healthy' ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : agent.status === 'error' ? 'animate-pulse bg-red-500' : 'bg-zinc-600'}`}
                              />
                              <span className="text-sm font-bold tracking-tight">{agent.name}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge
                              variant="outline"
                              className={`${sc.text} ${sc.border} rounded-none bg-transparent font-mono text-[10px] tracking-wider uppercase`}
                            >
                              {sc.label}
                            </Badge>
                          </td>
                          <td className="hidden p-3 font-mono text-xs text-zinc-500 uppercase md:table-cell">
                            {agent.gateway_url}
                          </td>
                          <td className="p-3">
                            <Badge
                              variant="outline"
                              className={`${getPolicy(agent.policy_profile).color} ${getPolicy(agent.policy_profile).bg} border-opacity-50 rounded-none font-mono text-[9px] tracking-tighter`}
                            >
                              {getPolicy(agent.policy_profile).label}
                            </Badge>
                          </td>
                          <td className="hidden p-3 text-sm text-zinc-400 md:table-cell">
                            {agent.model}
                          </td>
                          <td className="hidden p-3 text-sm text-zinc-400 lg:table-cell">
                            {agent.location || 'UNKNOWN'}
                          </td>
                          <td className="p-3 font-mono text-sm text-zinc-500">
                            {timeAgo(agent.last_heartbeat)}
                          </td>
                          <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
                                onClick={() => navigate(`/agent/${agent.id}`)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-zinc-600 hover:bg-transparent hover:text-red-500"
                                onClick={() => handleDeleteAgent(agent.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alerts */}
        {alerts.length > 0 && (
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-center justify-between rounded-lg p-3 ${alert.resolved ? 'bg-muted/20' : 'border border-red-500/20 bg-red-500/5'}`}
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle
                      className={`h-4 w-4 ${alert.resolved ? 'text-muted-foreground' : 'text-red-400'}`}
                    />
                    <div>
                      <p className="text-sm font-medium">
                        {alert.agent_name}: {alert.type}
                      </p>
                      <p className="text-muted-foreground text-xs">{alert.message}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      {timeAgo(alert.created_at)}
                    </span>
                    {!alert.resolved && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleResolveAlert(alert.id)}
                      >
                        Resolve
                      </Button>
                    )}
                    {alert.resolved && (
                      <Badge
                        variant="outline"
                        className="border-emerald-500/30 text-xs text-emerald-400"
                      >
                        Resolved
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Agent Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Register New Agent</DialogTitle>
            <DialogDescription>
              Add an OpenClaw agent to your fleet. Paste the gateway URL or Droplet info.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddAgent} className="space-y-4">
            <div>
              <Label>Agent Name</Label>
              <Input
                placeholder="alpha-coder"
                value={newAgent.name}
                onChange={(e) => setNewAgent((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label>Gateway URL</Label>
              <Input
                placeholder="http://192.168.1.100:8080"
                value={newAgent.gateway_url}
                onChange={(e) => setNewAgent((p) => ({ ...p, gateway_url: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label>Policy Profile</Label>
              <Select
                value={newAgent.policy_profile || 'dev'}
                onValueChange={(v) => setNewAgent((p) => ({ ...p, policy_profile: v }))}
              >
                <SelectTrigger className="h-10 w-full rounded-none border-white/20 bg-zinc-900 text-xs">
                  <SelectValue placeholder="Select Policy" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-black">
                  <SelectItem value="dev" className="text-xs">
                    Developer (Full Access)
                  </SelectItem>
                  <SelectItem value="ops" className="text-xs">
                    Operations (System Only)
                  </SelectItem>
                  <SelectItem value="exec" className="text-xs">
                    Executive (Read Only)
                  </SelectItem>
                  {(tier === 'enterprise' || tier === 'pro') && customPolicies.length > 0 && (
                    <>
                      <Separator className="my-2 bg-white/10" />
                      <div className="px-2 py-1.5 font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
                        Custom Policies
                      </div>
                      {customPolicies.map((cp) => (
                        <SelectItem key={cp.id} value={cp.name} className="text-xs">
                          {cp.label}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                Register Agent
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ AGENT DETAIL ============
/**
 * Renders the agent detail view component.
 *
 * This component fetches and displays detailed information about a specific agent, including its configuration, status, and metrics. It manages loading states, restarts, and configuration saving, while also handling custom policies based on the agent's subscription tier. The component utilizes various hooks to manage state and side effects, ensuring a responsive user interface.
 *
 * @param {Object} props - The component properties.
 * @param {function} props.navigate - Function to navigate to different routes.
 * @param {Object} props.session - The current user session.
 * @param {function} props.api - Function to make API calls.
 * @param {string} props.agentId - The ID of the agent to display.
 * @param {string} props.masterPassphrase - The master passphrase for encryption.
 * @param {Object} props.branding - Branding information for the UI.
 * @returns {JSX.Element|null} The rendered component or null if the agent is not found.
 */
function AgentDetailView({ navigate, session, api, agentId, masterPassphrase, branding }) {
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [restarting, setRestarting] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [tier, setTier] = useState('free');
  const [customPolicies, setCustomPolicies] = useState([]);
  const [configEdit, setConfigEdit] = useState('');

  useEffect(() => {
    api('/api/billing')
      .then((res) => {
        const p = res.subscription?.plan || 'free';
        setTier(p.toLowerCase());
      })
      .catch(() => {});
  }, [api]);

  useEffect(() => {
    if (tier === 'enterprise' || tier === 'pro') {
      api('/api/custom-policies')
        .then((res) => setCustomPolicies(res.policies || []))
        .catch(() => {});
    }
  }, [api, tier]);

  const loadAgent = useCallback(async () => {
    try {
      const res = await api(`/api/agents/${agentId}`);
      let config = res.agent.config_json;

      // E2EE disabled - using server-side encryption instead
      // if (isE2E(config)) {
      //   if (!masterPassphrase) {
      //     toast.info('Enter master key to decrypt config');
      //   } else {
      //     try {
      //       config = await decryptE2EE(config, masterPassphrase);
      //     } catch (e) {
      //       toast.error('Decryption failed. Wrong Master Key?');
      //     }
      //   }
      // }

      setAgent({ ...res.agent, config_json: config });
      setConfigEdit(JSON.stringify(config, null, 2));
    } catch (err) {
      toast.error('Failed to load agent');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [api, agentId, navigate, masterPassphrase]);

  useEffect(() => {
    loadAgent();
  }, [loadAgent]);

  /**
   * Initiates a restart of the agent and manages the loading state.
   */
  const handleRestart = async () => {
    setRestarting(true);
    try {
      await api(`/api/agents/${agentId}/restart`, { method: 'POST' });
      toast.success('Restart initiated');
      loadAgent();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRestarting(false);
    }
  };

  /**
   * Handles the saving of configuration settings.
   *
   * This function sets a saving state and attempts to parse the configuration from `configEdit`.
   * If a master passphrase is provided, it encrypts the configuration using E2EE before sending
   * it to the API for the specified agent. In case of errors, it displays an error message,
   * and finally resets the saving state.
   */
  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const parsed = JSON.parse(configEdit);
      let payload = parsed;

      // Encrypt with E2EE if Master Key is present
      if (masterPassphrase) {
        payload = await encryptE2EE(parsed, masterPassphrase);
        toast.info('Encrypting with Master Key...');
      }

      await api(`/api/agents/${agentId}`, {
        method: 'PUT',
        body: JSON.stringify({ config_json: payload }),
      });
      toast.success('Config saved (E2EE Active)');
      loadAgent();
    } catch (err) {
      toast.error(err.message || 'Invalid JSON');
    } finally {
      setSavingConfig(false);
    }
  };

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-emerald-400" />
      </div>
    );
  if (!agent) return null;

  const sc = STATUS_CONFIG[agent.status] || STATUS_CONFIG.offline;
  const m = agent.metrics_json || {};

  return (
    <div className="bg-background min-h-screen">
      <Navbar navigate={navigate} session={session} branding={branding} />
      <div className="container mx-auto px-6 pt-20 pb-10">
        {/* Back + Header */}
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Dashboard
        </Button>
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className={`h-12 w-12 rounded-xl ${sc.bgLight} flex items-center justify-center`}>
              <Server className={`h-6 w-6 ${sc.text}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{agent.name}</h1>
                <Badge variant="outline" className={`${sc.text} ${sc.border}`}>
                  {sc.label}
                </Badge>
              </div>
              <p className="text-muted-foreground font-mono text-sm">{agent.gateway_url}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`${getPolicy(agent.policy_profile).color} ${getPolicy(agent.policy_profile).bg} rounded-none px-3 py-1 font-mono text-xs`}
            >
              {getPolicy(agent.policy_profile).label} PROFILE
            </Badge>
            <div className="bg-border/40 mx-2 hidden h-8 w-px md:block" />
            <Button variant="outline" size="sm" onClick={handleRestart} disabled={restarting}>
              <RefreshCw className={`mr-1 h-4 w-4 ${restarting ? 'animate-spin' : ''}`} />
              {restarting ? 'Restarting...' : 'Restart'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(agent.id);
                toast.success('Agent ID copied!');
              }}
            >
              <Copy className="mr-1 h-4 w-4" />
              Copy ID
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="setup">Setup</TabsTrigger>
            <TabsTrigger value="config">Config</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="mb-8 grid gap-4 md:grid-cols-3 lg:grid-cols-4">
              {[
                { label: 'LATENCY', value: `${m.latency_ms || 0}ms`, icon: Activity },
                { label: 'COMPLETED', value: m.tasks_completed || 0, icon: CheckCircle },
                { label: 'ERRORS', value: m.errors_count || 0, icon: XCircle },
                { label: 'UPTIME', value: `${m.uptime_hours || 0}h`, icon: Clock },
                { label: 'COST', value: `$${(m.cost_usd || 0).toFixed(2)}`, icon: DollarSign },
                { label: 'CPU', value: `${m.cpu_usage || 0}%`, icon: Cpu },
                { label: 'MEMORY', value: `${m.memory_usage || 0}%`, icon: HardDrive },
                { label: 'LAST SEEN', value: timeAgo(agent.last_heartbeat), icon: Wifi },
              ].map((s) => (
                <div
                  key={s.label}
                  className="border border-white/10 bg-black p-4 transition-colors hover:border-white/30"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
                      {s.label}
                    </span>
                    <s.icon className="h-3 w-3 text-zinc-600" />
                  </div>
                  <p className="text-xl font-bold tracking-tight text-white">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="glass-card shadow-[0_0_20px_rgba(255,255,255,0.02)]">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="font-mono text-xs tracking-widest text-zinc-400 uppercase">
                    Policy Enforcer
                  </CardTitle>
                  <Shield className="h-4 w-4 text-white/40" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-sm border border-white/10 bg-white/5 p-3">
                    <p className="text-muted-foreground mb-3 text-[10px] leading-relaxed">
                      {
                        getPolicy(
                          agent.policy_profile,
                          customPolicies.find((cp) => cp.name === agent.policy_profile)
                        ).description
                      }
                    </p>
                    <Select
                      value={agent.policy_profile}
                      onValueChange={async (v) => {
                        try {
                          const customPolicy = customPolicies.find((cp) => cp.name === v);
                          const policy = getPolicy(v, customPolicy);
                          const newConfig = {
                            ...agent.config_json,
                            profile: v,
                            skills: policy.skills,
                            data_scope: v === 'dev' ? 'full' : v === 'ops' ? 'system' : 'read-only',
                          };
                          await api(`/api/agents/${agent.id}`, {
                            method: 'PUT',
                            body: JSON.stringify({
                              policy_profile: v,
                              config_json: newConfig,
                            }),
                          });
                          setAgent((p) => ({ ...p, policy_profile: v, config_json: newConfig }));
                          toast.success(`Policy updated to ${v}`);
                        } catch (err) {
                          toast.error(err.message);
                        }
                      }}
                    >
                      <SelectTrigger className="h-9 w-full rounded-none border-white/10 bg-black text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-white/10 bg-black">
                        <SelectItem value="dev" className="text-xs">
                          Developer
                        </SelectItem>
                        <SelectItem value="ops" className="text-xs">
                          Operations
                        </SelectItem>
                        <SelectItem value="exec" className="text-xs">
                          Executive
                        </SelectItem>
                        {(tier === 'enterprise' || tier === 'pro') && customPolicies.length > 0 && (
                          <>
                            <Separator className="my-2 bg-white/10" />
                            {customPolicies.map((cp) => (
                              <SelectItem key={cp.id} value={cp.name} className="text-xs">
                                {cp.label}
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {getPolicy(agent.policy_profile).skills.map((s) => (
                      <Badge
                        key={s}
                        variant="ghost"
                        className="border-none bg-white/5 font-mono text-[9px] tracking-tighter text-zinc-500 uppercase"
                      >
                        +{s}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Agent Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {[
                    ['Machine ID', agent.machine_id || '-'],
                    ['Location', agent.location || '-'],
                    ['Model', agent.config_json?.model || agent.model || '-'],
                    ['Profile', getPolicy(agent.policy_profile).label],
                    ['Skills', getPolicy(agent.policy_profile).skills.join(', ')],
                    ['Status', agent.status.toUpperCase()],
                    ['Created', new Date(agent.created_at).toLocaleDateString()],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-medium">{v}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Resource Usage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-muted-foreground">CPU</span>
                      <span>{m.cpu_usage || 0}%</span>
                    </div>
                    <Progress value={m.cpu_usage || 0} className="h-2" />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-muted-foreground">Memory</span>
                      <span>{m.memory_usage || 0}%</span>
                    </div>
                    <Progress value={m.memory_usage || 0} className="h-2" />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-muted-foreground">Error Rate</span>
                      <span>
                        {m.tasks_completed > 0
                          ? ((m.errors_count / m.tasks_completed) * 100).toFixed(1)
                          : 0}
                        %
                      </span>
                    </div>
                    <Progress
                      value={m.tasks_completed > 0 ? (m.errors_count / m.tasks_completed) * 100 : 0}
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>

              <SmartAlertsCard agent={agent} api={api} />
            </div>
          </TabsContent>

          <TabsContent value="setup">
            <div className="space-y-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Terminal className="h-4 w-4 text-emerald-400" />
                    Connect This Agent
                  </CardTitle>
                  <CardDescription>
                    Run one of these commands on the machine where your OpenClaw agent is running.
                    Pick your OS below.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SetupInstructions agentId={agent.id} agentSecret={agent.agent_secret} />
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Agent ID</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <code className="bg-background border-border flex-1 rounded-lg border px-4 py-2 font-mono text-sm text-emerald-400">
                      {agent.id}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(agent.id);
                        toast.success('Agent ID copied!');
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="config">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <CardTitle className="text-base">Agent Configuration</CardTitle>
                    <Button
                      variant="outline"
                      size="xs"
                      className="h-7 border-white/20 text-[10px] font-bold text-zinc-400 hover:text-white"
                      onClick={() => window.dispatchEvent(new CustomEvent('open-master-key-modal'))}
                    >
                      <Shield className="mr-1.5 h-3 w-3 text-emerald-400" />{' '}
                      {masterPassphrase ? 'UPDATE KEY' : 'UNLOCK E2EE'}
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    className="bg-emerald-600 font-bold italic hover:bg-emerald-700"
                    onClick={handleSaveConfig}
                    disabled={savingConfig}
                  >
                    {savingConfig ? 'Saving...' : 'Save Config'}
                  </Button>
                </div>
                <CardDescription>
                  Edit the JSON configuration and push to the agent.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <textarea
                  className="bg-background border-border h-64 w-full resize-none rounded-lg border p-4 font-mono text-sm focus:ring-2 focus:ring-emerald-500/50 focus:outline-none"
                  value={configEdit}
                  onChange={(e) => setConfigEdit(e.target.value)}
                />
                <div className="bg-muted/30 mt-4 space-y-2 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
                      <Terminal className="h-3 w-3" />
                      CLI Command
                    </p>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => {
                        try {
                          const c = JSON.parse(configEdit);
                          const skills = Array.isArray(c.skills) ? c.skills.join(',') : '';
                          const profile = c.profile || agent.policy_profile || 'dev';
                          const model = c.model || agent.model || 'claude-sonnet-4';
                          const scope = c.data_scope || (profile === 'dev' ? 'full' : 'restricted');
                          const cmd = `fleet-monitor config push --agent-id=${agent.id} --saas-url=${window.location.origin} --agent-secret=${agent.agent_secret} --model=${model} --skills=${skills} --profile=${profile} --data-scope=${scope}`;
                          navigator.clipboard.writeText(cmd);
                          toast.success('Command copied');
                        } catch {
                          toast.error('Fix JSON to generate command');
                        }
                      }}
                      className="text-muted-foreground hover:text-foreground h-6 text-xs"
                    >
                      Copy
                    </Button>
                  </div>
                  <code className="block w-full rounded border border-white/10 bg-black/40 p-3 font-mono text-xs break-all text-emerald-400">
                    {(() => {
                      try {
                        const c = JSON.parse(configEdit);
                        const skills = Array.isArray(c.skills) ? c.skills.join(',') : '';
                        const profile = c.profile || agent.policy_profile || 'dev';
                        const model = c.model || agent.model || 'claude-sonnet-4';
                        const scope = c.data_scope || (profile === 'dev' ? 'full' : 'restricted');
                        return `fleet-monitor config push --agent-id=${agent.id} --saas-url=${typeof window !== 'undefined' ? window.location.origin : ''} --agent-secret=${agent.agent_secret} --model=${model} --skills=${skills} --profile=${profile} --data-scope=${scope}`;
                      } catch (e) {
                        return `fleet-monitor config push --agent-id=${agent.id} --config-file=./config.json (Fix JSON to see full command)`;
                      }
                    })()}
                  </code>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ============ SETUP INSTRUCTIONS ============
/**
 * Renders setup instructions for different platforms based on the provided agent credentials.
 *
 * This component allows users to select their operating system (Windows, macOS, or Linux) and
 * displays the corresponding commands to install and monitor an agent. It utilizes the `copyText`
 * function to facilitate copying commands to the clipboard and dynamically constructs command strings
 * based on the selected platform and provided `agentId` and `agentSecret`.
 *
 * @param {Object} props - The component props.
 * @param {string} props.agentId - The ID of the agent.
 * @param {string} props.agentSecret - The secret key for the agent.
 */
function SetupInstructions({ agentId, agentSecret }) {
  const [platform, setPlatform] = useState('windows');
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  /**
   * Copies the given text to the clipboard and shows a success message.
   */
  const copyText = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  // Windows commands
  const psOneLiner = `irm "${origin}/api/install-agent-ps?agent_id=${agentId}&agent_secret=${agentSecret}" -OutFile openclaw-monitor.ps1; powershell -ExecutionPolicy Bypass -File openclaw-monitor.ps1`;
  const psSingle = `Invoke-RestMethod -Uri "${origin}/api/heartbeat" -Method POST -ContentType "application/json" -Body '{"agent_id":"${agentId}","status":"healthy","metrics":{"cpu_usage":50,"memory_usage":60}}'`;

  // macOS / Linux commands
  const bashOneLiner = `curl -sL "${origin}/api/install-agent?agent_id=${agentId}&agent_secret=${agentSecret}" | bash`;
  const bashSingle = `curl -X POST ${origin}/api/heartbeat \\\n  -H "Content-Type: application/json" \\\n  -d '{"agent_id":"${agentId}","status":"healthy","metrics":{"cpu_usage":50,"memory_usage":60}}'`;
  const bashDaemon = `curl -sL "${origin}/api/install-agent?agent_id=${agentId}&agent_secret=${agentSecret}" > openclaw-monitor.sh\nchmod +x openclaw-monitor.sh\nnohup ./openclaw-monitor.sh > /var/log/openclaw-heartbeat.log 2>&1 &`;

  // Python cross-platform
  const pyOneLiner =
    platform === 'windows'
      ? `irm "${origin}/api/install-agent-py?agent_id=${agentId}&agent_secret=${agentSecret}" -OutFile openclaw-monitor.py; python openclaw-monitor.py`
      : `curl -sL "${origin}/api/install-agent-py?agent_id=${agentId}&agent_secret=${agentSecret}" -o openclaw-monitor.py && python3 openclaw-monitor.py`;

  return (
    <div className="space-y-5">
      {/* Platform Tabs */}
      <div className="bg-muted/50 flex w-fit gap-1 rounded-lg p-1">
        {[
          { id: 'windows', label: 'Windows', icon: '🪟' },
          { id: 'mac', label: 'macOS', icon: '🍎' },
          { id: 'linux', label: 'Linux', icon: '🐧' },
        ].map((p) => (
          <button
            key={p.id}
            onClick={() => setPlatform(p.id)}
            className={`rounded px-4 py-1.5 text-sm font-medium transition-all ${platform === p.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      {/* Windows / PowerShell */}
      {platform === 'windows' && (
        <div className="space-y-6">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <Badge className="rounded-none border-white bg-white font-bold text-black">
                RECOMMENDED
              </Badge>
              <span className="font-mono text-sm text-zinc-400 uppercase">
                PowerShell — Continuous Monitor
              </span>
            </div>
            <div className="group relative">
              <pre className="overflow-x-auto border border-white/10 bg-zinc-950 p-4 font-mono text-xs whitespace-pre-wrap text-zinc-300 selection:bg-white selection:text-black">
                {psOneLiner}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-6 bg-white text-[10px] font-bold text-black uppercase opacity-0 transition-opacity group-hover:opacity-100 hover:bg-zinc-200"
                onClick={() => copyText(psOneLiner)}
              >
                COPY COMMAND
              </Button>
            </div>
            <p className="mt-2 font-mono text-[10px] text-zinc-500 uppercase">
              COLLECTS CPU/MEM VIA <code className="text-white">Get-CimInstance</code>. HEARTBEAT: 5
              MIN.
            </p>
          </div>
          <Separator className="bg-white/10" />
          <div>
            <span className="font-mono text-sm text-zinc-400 uppercase">
              PowerShell — Single Heartbeat (Test)
            </span>
            <div className="group relative mt-2">
              <pre className="overflow-x-auto border border-white/10 bg-zinc-950 p-4 font-mono text-xs whitespace-pre-wrap text-zinc-400">
                {psSingle}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-6 bg-white text-[10px] font-bold text-black uppercase opacity-0 transition-opacity group-hover:opacity-100 hover:bg-zinc-200"
                onClick={() => copyText(psSingle)}
              >
                COPY
              </Button>
            </div>
          </div>
          <Separator className="bg-white/10" />
          <div>
            <span className="font-mono text-sm text-zinc-400 uppercase">
              Python — Cross-Platform
            </span>
            <div className="group relative mt-2">
              <pre className="overflow-x-auto border border-white/10 bg-zinc-950 p-4 font-mono text-xs whitespace-pre-wrap text-zinc-400">
                {pyOneLiner}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-6 bg-white text-[10px] font-bold text-black uppercase opacity-0 transition-opacity group-hover:opacity-100 hover:bg-zinc-200"
                onClick={() => copyText(pyOneLiner)}
              >
                COPY
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* macOS */}
      {platform === 'mac' && (
        <div className="space-y-6">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <Badge className="rounded-none border-white bg-white font-bold text-black">
                RECOMMENDED
              </Badge>
              <span className="font-mono text-sm text-zinc-400 uppercase">
                Bash — Continuous Monitor
              </span>
            </div>
            <div className="group relative">
              <pre className="overflow-x-auto border border-white/10 bg-zinc-950 p-4 font-mono text-xs whitespace-pre-wrap text-zinc-300 selection:bg-white selection:text-black">
                {bashOneLiner}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-6 bg-white text-[10px] font-bold text-black uppercase opacity-0 transition-opacity group-hover:opacity-100 hover:bg-zinc-200"
                onClick={() => copyText(bashOneLiner)}
              >
                COPY COMMAND
              </Button>
            </div>
            <p className="mt-2 font-mono text-[10px] text-zinc-500 uppercase">
              USES <code className="text-white">vm_stat</code> /{' '}
              <code className="text-white">sysctl</code>. HEARTBEAT: 5 MIN.
            </p>
          </div>
          <Separator className="bg-white/10" />
          <div>
            <span className="font-mono text-sm text-zinc-400 uppercase">
              Single Heartbeat (Curl)
            </span>
            <div className="group relative mt-2">
              <pre className="overflow-x-auto border border-white/10 bg-zinc-950 p-4 font-mono text-xs whitespace-pre-wrap text-zinc-400">
                {bashSingle}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-6 bg-white text-[10px] font-bold text-black uppercase opacity-0 transition-opacity group-hover:opacity-100 hover:bg-zinc-200"
                onClick={() => copyText(bashSingle)}
              >
                COPY
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Linux */}
      {platform === 'linux' && (
        <div className="space-y-6">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <Badge className="rounded-none border-white bg-white font-bold text-black">
                RECOMMENDED
              </Badge>
              <span className="font-mono text-sm text-zinc-400 uppercase">
                Bash — Continuous Monitor
              </span>
            </div>
            <div className="group relative">
              <pre className="overflow-x-auto border border-white/10 bg-zinc-950 p-4 font-mono text-xs whitespace-pre-wrap text-zinc-300 selection:bg-white selection:text-black">
                {bashOneLiner}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-6 bg-white text-[10px] font-bold text-black uppercase opacity-0 transition-opacity group-hover:opacity-100 hover:bg-zinc-200"
                onClick={() => copyText(bashOneLiner)}
              >
                COPY COMMAND
              </Button>
            </div>
            <p className="mt-2 font-mono text-[10px] text-zinc-500 uppercase">
              USES <code className="text-white">/proc/stat</code>. HEARTBEAT: 5 MIN.
            </p>
          </div>
          <Separator className="bg-white/10" />
          <div>
            <span className="font-mono text-sm text-zinc-400 uppercase">
              Run as Background Daemon
            </span>
            <div className="group relative mt-2">
              <pre className="overflow-x-auto border border-white/10 bg-zinc-950 p-4 font-mono text-xs whitespace-pre-wrap text-zinc-400">
                {bashDaemon}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-6 bg-white text-[10px] font-bold text-black uppercase opacity-0 transition-opacity group-hover:opacity-100 hover:bg-zinc-200"
                onClick={() => copyText(bashDaemon)}
              >
                COPY
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ PRICING ============
/**
 * Render the pricing view component with different subscription tiers.
 *
 * This component displays a pricing structure with options for monthly and yearly billing.
 * It utilizes state to toggle between yearly and monthly pricing, and maps over predefined tiers
 * to display their features, pricing, and call-to-action buttons. The component also integrates
 * with a navigation system and session management for user interactions.
 *
 * @param {Object} props - The properties for the PricingView component.
 * @param {Function} props.navigate - Function to navigate to different routes.
 * @param {Object} props.session - The current user session object.
 * @param {Object} props.branding - Branding information for the application.
 * @returns {JSX.Element} The rendered pricing view component.
 */
function PricingView({ navigate, session, branding }) {
  const [isYearly, setIsYearly] = useState(false);

  const tiers = [
    {
      name: 'FREE',
      price: '$0',
      period: '/mo',
      desc: 'For solo indie operators',
      features: ['1 Agent Node', 'Community Support', '5-min Heartbeat'],
      cta: 'INITIALIZE',
      popular: false,
    },
    {
      name: 'PRO',
      price: isYearly ? '$15' : '$19',
      period: '/mo',
      desc: 'For scaling fleet commanders',
      features: [
        'Unlimited Nodes',
        'Real-time Monitoring',
        'Slack & Email Alerts',
        'Policy Engine',
        'Priority Ops',
        '1-min Heartbeat',
      ],
      cta: 'UPGRADE TO PRO',
      popular: true,
    },
    {
      name: 'ENTERPRISE',
      price: isYearly ? '$79' : '$99',
      period: '/mo',
      desc: 'For agencies & large systems',
      features: [
        'Everything in Pro',
        'Custom Policies',
        'SSO / SAML',
        'Dedicated Ops',
        '99.99% SLA',
        'Custom Integrations',
        'On-Premise Option',
      ],
      cta: 'CONTACT SALES',
      popular: false,
    },
  ];
  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <Navbar navigate={navigate} session={session} branding={branding} />
      <div className="container mx-auto px-6 pt-32 pb-20">
        <div className="mb-16 text-center">
          <Badge className="mb-6 cursor-default rounded-none border-white/20 bg-white/10 px-3 py-1 font-mono text-xs tracking-widest text-white uppercase hover:bg-white/20">
            Pricing Protocols
          </Badge>
          <h1 className="mb-6 text-5xl font-black tracking-tighter md:text-6xl">
            TRANSPARENT SCALING
          </h1>
          <p className="mx-auto mb-12 max-w-xl text-lg font-light text-zinc-400">
            Start free. Scale when you're ready. No hidden fees.
          </p>

          <div className="flex items-center justify-center gap-4">
            <span
              className={`font-mono text-[10px] tracking-[0.2em] uppercase transition-colors ${!isYearly ? 'font-bold text-white' : 'text-zinc-500'}`}
            >
              Monthly
            </span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className="group relative h-6 w-11 rounded-none border border-white/10 bg-zinc-900 transition-all hover:border-white/30"
            >
              <div
                className={`absolute top-1 bottom-1 w-4 bg-white transition-all duration-300 ${isYearly ? 'left-[26px]' : 'left-1'}`}
              />
            </button>
            <div className="flex items-center gap-2">
              <span
                className={`font-mono text-[10px] tracking-[0.2em] uppercase transition-colors ${isYearly ? 'font-bold text-white' : 'text-zinc-500'}`}
              >
                Yearly
              </span>
              <Badge className="animate-pulse rounded-none border-none bg-white px-1 py-0 text-[8px] font-black text-black">
                20% OFF
              </Badge>
            </div>
          </div>
        </div>
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`relative border p-8 ${t.popular ? 'border-white bg-white/5' : 'border-white/10 bg-black'} flex flex-col transition-all hover:border-white/30`}
            >
              {t.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-3 py-1 text-[10px] font-bold tracking-widest text-black uppercase">
                  Recommended
                </div>
              )}
              <div className="mb-8 text-center">
                <h3 className="mb-2 text-xl font-bold tracking-tight uppercase">{t.name}</h3>
                <p className="mb-6 font-mono text-xs tracking-wide text-zinc-500 uppercase">
                  {t.desc}
                </p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-black tracking-tighter">{t.price}</span>
                  <span className="font-mono text-zinc-500">{t.period}</span>
                </div>
                {isYearly && t.name !== 'FREE' && (
                  <p className="mt-2 font-mono text-[10px] text-zinc-500 uppercase">
                    Billed annually
                  </p>
                )}
              </div>
              <ul className="mb-8 flex-1 space-y-4">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-zinc-300">
                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className={`h-12 w-full rounded-none font-bold tracking-tight ${t.popular ? 'bg-white text-black hover:bg-zinc-200' : 'border border-white/20 bg-transparent text-white hover:bg-white/5'}`}
                onClick={() => navigate(session ? '/dashboard' : '/register')}
              >
                {t.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ LOADING ============
/**
 * Renders a loading screen with an animation and status message.
 */
function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4">
      <div className="flex flex-col items-center gap-6">
        <div className="flex h-16 w-16 animate-pulse items-center justify-center border border-white/20">
          <Zap className="h-6 w-6 fill-white text-white" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="text-lg font-bold tracking-widest text-white">SYSTEM INITIALIZING</p>
          <div className="flex gap-1">
            <div className="h-2 w-2 animate-bounce bg-white" style={{ animationDelay: '0ms' }} />
            <div className="h-2 w-2 animate-bounce bg-white" style={{ animationDelay: '150ms' }} />
            <div className="h-2 w-2 animate-bounce bg-white" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
