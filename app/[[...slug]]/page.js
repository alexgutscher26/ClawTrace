'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { usePathname, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Toaster, toast } from 'sonner';
import {
  Server, Activity, AlertTriangle, Shield,
  Plus, RefreshCw, Trash2, Terminal, Zap, Lock,
  Clock, DollarSign, Cpu, HardDrive, ArrowLeft, Menu, X,
  CheckCircle, XCircle, Wifi,
  BarChart3, Eye, Copy, Database,
  Bell, Slack, Webhook, Building2
} from 'lucide-react';


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

import { getPolicy } from '@/lib/policies';
import { encryptE2EE } from '@/lib/client-crypto';

const STATUS_CONFIG = {
  healthy: { color: 'bg-white', text: 'text-white', border: 'border-white/20', label: 'OPERATIONAL', bgLight: 'bg-white/10' },
  idle: { color: 'bg-zinc-500', text: 'text-zinc-400', border: 'border-white/10', label: 'IDLE', bgLight: 'bg-white/5' },
  error: { color: 'bg-white', text: 'text-white', border: 'border-white/40', label: 'ERROR', bgLight: 'bg-white/20' },
  offline: { color: 'bg-zinc-700', text: 'text-zinc-500', border: 'border-white/5', label: 'OFFLINE', bgLight: 'bg-white/5' },
};

function timeAgo(dateString) {
  if (!dateString) return 'Never';
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function usePathRouter() {
  const router = useRouter();
  const pathname = usePathname();
  const [route, setRoute] = useState({ view: 'landing', params: {} });

  useEffect(() => {
    const parsePath = () => {
      const path = pathname || '/';
      if (path === '/' || path === '') return { view: 'landing', params: {} };
      if (path === '/login') return { view: 'login', params: {} };
      if (path === '/register') return { view: 'register', params: {} };
      if (path === '/dashboard') return { view: 'dashboard', params: {} };
      if (path === '/pricing') return { view: 'pricing', params: {} };
      if (path === '/settings') return { view: 'settings', params: {} };
      if (path === '/changelog') return { view: 'changelog', params: {} };
      if (path === '/docs') return { view: 'docs', params: {} };

      const m = path.match(/^\/agent\/(.+)$/);
      if (m) return { view: 'agent', params: { id: m[1] } };

      return { view: 'landing', params: {} };
    };
    setRoute(parsePath());
  }, [pathname]);

  const navigate = useCallback((p) => router.push(p), [router]);
  return { ...route, navigate };
}





const CHANGELOG_DATA = [
  {
    date: 'February 2026',
    version: 'v1.4.1',
    title: 'Authentication & UX Improvements',
    items: [
      { type: 'fix', text: 'Fixed PowerShell agent handshake timestamp bug causing 6-hour offset on Windows systems.' },
      { type: 'improvement', text: 'Enhanced HMAC-SHA256 signature validation with comprehensive debug logging.' },
      { type: 'improvement', text: 'Updated default AI model from gpt-4 to claude-sonnet-4 for better cost-efficiency.' },
      { type: 'fix', text: 'Resolved E2EE master key prompt appearing incorrectly for server-side encrypted configs.' }
    ]
  },
  {
    date: 'February 2026',
    version: 'v1.4.0',
    title: 'Deep Intelligence & Smart Alerts',
    items: [
      { type: 'feature', text: 'Implemented real-time threshold monitoring for CPU, Memory, and Latency.' },
      { type: 'feature', text: 'Added integration for Slack, Discord, and Custom Webhooks.' },
      { type: 'improvement', text: 'Built-in alert fatigue prevention (Squelch logic) for high-frequency events.' },
      { type: 'feature', text: 'New Settings panel for managing notification channels globally.' }
    ]
  },
  {
    date: 'January 2026',
    version: 'v1.3.0',
    title: 'Policy Engine v2',
    items: [
      { type: 'feature', text: 'Revamped Policy profiles with deep hardware enforcement rules.' },
      { type: 'feature', text: 'Added real-time cost calculation based on agent token usage.' },
      { type: 'improvement', text: 'Optimized heartbeat frequency for large-scale fleets (10k+ agents).' }
    ]
  },
  {
    date: 'December 2025',
    version: 'v1.2.0',
    title: 'Security Hardening',
    items: [
      { type: 'feature', text: 'AES-256-GCM encryption for all sensitive agent configurations.' },
      { type: 'improvement', text: 'Implemented Row Level Security (RLS) across all core database tables.' },
      { type: 'feature', text: 'New Team Management system with invite-only access control.' }
    ]

  }
];

// ============ NAVBAR ============
function Navbar({ navigate, session, branding, transparent = false }) {
  const [open, setOpen] = useState(false);
  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/'); };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-white">
      <div className="container mx-auto grid grid-cols-2 md:grid-cols-12 h-16">
        {/* Logo Section */}
        <div className="col-span-1 md:col-span-3 flex items-center px-4 md:px-6 border-r border-white/20">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-5 h-5 bg-white flex items-center justify-center transition-transform group-hover:rotate-180">
              <Zap className="w-3 h-3 text-black fill-black" />
            </div>
            {branding?.name ? (
              <span className="text-lg font-bold font-mono tracking-tighter text-white uppercase italic">{branding.name}</span>
            ) : (
              <span className="text-lg font-bold font-mono tracking-tighter text-white">FLEET<span className="text-zinc-500">//</span>OS</span>
            )}
          </div>
        </div>

        {/* Center / Spacer */}
        <div className="hidden md:flex col-span-5 items-center px-6 border-r border-white/20">
          <div className="flex gap-6 text-xs font-mono uppercase tracking-widest text-zinc-500">
            {session && <button onClick={() => navigate('/settings')} className="hover:text-white transition-colors">SETTINGS</button>}
            <button onClick={() => navigate('/changelog')} className="hover:text-white transition-colors">CHANGELOG</button>
            <button onClick={() => navigate('/pricing')} className="hover:text-white transition-colors">PRICING</button>
            <button onClick={() => navigate('/docs')} className="hover:text-white transition-colors">DOCS</button>
            <button onClick={() => window.open('https://github.com/openclaw/fleet', '_blank')} className="hover:text-white transition-colors">GITHUB</button>
          </div>
        </div>

        {/* Auth Actions */}
        <div className="col-span-1 md:col-span-4 flex items-center justify-end">
          {session ? (
            <div className="flex h-full w-full">
              <button onClick={() => navigate('/dashboard')} className="flex-1 h-full border-r border-white/20 hover:bg-white hover:text-black transition-colors font-bold uppercase text-xs">CONSOLE</button>
              <button onClick={handleLogout} className="w-24 h-full text-red-500 hover:bg-red-500 hover:text-black transition-colors font-bold uppercase text-xs">LOGOUT</button>
            </div>
          ) : (
            <div className="flex h-full w-full">
              <button onClick={() => navigate('/login')} className="flex-1 h-full border-r border-white/20 hover:bg-white/10 transition-colors uppercase text-xs text-white">LOGIN</button>
              <button onClick={() => navigate('/register')} className="flex-1 h-full bg-white text-black hover:bg-zinc-200 transition-colors uppercase text-xs font-bold">GET KEY</button>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button className="md:hidden w-16 h-full border-l border-white/20 flex items-center justify-center text-white" onClick={() => setOpen(!open)}>
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden bg-black border-b border-white p-0">
          <button onClick={() => { navigate('/pricing'); setOpen(false); }} className="block w-full text-left p-4 font-mono text-xs uppercase hover:bg-white/10 border-b border-white/10 text-white">PRICING</button>
          {session ? (
            <>
              <button onClick={() => { navigate('/dashboard'); setOpen(false); }} className="block w-full text-left p-4 font-mono text-xs uppercase hover:bg-white/10 border-b border-white/10 text-white">CONSOLE</button>
              <button onClick={() => { handleLogout(); setOpen(false); }} className="block w-full text-left p-4 font-mono text-xs uppercase text-red-500 hover:bg-red-500 hover:text-black">LOGOUT</button>
            </>
          ) : (
            <>
              <button onClick={() => { navigate('/login'); setOpen(false); }} className="block w-full text-left p-4 font-mono text-xs uppercase hover:bg-white/10 border-b border-white/10 text-white">LOGIN</button>
              <button onClick={() => { navigate('/register'); setOpen(false); }} className="block w-full text-left p-4 font-bold text-xs uppercase bg-white text-black">GET KEY</button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}

function DocsView({ navigate, session, branding }) {
  const [activePage, setActivePage] = useState('Introduction');

  const sections = [
    { title: 'Getting Started', items: ['Introduction', 'Installation', 'Architecture', 'Quick Start'] },
    { title: 'Core Concepts', items: ['Agents', 'Fleets', 'Policies', 'Security'] },
    { title: 'API Reference', items: ['Authentication', 'Endpoints', 'Webhooks'] },
    { title: 'Guides', items: ['Deploying to AWS', 'Self-Hosting', 'Custom Agents'] }
  ];

  const content = {
    'Introduction': {
      title: 'Introduction to Fleet',
      subtitle: 'Orchestrate your AI swarms.',
      body: (
        <div className="space-y-8">
          <p className="text-zinc-400 text-lg leading-relaxed">
            Fleet is a lightweight, secure, and scalable orchestration platform for managing autonomous AI agent swarms.
            Designed for high-performance environments, it provides real-time telemetry, remote execution, and policy enforcement.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: 'Zero Latency', desc: 'Real-time state synchronization via WebSocket.' },
              { title: 'E2E Encryption', desc: 'Client-side encryption for all sensitive payloads.' },
              { title: 'Policy Engine', desc: 'Granular RBAC and execution constraints.' },
              { title: 'Self-Hosted', desc: 'Deploy anywhere with a single Docker container.' }
            ].map((f, i) => (
              <div key={i} className="p-4 border border-white/10 bg-black">
                <h3 className="font-bold text-sm uppercase tracking-wide mb-2 text-white">{f.title}</h3>
                <p className="text-xs text-zinc-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )
    },
    'Installation': {
      title: 'Installation',
      subtitle: 'Deploying the Fleet Agent.',
      body: (
        <div className="space-y-6">
          <p className="text-zinc-400">
            The Fleet Agent is a standalone binary that runs on Linux, macOS, and Windows.
            It connects to the Fleet Gateway and executes commands from the Control Plane.
          </p>
          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase text-white">One-Line Install (Linux/macOS)</h3>
            <div className="bg-zinc-950 border border-white/10 p-4 font-mono text-xs text-emerald-400">
              curl -sL https://fleet.sh/install | bash
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase text-white">NPM Global Install</h3>
            <div className="bg-zinc-950 border border-white/10 p-4 font-mono text-xs text-emerald-400">
              npm install -g openclaw-fleet-monitor
            </div>
          </div>
        </div>
      )
    },
    'Architecture': {
      title: 'System Architecture',
      subtitle: 'How Fleet fits together.',
      body: (
        <div className="space-y-8">
          <Card className="bg-black border-white/10 p-6">
            <pre className="text-xs font-mono text-zinc-400 whitespace-pre-wrap">
              {`[CONTROL PLANE] <---> [GATEWAY] <---> [AGENTS]
      |                   |
  [DASHBOARD]        [DATABASE]`}
            </pre>
          </Card>
          <div className="space-y-4 text-zinc-400 text-sm">
            <p><strong className="text-white">Control Plane:</strong> The brain of the operation. Handles API requests, auth, and state.</p>
            <p><strong className="text-white">Gateway:</strong> High-performance WebSocket server dealing with agent connections.</p>
            <p><strong className="text-white">Agents:</strong> Lightweight daemons running on edge compute (EC2, Droplets, Raspberry Pi).</p>
          </div>
        </div>
      )
    },
    'Quick Start': {
      title: 'Quick Start',
      subtitle: 'From zero to fleet in 5 minutes.',
      body: (
        <div className="space-y-6">
          <ol className="list-decimal list-inside space-y-4 text-zinc-400 text-sm">
            <li>Create an account to get your <span className="font-mono text-white bg-white/10 px-1">FLEET_KEY</span>.</li>
            <li>Run the install script on your target machine.</li>
            <li>Enter your <span className="font-mono text-white bg-white/10 px-1">FLEET_KEY</span> when prompted.</li>
            <li>Check the Dashboard to see your new agent online.</li>
          </ol>
        </div>
      )
    },
    'Agents': {
      title: 'Agents',
      subtitle: 'The workers of your fleet.',
      body: (
        <div className="space-y-6">
          <p className="text-zinc-400">Agents are the leaf nodes of the Fleet network. They are responsible for:</p>
          <ul className="list-disc list-inside space-y-2 text-zinc-400 text-sm">
            <li>Reporting telemetry (CPU, Mem, Disk, Net)</li>
            <li>Executing received commands</li>
            <li>Streaming logs back to the gateway</li>
            <li>Managing local child processes</li>
          </ul>
        </div>
      )
    },
    'Fleets': {
      title: 'Fleets',
      subtitle: 'Grouping and organization.',
      body: (
        <div className="space-y-6">
          <p className="text-zinc-400">Fleets allow you to group agents logically. You can target commands to entire fleets instead of individual agents.</p>
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 text-xs">
            <strong>NOTE:</strong> Fleet grouping features are available on the PRO plan.
          </div>
        </div>
      )
    },
    'Policies': {
      title: 'Policies',
      subtitle: 'Governance and RBAC.',
      body: (
        <div className="space-y-6">
          <p className="text-zinc-400">Policies define what an agent is allowed to do. You can restrict:</p>
          <ul className="list-disc list-inside space-y-2 text-zinc-400 text-sm">
            <li>Available shell commands</li>
            <li>Resource usage limits</li>
            <li>Network whitelist/blacklist</li>
          </ul>
        </div>
      )
    },
    'Security': {
      title: 'Security',
      subtitle: 'Zero-knowledge architecture.',
      body: (
        <div className="space-y-6">
          <p className="text-zinc-400">Fleet uses a zero-knowledge architecture. The server never sees your agent secrets or configuration details in plain text.</p>
          <p className="text-zinc-400">We use <strong className="text-white">AES-256-GCM</strong> for client-side encryption. The decryption key lives only in your browser's session storage.</p>
        </div>
      )
    },
    'Authentication': {
      title: 'Authentication',
      subtitle: 'API Security and Tokens.',
      body: (
        <div className="space-y-6">
          <p className="text-zinc-400">All API requests require a Bearer token. You can generate API tokens in the Settings panel.</p>
          <pre className="bg-zinc-950 border border-white/10 p-4 text-xs font-mono text-zinc-400">
            Authorization: Bearer sk_live_...
          </pre>
        </div>
      )
    },
    'Endpoints': {
      title: 'Endpoints',
      subtitle: 'REST API Reference.',
      body: (
        <div className="space-y-4">
          <div className="border border-white/10 p-4">
            <span className="bg-emerald-500/10 text-emerald-400 text-xs font-bold px-2 py-1 mr-2">GET</span>
            <span className="font-mono text-sm text-white">/api/agents</span>
            <p className="text-xs text-zinc-500 mt-2">List all active agents.</p>
          </div>
          <div className="border border-white/10 p-4">
            <span className="bg-blue-500/10 text-blue-400 text-xs font-bold px-2 py-1 mr-2">POST</span>
            <span className="font-mono text-sm text-white">/api/cmd</span>
            <p className="text-xs text-zinc-500 mt-2">Dispatch a command to an agent or fleet.</p>
          </div>
        </div>
      )
    },
    'Webhooks': {
      title: 'Webhooks',
      subtitle: 'Event subscriptions.',
      body: (
        <p className="text-zinc-400">Receive HTTP POST callbacks for events like Agent Online, Agent Offline, and Alert Triggered.</p>
      )
    },
    'Deploying to AWS': {
      title: 'Deploying to AWS',
      subtitle: 'Production setup guide.',
      body: (
        <p className="text-zinc-400">Use our Terraform provider to spin up a high-availability Fleet cluster on ECS Fargate.</p>
      )
    },
    'Self-Hosting': {
      title: 'Self-Hosting',
      subtitle: 'Run Fleet on your own metal.',
      body: (
        <div className="space-y-4">
          <p className="text-zinc-400">Fleet provides a Docker Compose file for easy self-hosting.</p>
          <pre className="bg-zinc-950 border border-white/10 p-4 text-xs font-mono text-emerald-400">
            docker compose up -d
          </pre>
        </div>
      )
    },
    'Custom Agents': {
      title: 'Custom Agents',
      subtitle: 'Building with the SDK.',
      body: (
        <p className="text-zinc-400">Use the Fleet Node.js SDK to build custom agents that integrate directly with your application logic.</p>
      )
    }
  };

  const activeContent = content[activePage] || content['Introduction'];

  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      <Navbar navigate={navigate} session={session} branding={branding} />
      <div className="flex flex-1 pt-16">
        {/* Sidebar */}
        <div className="w-64 border-r border-white/10 hidden md:block fixed top-16 bottom-0 overflow-y-auto bg-black p-6">
          <div className="space-y-8">
            {sections.map((section, i) => (
              <div key={i}>
                <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-4">{section.title}</h4>
                <ul className="space-y-2">
                  {section.items.map((item, j) => (
                    <li key={j}>
                      <button
                        onClick={() => setActivePage(item)}
                        className={`text-[13px] transition-colors text-left w-full ${activePage === item ? 'text-emerald-400 font-bold' : 'text-zinc-500 hover:text-white'}`}
                      >
                        {item}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 md:ml-64 bg-zinc-950/50 min-h-screen">
          <div className="max-w-4xl mx-auto px-8 py-12">
            <div className="mb-12 border-b border-white/10 pb-8">
              <Badge variant="outline" className="mb-4 border-emerald-500/30 text-emerald-400 bg-emerald-500/5 px-3 py-1 text-[10px] font-mono tracking-widest uppercase">Documentation</Badge>
              <h1 className="text-4xl font-black tracking-tight uppercase italic mb-4">{activeContent.title}</h1>
              <p className="text-zinc-400 text-lg leading-relaxed font-light">{activeContent.subtitle}</p>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {activeContent.body}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChangelogView({ navigate, session, branding }) {
  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar navigate={navigate} session={session} branding={branding} />

      <div className="pt-32 pb-20 container mx-auto max-w-4xl px-6">
        <div className="mb-16">
          <Badge variant="outline" className="mb-4 border-emerald-500/30 text-emerald-400 bg-emerald-500/5 px-3 py-1 text-[10px] font-mono tracking-widest uppercase">Platform Updates</Badge>
          <h1 className="text-5xl font-black tracking-tight uppercase italic flex items-center gap-4">
            Changelog <div className="h-1 flex-1 bg-white/10" />
          </h1>
          <p className="text-zinc-500 font-mono mt-4 uppercase tracking-widest text-sm italic">Tracking the evolution of deep fleet orchestration.</p>
        </div>

        <div className="relative space-y-16">
          {/* Timeline Line */}
          <div className="absolute left-0 top-0 bottom-0 w-px bg-linear-to-b from-emerald-500/50 via-white/10 to-transparent ml-[18px] md:ml-[34px] hidden sm:block" />

          {CHANGELOG_DATA.map((release, idx) => (
            <div key={idx} className="relative pl-12 sm:pl-24">
              {/* Point */}
              <div className="absolute left-0 sm:left-4 top-1.5 w-10 h-10 bg-black border border-white/20 rounded-none flex items-center justify-center z-10 sm:ml-4">
                <div className="w-2 h-2 bg-emerald-500 rotate-45" />
              </div>

              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <span className="font-mono text-emerald-400 text-xs font-bold tracking-tighter bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/20">{release.version}</span>
                  <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest">{release.date}</span>
                </div>

                <h2 className="text-2xl font-bold italic uppercase tracking-tight">{release.title}</h2>

                <Card className="glass-card border-white/5 bg-white/2">
                  <CardContent className="pt-6 space-y-4">
                    {release.items.map((item, i) => (
                      <div key={i} className="flex gap-4 group">
                        <div className={`text-[9px] font-mono font-bold uppercase tracking-tighter px-2 py-1 rounded-sm h-fit mt-0.5 flex-shrink-0 ${item.type === 'feature' ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400'
                          }`}>
                          {item.type}
                        </div>
                        <p className="text-zinc-300 text-sm leading-relaxed group-hover:text-white transition-colors">{item.text}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-24 pt-12 border-t border-white/5 text-center">
          <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest leading-loose">
            Want to see a specific feature? <br />
            <button className="text-white hover:underline underline-offset-4 font-bold">Request it on GitHub</button>
          </p>
        </div>
      </div>
    </div>
  );
}

function SettingsView({ navigate, api, session, branding: initialBranding, setGlobalBranding }) {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newChannel, setNewChannel] = useState({ name: '', type: 'slack', webhook_url: '' });
  const [tier, setTier] = useState('free');
  const [policies, setPolicies] = useState([]);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [newPolicy, setNewPolicy] = useState({ name: '', label: '', description: '', skills: '', tools: '', heartbeat_interval: 300 });
  const [branding, setBranding] = useState(initialBranding || { domain: '', name: '' });
  const [savingBranding, setSavingBranding] = useState(false);

  useEffect(() => {
    if (initialBranding) setBranding(initialBranding);
  }, [initialBranding]);

  useEffect(() => {
    api('/api/billing').then(res => {
      const p = res.subscription?.plan || 'free';
      setTier(p.toLowerCase());
    }).catch(() => { });
  }, [api]);

  useEffect(() => {
    if (tier === 'enterprise') {
      api('/api/enterprise/branding').then(res => {
        if (res.branding) setBranding(res.branding);
      }).catch(() => { });
    }
  }, [tier, api]);

  const loadPolicies = useCallback(async () => {
    try {
      const res = await api('/api/custom-policies');
      setPolicies(res.policies || []);
    } catch (err) {
      if (err.message === 'Unauthorized') return;
      toast.error('Failed to load policies'); console.error(err);
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
      if (err.message === 'Unauthorized') return;
      toast.error(err.message);
    } finally { setLoading(false); }
  }, [api]);

  useEffect(() => { loadChannels(); }, [loadChannels]);

  const handleAddChannel = async () => {
    try {
      await api('/api/alert-channels', {
        method: 'POST',
        body: JSON.stringify({
          name: newChannel.name,
          type: newChannel.type,
          config: { webhook_url: newChannel.webhook_url }
        })
      });
      toast.success('Channel added!');
      setAddOpen(false);
      setNewChannel({ name: '', type: 'slack', webhook_url: '' });
      loadChannels();
    } catch (err) { toast.error(err.message); }
  };

  const handleAddPolicy = async () => {
    try {
      await api('/api/custom-policies', {
        method: 'POST',
        body: JSON.stringify({
          ...newPolicy,
          skills: newPolicy.skills.split(',').map(s => s.trim()).filter(Boolean),
          tools: newPolicy.tools.split(',').map(t => t.trim()).filter(Boolean)
        })
      });
      toast.success('Custom policy created!');
      setPolicyOpen(false);
      setNewPolicy({ name: '', label: '', description: '', skills: '', tools: '', heartbeat_interval: 300 });
      loadPolicies();
    } catch (err) { toast.error(err.message); }
  };

  const handleDeletePolicy = (id) => {
    toast('Delete this custom policy?', {
      action: {
        label: 'Confirm',
        onClick: async () => {
          try {
            await api(`/api/custom-policies/${id}`, { method: 'DELETE' });
            toast.success('Policy removed');
            loadPolicies();
          } catch (err) { toast.error(err.message); }
        }
      }
    });
  };

  const handleSaveBranding = async () => {
    setSavingBranding(true);
    try {
      const res = await api('/api/enterprise/branding', {
        method: 'POST',
        body: JSON.stringify(branding)
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

  const isFree = tier === 'free';
  const isEnterprise = tier === 'enterprise';

  const UpgradeGate = ({ title, desc }) => (
    <Card className="bg-black border-white shadow-none rounded-none p-12 text-center">
      <div className="mb-6 flex justify-center">
        <div className="w-16 h-16 bg-white/5 border border-white/20 flex items-center justify-center rotate-45">
          <Lock className="w-6 h-6 text-white -rotate-45" />
        </div>
      </div>
      <h3 className="text-xl font-bold uppercase tracking-tight mb-2 italic">SECURED FOR {title}</h3>
      <p className="text-zinc-500 text-sm max-w-sm mx-auto mb-8 font-light uppercase tracking-wider">{desc}</p>
      <Button
        onClick={() => navigate('/pricing')}
        className="bg-white text-black hover:bg-zinc-200 rounded-none h-12 px-8 font-black tracking-widest text-xs uppercase"
      >
        UPGRADE PROTOCOL
      </Button>
    </Card>
  );

  return (
    <div className="min-h-screen bg-black pt-24 pb-12 font-geist">
      <div className="container mx-auto px-6 max-w-4xl">
        <div className="mb-12">
          <h1 className="text-4xl font-black tracking-tighter mb-2 italic">CONTROL CENTER</h1>
          <p className="text-zinc-500 uppercase text-[10px] tracking-[0.3em] font-light">Global configurations and security protocols</p>
        </div>

        <Tabs defaultValue="alerts" className="space-y-8">
          <TabsList className="bg-black border-b border-white/10 w-full justify-start rounded-none h-auto p-0 gap-8">
            <TabsTrigger value="alerts" className="rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:bg-transparent px-0 pb-4 text-zinc-500 data-[state=active]:text-white uppercase font-black tracking-widest text-xs transition-all">Alert Channels</TabsTrigger>
            <TabsTrigger value="policies" className="rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:bg-transparent px-0 pb-4 text-zinc-500 data-[state=active]:text-white uppercase font-black tracking-widest text-xs transition-all">Custom Policies</TabsTrigger>
            <TabsTrigger value="branding" className="rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:bg-transparent px-0 pb-4 text-zinc-500 data-[state=active]:text-white uppercase font-black tracking-widest text-xs transition-all">White-Labeling</TabsTrigger>
          </TabsList>

          <TabsContent value="alerts" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {isFree ? (
              <UpgradeGate title="SCALING TEAMS" desc="Real-time Slack, Discord, and Webhook alert protocols require a PRO or ENTERPRISE license." />
            ) : (
              <div className="space-y-6">
                {/* Channel List Logic */}
                <div className="flex justify-between items-center bg-white/5 border border-white/10 p-6 mb-8">
                  <div>
                    <h3 className="text-lg font-bold uppercase tracking-tight italic">ALERT PIPELINES</h3>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Configured dispatch routes for smart alerts</p>
                  </div>
                  <Dialog open={addOpen} onOpenChange={setAddOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-white text-black hover:bg-zinc-200 rounded-none font-bold text-xs">ADD CHANNEL</Button>
                    </DialogTrigger>
                    <DialogContent className="bg-black border-white rounded-none p-10 text-white max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">NEW PIPELINE</DialogTitle>
                        <DialogDescription className="text-zinc-500 uppercase text-[10px] tracking-widest">Connect external notification systems</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-6 py-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-zinc-400">CHANNEL NAME</label>
                          <Input
                            value={newChannel.name}
                            onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
                            className="bg-zinc-900 border-white/20 rounded-none h-12 focus:border-white transition-all transition-colors"
                            placeholder="PRODUCTION-SLACK"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-zinc-400">INTEGRATION TYPE</label>
                          <select
                            value={newChannel.type}
                            onChange={(e) => setNewChannel({ ...newChannel, type: e.target.value })}
                            className="w-full bg-zinc-900 border border-white/20 rounded-none h-12 px-3 text-sm focus:border-white outline-none"
                          >
                            <option value="slack">SLACK WEBHOOK</option>
                            <option value="discord">DISCORD WEBHOOK</option>
                            <option value="webhook">GENERIC WEBHOOK</option>
                            <option value="email">EMAIL (RESERVED)</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-zinc-400">WEBHOOK URL</label>
                          <Input
                            value={newChannel.webhook_url}
                            onChange={(e) => setNewChannel({ ...newChannel, webhook_url: e.target.value })}
                            className="bg-zinc-900 border-white/20 rounded-none h-12 focus:border-white transition-all transition-colors"
                            placeholder="https://hooks.slack.com/services/..."
                          />
                        </div>
                      </div>
                      <Button onClick={handleAddChannel} className="w-full bg-white text-black hover:bg-zinc-200 h-14 font-black uppercase tracking-widest italic text-xs">INITIALIZE CHANNEL</Button>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="grid gap-4">
                  {loading ? <div className="p-12 text-center text-zinc-500 animate-pulse font-mono uppercase tracking-[0.3em]">SYNCHRONIZING...</div> : channels.map(c => (
                    <div key={c.id} className="p-6 border border-white/10 bg-black hover:bg-white/5 transition-all flex justify-between items-center group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-white/30 transition-all">
                          {c.type === 'slack' ? <MessageSquare className="w-5 h-5" /> : <Terminal className="w-5 h-5" />}
                        </div>
                        <div>
                          <h4 className="font-bold uppercase tracking-tight">{c.name}</h4>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{c.type} pipe</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 text-[8px] font-black tracking-widest uppercase ${c.active ? 'bg-zinc-800 text-emerald-400' : 'bg-red-950 text-red-500'}`}>
                        {c.active ? 'CONNECTED' : 'TERMINATED'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="policies" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {tier === 'enterprise' ? (
              <div className="space-y-8">
                <div className="flex justify-between items-center bg-white/5 border border-white/10 p-6 mb-8">
                  <div>
                    <h3 className="text-lg font-bold uppercase tracking-tight italic">CUSTOM DIRECTIVES</h3>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Define granular agent execution policies</p>
                  </div>
                  <Dialog open={policyOpen} onOpenChange={setPolicyOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-white text-black hover:bg-zinc-200 rounded-none font-bold text-xs">NEW POLICY</Button>
                    </DialogTrigger>
                    <DialogContent className="bg-black border-white rounded-none p-10 text-white max-w-xl">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">CREATE DIRECTIVE</DialogTitle>
                      </DialogHeader>
                      <div className="grid grid-cols-2 gap-6 py-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-zinc-400">POLICY KEY (SLUG)</label>
                          <Input value={newPolicy.name} onChange={(e) => setNewPolicy({ ...newPolicy, name: e.target.value })} className="bg-zinc-900 border-white/20 rounded-none h-12" placeholder="ops-hardened" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-zinc-400">DISPLAY LABEL</label>
                          <Input value={newPolicy.label} onChange={(e) => setNewPolicy({ ...newPolicy, label: e.target.value })} className="bg-zinc-900 border-white/20 rounded-none h-12" placeholder="HARDENED OPS" />
                        </div>
                        <div className="col-span-2 space-y-2">
                          <label className="text-[10px] font-black uppercase text-zinc-400">ALLOWED SKILLS (CSV)</label>
                          <Input value={newPolicy.skills} onChange={(e) => setNewPolicy({ ...newPolicy, skills: e.target.value })} className="bg-zinc-900 border-white/20 rounded-none h-12" placeholder="monitoring, security, scaling" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-zinc-400">HEARTBEAT (SEC)</label>
                          <Input type="number" value={newPolicy.heartbeat_interval} onChange={(e) => setNewPolicy({ ...newPolicy, heartbeat_interval: parseInt(e.target.value) })} className="bg-zinc-900 border-white/20 rounded-none h-12" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-zinc-400">DATA ACCESS</label>
                          <select value={newPolicy.data_access} onChange={(e) => setNewPolicy({ ...newPolicy, data_access: e.target.value })} className="w-full bg-zinc-900 border border-white/20 rounded-none h-12 px-3 text-sm">
                            <option value="restricted">RESTRICTED</option>
                            <option value="system-only">SYSTEM ONLY</option>
                            <option value="unrestricted">UNRESTRICTED</option>
                          </select>
                        </div>
                      </div>
                      <Button onClick={handleAddPolicy} className="w-full bg-white text-black hover:bg-zinc-200 h-14 font-black uppercase tracking-widest italic text-xs">COMMENCE POLICY</Button>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="grid gap-4">
                  {policies.map(p => (
                    <div key={p.id} className="p-6 border border-white/10 bg-black flex justify-between items-center group hover:bg-white/[0.02]">
                      <div className="flex items-center gap-6">
                        <div className={`px-4 h-10 flex items-center justify-center border ${p.color} bg-black text-[10px] font-black uppercase tracking-widest italic`}>
                          {p.label}
                        </div>
                        <div>
                          <h4 className="font-bold uppercase tracking-tight text-white/90">{p.name}</h4>
                          <div className="flex gap-2 mt-1">
                            {p.skills?.slice(0, 3).map(s => <span key={s} className="text-[8px] text-zinc-500 uppercase border border-white/5 px-2 py-0.5">{s}</span>)}
                            {p.skills?.length > 3 && <span className="text-[8px] text-zinc-500 uppercase px-1">+{p.skills.length - 3} MORE</span>}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeletePolicy(p.id)}
                        className="text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-none"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <UpgradeGate title="AGENCY CONTROLS" desc="Custom policy directives and RBAC engine require an ENTERPRISE license for large-scale operations." />
            )}
          </TabsContent>

          <TabsContent value="branding" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {tier === 'enterprise' ? (
              <Card className="bg-black border-white shadow-none rounded-none p-10">
                <div className="mb-10">
                  <h3 className="text-xl font-bold uppercase tracking-tighter italic mb-2">WHITE-LABEL PROTOCOL</h3>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-light">Custom organizational identity and domain routing</p>
                </div>

                <div className="space-y-8 max-w-lg">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">ORGANIZATION NAME</label>
                    <Input
                      value={branding.name}
                      onChange={(e) => setBranding({ ...branding, name: e.target.value })}
                      className="bg-zinc-900 border-white/20 rounded-none h-14 focus:border-white transition-all text-lg font-bold uppercase tracking-tighter"
                      placeholder="CYBERDYNE SYSTEMS"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">CUSTOM DOMAIN</label>
                    <Input
                      value={branding.domain}
                      onChange={(e) => setBranding({ ...branding, domain: e.target.value })}
                      className="bg-zinc-900 border-white/20 rounded-none h-14 focus:border-white transition-all font-mono"
                      placeholder="fleet.cyberdyne.io"
                    />
                  </div>
                  <Button
                    disabled={savingBranding}
                    onClick={handleSaveBranding}
                    className="w-full bg-white text-black hover:bg-zinc-200 h-14 font-black uppercase tracking-widest text-xs italic"
                  >
                    {savingBranding ? 'SYNCHRONIZING...' : 'UPDATE IDENTITY'}
                  </Button>
                </div>
              </Card>
            ) : (
              <UpgradeGate title="WHITE-LABEL" desc="Organization branding, custom domains, and white-labeling are reserved for ENTERPRISE fleets." />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SmartAlertsCard({ agent, api }) {
  const [configs, setConfigs] = useState([]);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingConfig, setAddingConfig] = useState(false);
  const [newConfig, setNewConfig] = useState({ channel_id: '', cpu_threshold: 90, mem_threshold: 90, latency_threshold: 1000 });

  const loadAlertData = useCallback(async () => {
    try {
      const [confRes, chanRes] = await Promise.all([
        api(`/api/alert-configs?agent_id=${agent.id}`),
        api('/api/alert-channels')
      ]);
      setConfigs(confRes.configs || []);
      setChannels(chanRes.channels || []);
    } catch (err) {
      if (err.message === 'Unauthorized') return;
      toast.error('Failed to load alert configuration');
      console.error('Failed to load alert data:', err);
    } finally {
      setLoading(false);
    }
  }, [api, agent.id]);

  useEffect(() => { loadAlertData(); }, [loadAlertData]);

  const handleAddConfig = async () => {
    if (!newConfig.channel_id) return toast.error('Select a channel');
    try {
      await api('/api/alert-configs', {
        method: 'POST',
        body: JSON.stringify({ ...newConfig, agent_id: agent.id })
      });
      toast.success('Alert configured!');
      setAddingConfig(false);
      loadAlertData();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="pb-3 border-b border-white/5 bg-white/2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-400" />
            <CardTitle className="text-xs font-mono uppercase tracking-widest text-zinc-400">Smart Alerts</CardTitle>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAddingConfig(true)}><Plus className="w-3 h-3" /></Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4 px-0">
        {loading ? (
          <div className="p-4 text-center text-xs text-muted-foreground">Loading alerts...</div>
        ) : configs.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5 text-zinc-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-tight">No alerts active</p>
              <p className="text-[10px] text-zinc-500 mt-1">Get notified via Slack or email when thresholds are exceeded.</p>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold border-white/10 hover:bg-white/5" onClick={() => setAddingConfig(true)}>CONFIGURE ALERTS</Button>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {configs.map(c => (
              <div key={c.id} className="p-3 flex items-center justify-between hover:bg-white/2 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-emerald-500/10 border border-emerald-500/20 rounded-sm flex items-center justify-center">
                    {c.channel?.type === 'slack' ? <Slack className="w-3.5 h-3.5 text-emerald-400" /> : <Webhook className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-white">{c.channel?.name}</p>
                    <p className="text-[9px] text-zinc-500 font-mono uppercase">
                      CPU &gt; {c.cpu_threshold}% • LAT &gt; {c.latency_threshold}ms
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[9px] font-mono border-white/10 text-emerald-400 bg-emerald-400/5">ACTIVE</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={addingConfig} onOpenChange={setAddingConfig}>
        <DialogContent className="sm:max-w-[425px] bg-black border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-sm font-mono uppercase tracking-widest">New Smart Alert</DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">Route threshold alerts to a notification channel.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label className="text-[10px] uppercase text-zinc-500">Channel</Label>
              <Select value={newConfig.channel_id} onValueChange={v => setNewConfig(p => ({ ...p, channel_id: v }))}>
                <SelectTrigger className="bg-zinc-900 border-white/5 h-9 text-xs"><SelectValue placeholder="Select Channel" /></SelectTrigger>
                <SelectContent className="bg-black border-white/10">
                  {channels.map(c => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">{c.name} ({c.type.toUpperCase()})</SelectItem>
                  ))}
                  {channels.length === 0 && <p className="p-2 text-[10px] text-zinc-500">No channels configured. Go to Settings.</p>}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-[10px] uppercase text-zinc-500">CPU Threshold (%)</Label>
                <Input type="number" className="bg-zinc-900 border-white/5 h-9 text-xs" value={newConfig.cpu_threshold} onChange={e => setNewConfig(p => ({ ...p, cpu_threshold: parseInt(e.target.value) }))} />
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] uppercase text-zinc-500">Latency Threshold (ms)</Label>
                <Input type="number" className="bg-zinc-900 border-white/5 h-9 text-xs" value={newConfig.latency_threshold} onChange={e => setNewConfig(p => ({ ...p, latency_threshold: parseInt(e.target.value) }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="text-xs border-white/10" onClick={() => setAddingConfig(false)}>Cancel</Button>
            <Button size="sm" className="text-xs bg-emerald-500 hover:bg-emerald-600 text-black font-bold" onClick={handleAddConfig}>ACTIVATE ALERT</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ============ MASTER KEY MODAL ============
function MasterKeyModal({ onSetKey }) {
  const [passphrase, setPassphrase] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-master-key-modal', handleOpen);

    const saved = sessionStorage.getItem('master_passphrase');
    if (!saved) setIsOpen(true);
    else onSetKey(saved);

    return () => window.removeEventListener('open-master-key-modal', handleOpen);
  }, [onSetKey]);

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
      <DialogContent className="bg-black border-white/20 text-white rounded-none sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight uppercase italic flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" /> E2EE Master Key Required
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500 font-mono uppercase tracking-widest mt-2">
            Your fleet configurations are end-to-end encrypted. Enter your master key to decrypt them.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-[10px] uppercase text-zinc-500">Master Passphrase</Label>
            <Input
              type="password"
              placeholder="••••••••••••••••"
              className="bg-zinc-900 border-white/10 rounded-none h-11"
              value={passphrase}
              onChange={e => setPassphrase(e.target.value)}
              required
            />
          </div>
          <p className="text-[9px] text-zinc-600 font-mono leading-relaxed bg-white/5 p-3 border border-white/5">
            NOTICE: THIS KEY IS NEVER SENT TO THE SERVER. IT IS STORED ONLY IN YOUR BROWSER'S VOLATILE MEMORY. IF YOU FORGET THIS KEY, ENCRYPTED CONFIGURATIONS CANNOT BE RECOVERED.
          </p>
          <Button type="submit" className="w-full bg-white text-black hover:bg-zinc-200 rounded-none font-bold uppercase tracking-widest h-11">
            UNLOCK CONFIGURATIONS
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function App() {
  const res = usePathRouter();
  const { view, params, navigate } = res;

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [masterPassphrase, setMasterPassphrase] = useState(null);
  const [branding, setBranding] = useState({ name: '', domain: '', logo_url: '' });

  const api = useCallback(async (url, opts = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers = { ...opts.headers };
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      api('/api/billing').then(res => {
        if (res.subscription?.plan?.toLowerCase() === 'enterprise') {
          api('/api/enterprise/branding').then(bRes => {
            if (bRes.branding) setBranding(bRes.branding);
          }).catch(() => { });
        }
      }).catch(() => { });
    } else {
      setBranding({ name: '', domain: '', logo_url: '' });
    }
  }, [session, api]);

  const setGlobalBranding = (newBranding) => setBranding(newBranding);

  if (loading) return <LoadingScreen />;


  const viewProps = { navigate, session, api, masterPassphrase, branding, setGlobalBranding };

  const views = {
    landing: <LandingView {...viewProps} />,
    login: <LoginView {...viewProps} />,
    register: <RegisterView {...viewProps} />,
    pricing: <PricingView {...viewProps} />,
    dashboard: <DashboardView {...viewProps} onSetBranding={setBranding} />,
    agent: <AgentDetailView {...viewProps} agentId={params.id} />,
    settings: <SettingsView {...viewProps} />,
    changelog: <ChangelogView {...viewProps} />,
    docs: <DocsView {...viewProps} />
  };

  return (
    <div className="min-h-screen bg-black">
      <Toaster richColors position="top-right" theme="dark" />
      {session && ['dashboard', 'agent', 'settings', 'changelog'].includes(view) && (
        <Navbar navigate={navigate} session={session} branding={branding} />
      )}
      {session && ['dashboard', 'agent', 'settings'].includes(view) && (
        <MasterKeyModal onSetKey={setMasterPassphrase} />
      )}
      {views[view] || <LandingView {...viewProps} />}
    </div>
  );






  // ============ LANDING ============
  // ============ TERMINAL MOCK ============
  function TerminalMock() {
    const [visibleLines, setVisibleLines] = useState([]);
    const [showMetrics, setShowMetrics] = useState(false);
    const [cpuWidth, setCpuWidth] = useState(0);
    const [memWidth, setMemWidth] = useState(0);

    const sequence = [
      { type: 'line', content: <><span className="text-emerald-500">user@fleet:~$</span> curl -sL https://fleet.sh/install | bash</>, delay: 500 },
      { type: 'line', content: <span className="text-zinc-500 font-mono">[INFO] Downloading Fleet Agent v2.0...</span>, delay: 1000 },
      { type: 'line', content: <span className="text-zinc-500 font-mono">[INFO] Verifying checksums...</span>, delay: 800 },
      { type: 'line', content: <span className="text-zinc-500 font-mono">[INFO] Expanding package...</span>, delay: 600 },
      { type: 'line', content: <><span className="text-emerald-500 mr-2 font-bold">➜</span> <span className="text-white font-bold">Agent node initialized.</span></>, delay: 800 },
      { type: 'line', content: <><span className="text-emerald-500 mr-2 font-bold">➜</span> <span className="text-white font-bold">Connected to gateway: 192.168.1.40</span></>, delay: 600 },
      { type: 'line', content: <><span className="text-emerald-500 mr-2 font-bold">➜</span> <span className="text-white font-bold">Status: </span><span className="bg-white text-black px-2 py-0.5 font-black text-[10px] ml-1">ONLINE</span></>, delay: 800 },
    ];

    useEffect(() => {
      let timeoutId;
      const runSequence = async () => {
        for (let i = 0; i < sequence.length; i++) {
          await new Promise(resolve => timeoutId = setTimeout(resolve, sequence[i].delay));
          setVisibleLines(prev => [...prev, sequence[i].content]);
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
        setCpuWidth(prev => {
          const delta = (Math.random() - 0.5) * 4;
          return Math.min(Math.max(prev + delta, 40), 50);
        });
        setMemWidth(prev => {
          const delta = (Math.random() - 0.5) * 2;
          return Math.min(Math.max(prev + delta, 60), 65);
        });
      }, 2000);
      return () => clearInterval(interval);
    }, [showMetrics]);

    return (
      <div className="flex-1 border border-white/10 bg-black relative p-6 pt-12 font-mono text-xs md:text-sm leading-relaxed overflow-hidden min-h-[400px]">
        {/* Terminal Header */}
        <div className="absolute top-0 left-0 w-full h-10 border-b border-white/10 bg-zinc-900/40 flex items-center px-4">
          <div className="flex gap-2 group">
            <div className="w-3 h-3 rounded-full bg-red-500/80 border border-black/20 hover:scale-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center">
              <span className="hidden group-hover:block text-[8px] text-black font-bold">×</span>
            </div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80 border border-black/20 hover:scale-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center">
              <span className="hidden group-hover:block text-[8px] text-black font-bold">−</span>
            </div>
            <div className="w-3 h-3 rounded-full bg-emerald-500/80 border border-black/20 hover:scale-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center">
              <span className="hidden group-hover:block text-[8px] text-black font-bold">+</span>
            </div>
          </div>
          <span className="ml-auto text-[10px] text-zinc-500 font-mono uppercase tracking-widest opacity-50">bash - 80x24</span>
        </div>

        {/* Terminal Content */}
        <div className="space-y-2 mt-4">
          {visibleLines.map((line, i) => (
            <div key={i} className="animate-in fade-in slide-in-from-left-2 duration-500 fill-mode-both">
              {line}
            </div>
          ))}

          {showMetrics && (
            <div className="animate-in fade-in duration-1000">
              <div className="h-px bg-white/5 my-8" />
              <div className="grid grid-cols-2 gap-10">
                <div className="space-y-2">
                  <p className="text-[10px] text-zinc-500 tracking-[0.2em] font-bold">CPU LOAD</p>
                  <div className="h-1 bg-zinc-900 w-full relative">
                    <div
                      className="absolute top-0 left-0 h-full bg-white transition-all duration-[2000ms] ease-in-out"
                      style={{ width: `${cpuWidth}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] text-zinc-500 tracking-[0.2em] font-bold">MEMORY</p>
                  <div className="h-1 bg-zinc-900 w-full relative">
                    <div
                      className="absolute top-0 left-0 h-full bg-white transition-all duration-[2000ms] ease-in-out"
                      style={{ width: `${memWidth}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Blinking Cursor */}
        <div className="absolute bottom-6 right-6 text-white font-bold animate-pulse">_</div>

        {/* CRT Scanline Effect (Subtle) */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_2px,3px_100%]" />
      </div>
    );
  }

  // ============ LANDING ============
  function LandingView({ navigate, session, branding }) {
    const features = [
      { icon: Server, title: 'Centralized Command', desc: 'Manage thousands of agents from a single dashboard with zero latency updates.' },
      { icon: Activity, title: 'Real-time Telemetry', desc: 'Live stream CPU, Memory, and Network stats with 50ms resolution.' },
      { icon: Zap, title: 'Instant Provisioning', desc: 'One-line install script for Linux, macOS, and Windows environments.' },
      { icon: Shield, title: 'Zero-Knowledge Security', desc: 'All agent configurations are encrypted client-side. We cannot see your data.' },
      { icon: Terminal, title: 'Remote Execution', desc: 'Execute shell commands and scripts across your fleet instantly.' },
      { icon: Database, title: 'Historical Data', desc: 'Retain historical performance data for trend analysis and debugging.' }
    ];

    return (
      <div className="min-h-screen bg-black text-white font-mono selection:bg-white selection:text-black flex flex-col">
        <div className="scanline" />

        {/* Top Bar Navigation - Grid Style */}
        <nav className="border-b border-white z-50 bg-black">
          <div className="container mx-auto grid grid-cols-2 md:grid-cols-12 h-14 md:h-16">
            <div className="col-span-1 md:col-span-3 flex items-center px-4 md:px-6 border-r border-white/20">
              <div className="flex items-center gap-2 group cursor-pointer" onClick={() => navigate('/')}>
                <div className="w-5 h-5 bg-white flex items-center justify-center transition-transform group-hover:rotate-180">
                  <Zap className="w-3 h-3 text-black fill-black" />
                </div>
                {branding?.name ? (
                  <span className="text-lg font-bold tracking-tighter uppercase italic">{branding.name}</span>
                ) : (
                  <span className="text-lg font-bold tracking-tighter">FLEET<span className="text-zinc-500">//</span>OS</span>
                )}
              </div>
            </div>

            <div className="hidden md:flex col-span-6 items-center justify-center border-r border-white/20 gap-8">
              <button onClick={() => navigate('/changelog')} className="text-xs uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">CHANGELOG</button>
              <button onClick={() => navigate('/pricing')} className="text-xs uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">PRICING</button>
              <button onClick={() => navigate('/docs')} className="text-xs uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">DOCS</button>
            </div>

            <div className="col-span-1 md:col-span-3 flex items-center justify-end px-4 md:px-0">
              {session ? (
                <button onClick={() => navigate('/dashboard')} className="h-full w-full hover:bg-white hover:text-black transition-colors font-bold uppercase text-sm flex items-center justify-center gap-2">
                  Enter Console <ArrowLeft className="w-4 h-4 rotate-180" />
                </button>
              ) : (
                <div className="grid grid-cols-2 w-full h-full">
                  <button onClick={() => navigate('/login')} className="h-full hover:bg-white/10 transition-colors uppercase text-xs border-r border-white/20">Login</button>
                  <button onClick={() => navigate('/register')} className="h-full bg-white text-black hover:bg-zinc-200 transition-colors uppercase text-xs font-bold">Get Key</button>
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* Main Content Grid */}
        <main className="flex-1 container mx-auto border-x border-white/20">

          {/* Hero Section */}
          <section className="grid grid-cols-1 lg:grid-cols-2 border-b border-white mix-blend-screen min-h-[70vh]">
            {/* Left Column: Typography */}
            <div className="p-8 md:p-12 lg:p-20 border-b lg:border-b-0 lg:border-r border-white/20 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />

              <div className="relative z-10">
                <Badge variant="outline" className="mb-6 rounded-none border-white text-white font-mono text-[10px] uppercase tracking-widest px-2 py-1 inline-flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> v2.0.4 Released
                </Badge>
                <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-[7rem] font-black tracking-tighter leading-[0.8] mb-8">
                  COMMAND<br />
                  YOUR<br />
                  <span className="text-transparent stroke-text" style={{ WebkitTextStroke: '2px white' }}>SWARM</span>
                </h1>
                <p className="text-base sm:text-lg text-zinc-400 max-w-md font-mono leading-relaxed uppercase tracking-wide">
                  The minimal orchestration layer for self-hosted AI fleets. Zero latency. Total visibility.
                </p>
              </div>

              <div className="relative z-10 mt-12">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button size="lg" className="bg-white text-black hover:bg-zinc-200 rounded-none h-14 font-bold text-base px-8 border border-white" onClick={() => navigate('/register')}>
                    INITIALIZE FLEET
                  </Button>
                  <Button size="lg" variant="outline" className="rounded-none h-14 font-mono text-sm px-8 border-white/20 hover:border-white text-zinc-400 hover:text-white" onClick={() => navigate('/pricing')}>
                    VIEW PROTOCOLS
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Column: Visual/Terminal */}
            <div className="bg-zinc-950 p-8 md:p-12 flex flex-col md:border-l border-white/0 lg:min-h-[600px] justify-center">
              <TerminalMock />
            </div>
          </section>

          {/* Ticker Tape */}
          <div className="border-b border-white/20 bg-white text-black overflow-hidden py-3">
            <div className="flex gap-12 animate-marquee whitespace-nowrap font-bold font-mono text-sm uppercase tracking-widest">
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
          <section className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/20 border-b border-white/20">
            {features.slice(0, 3).map((f, i) => (
              <div key={i} className="p-8 sm:p-12 hover:bg-white hover:text-black transition-colors group cursor-default">
                <f.icon className="w-8 h-8 mb-6 text-zinc-500 group-hover:text-black transition-colors" />
                <h3 className="text-xl font-bold mb-4 uppercase tracking-tight">{f.title}</h3>
                <p className="text-sm text-zinc-500 group-hover:text-zinc-600 font-mono leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </section>
          <section className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/20 border-b border-white/20">
            {features.slice(3, 6).map((f, i) => (
              <div key={i} className="p-8 sm:p-12 hover:bg-white hover:text-black transition-colors group cursor-default">
                <f.icon className="w-8 h-8 mb-6 text-zinc-500 group-hover:text-black transition-colors" />
                <h3 className="text-xl font-bold mb-4 uppercase tracking-tight">{f.title}</h3>
                <p className="text-sm text-zinc-500 group-hover:text-zinc-600 font-mono leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </section>

          {/* Footer */}
          <footer className="p-8 sm:p-12 flex flex-col md:flex-row justify-between items-end gap-8 text-xs font-mono text-zinc-600 uppercase">
            <div className="flex flex-col gap-4">
              <div className="w-8 h-8 bg-zinc-900 border border-white/10 flex items-center justify-center">
                <Zap className="w-4 h-4 text-zinc-500" />
              </div>
              <p className="max-w-xs leading-relaxed">
                OpenClaw Fleet Orchestrator.<br />
                Built for the next generation of<br />
                autonomous agent swarms.
              </p>
            </div>
            <div className="text-right">
              <p>&copy; 2026 OPENCLAW SYSTEMS INC.</p>
              <div className="flex gap-4 justify-end mt-2 text-zinc-400">
                <button onClick={() => window.open('https://github.com/openclaw/fleet', '_blank')} className="hover:text-white">GITHUB</button>
                <button onClick={() => navigate('/docs')} className="hover:text-white">DOCS</button>
                <button onClick={() => window.open('https://twitter.com/snackforcode', '_blank')} className="hover:text-white">TWITTER</button>
              </div>
            </div>
          </footer>
        </main>

        <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
      `}</style>
      </div>
    );
  }

  // ============ LOGIN ============
  function LoginView({ navigate, session }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [ssoDomain, setSsoDomain] = useState('');
    const [loading, setLoading] = useState(false);
    const [authMode, setAuthMode] = useState('direct');

    useEffect(() => { if (session) navigate('/dashboard'); }, [session, navigate]);

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

    const handleSSO = async (e) => {
      e.preventDefault();
      if (!ssoDomain) {
        toast.error('Enter your enterprise domain');
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.signInWithSSO({
          domain: ssoDomain.trim()
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
      <div className="min-h-screen flex items-center justify-center p-6 bg-black relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <Card className="w-full max-w-md bg-black border border-white/20 relative z-10 rounded-none overflow-hidden">
          <div className="h-1 bg-white" />
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-6">
              <div className="w-12 h-12 bg-white flex items-center justify-center"><Zap className="w-6 h-6 text-black fill-black" /></div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-white">SYSTEM ACCESS</CardTitle>
            <CardDescription className="font-mono text-zinc-500 uppercase text-[10px] tracking-widest">Identify Yourself to console</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={authMode} onValueChange={setAuthMode} className="w-full mb-6">
              <TabsList className="grid grid-cols-2 rounded-none bg-zinc-900 h-10 p-1 border border-white/10">
                <TabsTrigger value="direct" className="rounded-none font-mono text-[10px] uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-black">DIRECT OPS</TabsTrigger>
                <TabsTrigger value="enterprise" className="rounded-none font-mono text-[10px] uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-black">ENTERPRISE SSO</TabsTrigger>
              </TabsList>

              <TabsContent value="direct">
                <form onSubmit={handleLogin} className="space-y-6 pt-2">
                  <div className="space-y-2"><Label htmlFor="email" className="font-mono text-[10px] uppercase text-zinc-400">Email Address</Label><Input id="email" type="email" className="bg-zinc-900 border-white/10 text-white rounded-none h-10 focus:ring-0 focus:border-white/40" placeholder="USER@EXAMPLE.COM" value={email} onChange={e => setEmail(e.target.value)} required /></div>
                  <div className="space-y-2"><Label htmlFor="password" className="font-mono text-[10px] uppercase text-zinc-400">Security Key</Label><Input id="password" type="password" className="bg-zinc-900 border-white/10 text-white rounded-none h-10 focus:ring-0 focus:border-white/40" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required /></div>
                  <Button type="submit" className="w-full bg-white text-black hover:bg-zinc-200 rounded-none font-bold uppercase tracking-widest h-11 text-xs" disabled={loading}>{loading ? 'VERIFYING...' : 'INITIATE LOGIN'}</Button>
                </form>
              </TabsContent>

              <TabsContent value="enterprise">
                <div className="pt-2 space-y-4">
                  <div className="p-3 bg-zinc-900 border border-white/10">
                    <p className="text-[10px] text-zinc-400 font-mono uppercase leading-relaxed">
                      Accessing as an organization? Redirect to your identity provider via SAML 2.0.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sso-domain" className="font-mono text-[10px] uppercase text-zinc-400">Enterprise Domain</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <Input id="sso-domain" type="text" className="pl-10 bg-zinc-900 border-white/10 text-white rounded-none h-10 focus:ring-0 focus:border-white/40" placeholder="ACME.COM" value={ssoDomain} onChange={e => setSsoDomain(e.target.value)} />
                    </div>
                  </div>
                  <Button onClick={handleSSO} className="w-full bg-transparent border border-white/20 text-white hover:bg-white hover:text-black rounded-none font-bold uppercase tracking-widest h-11 text-xs transition-all" disabled={loading}>
                    {loading ? 'REDIRECTING...' : 'SSO AUTHENTICATION'}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="justify-center border-t border-white/10 pt-4 mt-2">
            <p className="text-xs text-zinc-500 font-mono italic">UNAUTHORIZED ACCESS IS PROHIBITED. IP LOGGED.</p>
          </CardFooter>
        </Card>
        <div className="absolute bottom-4 left-4 flex gap-4 text-[10px] font-mono text-zinc-600 uppercase">
          <button onClick={() => navigate('/register')} className="hover:text-white">New Operator</button>
          <button onClick={() => navigate('/')} className="hover:text-white">Terminal Home</button>
        </div>
      </div>
    );
  }

  function RegisterView({ navigate, session }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => { if (session) navigate('/dashboard'); }, [session, navigate]);

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
      <div className="min-h-screen flex items-center justify-center p-6 bg-black relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <Card className="w-full max-w-md bg-black border border-white/20 relative z-10 rounded-none">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-6">
              <div className="w-12 h-12 bg-white flex items-center justify-center"><Zap className="w-6 h-6 text-black fill-black" /></div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-white">NEW OPERATOR</CardTitle>
            <CardDescription className="font-mono text-zinc-500 uppercase text-xs tracking-widest">Initialize Account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-6">
              <div className="space-y-2"><Label htmlFor="reg-email" className="font-mono text-xs uppercase text-zinc-400">Email Address</Label><Input id="reg-email" type="email" className="bg-zinc-900 border-white/10 text-white rounded-none h-10 focus:border-white/40" placeholder="USER@EXAMPLE.COM" value={email} onChange={e => setEmail(e.target.value)} required /></div>
              <div className="space-y-2"><Label htmlFor="reg-password" className="font-mono text-xs uppercase text-zinc-400">Password</Label><Input id="reg-password" type="password" className="bg-zinc-900 border-white/10 text-white rounded-none h-10 focus:border-white/40" placeholder="MIN 6 CHARACTERS" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} /></div>
              <Button type="submit" className="w-full bg-white text-black hover:bg-zinc-200 rounded-none font-bold uppercase tracking-widest h-10" disabled={loading}>{loading ? 'CREATING PROFILE...' : 'ESTABLISH ACCOUNT'}</Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center border-t border-white/10 pt-4 mt-2">
            <p className="text-xs text-zinc-500 font-mono">ALREADY REGISTERED? <button onClick={() => navigate('/login')} className="text-white hover:underline uppercase">LOGIN</button></p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // ============ DASHBOARD ============
  function DashboardView({ navigate, session, api, masterPassphrase, branding }) {
    const [selectedFleet, setSelectedFleet] = useState(null);
    const [tier, setTier] = useState('free');
    const [limits, setLimits] = useState({ max_agents: 1, alerts: false, teams: false });
    const [customPolicies, setCustomPolicies] = useState([]);
    const [fleets, setFleets] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [addOpen, setAddOpen] = useState(false);
    const [seeding, setSeeding] = useState(false);
    const [agents, setAgents] = useState([]);
    const [newAgent, setNewAgent] = useState({ name: '', gateway_url: '', policy_profile: 'dev' });

    useEffect(() => {
      api('/api/billing').then(res => {
        const p = res.subscription?.plan || 'free';
        setTier(p.toLowerCase());
        if (res.limits) setLimits(res.limits[p.toLowerCase()] || res.limits.free);
      }).catch(() => { });
    }, [api]);

    useEffect(() => {
      if (tier === 'enterprise' || tier === 'pro') {
        api('/api/custom-policies').then(res => setCustomPolicies(res.policies || [])).catch(() => { });
      }
    }, [api, tier]);

    const loadData = useCallback(async () => {
      try {
        const [statsRes, fleetsRes, alertsRes] = await Promise.all([
          api('/api/dashboard/stats'), api('/api/fleets'), api('/api/alerts')
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
        if (err.message === 'Unauthorized') return;
        toast.error('Failed to load agents');
        console.error(err);
      }
    }, [api, selectedFleet]);

    useEffect(() => { loadData(); }, [loadData]);
    useEffect(() => { loadAgents(); }, [loadAgents]);

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

    const handleAddAgent = async (e) => {
      e.preventDefault();
      try {
        const policyId = newAgent.policy_profile || 'dev';
        const customPolicy = customPolicies.find(p => p.name === policyId);
        const policy = getPolicy(policyId, customPolicy);

        let config = {
          profile: policyId,
          skills: policy.skills,
          model: 'claude-sonnet-4',
          data_scope: policyId === 'dev' ? 'full' : 'restricted'
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
            config_json: config
          })
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
          }
        }
      });
    };

    const handleResolveAlert = async (id) => {
      try {
        await api(`/api/alerts/${id}/resolve`, { method: 'POST' });
        toast.success('Alert resolved');
        loadData();
      } catch (err) {
        toast.error(err.message);
      }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><RefreshCw className="w-6 h-6 animate-spin text-emerald-400" /></div>;

    return (
      <div className="min-h-screen bg-background">
        <Navbar navigate={navigate} session={session} branding={branding} />
        <div className="pt-20 pb-10 container mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold">Fleet Dashboard</h1>
              <p className="text-sm text-muted-foreground">Monitor and manage your AI agent fleet</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadData}><RefreshCw className="w-4 h-4 mr-1" />Refresh</Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setAddOpen(true)}><Plus className="w-4 h-4 mr-1" />Add Agent</Button>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'TOTAL AGENTS', value: stats.total_agents, icon: Server },
                { label: 'OPERATIONAL', value: stats.healthy, icon: CheckCircle },
                { label: 'ERRORS', value: stats.error, icon: XCircle },
                { label: 'TASKS EXECUTED', value: stats.total_tasks?.toLocaleString(), icon: BarChart3 },
              ].map(s => (
                <div key={s.label} className="bg-black border border-white/10 p-6 flex items-start justify-between group hover:border-white/30 transition-colors">
                  <div>
                    <div className="text-3xl font-black text-white mb-1 tracking-tighter">{s.value}</div>
                    <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{s.label}</div>
                  </div>
                  <s.icon className="w-5 h-5 text-zinc-700 group-hover:text-white transition-colors" />
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {agents.length === 0 && (
            <Card className="glass-card border-dashed">
              <CardContent className="py-16 text-center">
                <Server className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No agents yet</h3>
                <p className="text-sm text-muted-foreground mb-6">Get started by adding your first agent or load demo data to explore.</p>
                <div className="flex gap-3 justify-center">
                  <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setAddOpen(true)}><Plus className="w-4 h-4 mr-1" />Add Agent</Button>
                  <Button variant="outline" onClick={handleSeedDemo} disabled={seeding}><Database className="w-4 h-4 mr-1" />{seeding ? 'Loading...' : 'Load Demo Data'}</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Fleet Selector */}
          {fleets.length > 0 && (
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm text-muted-foreground">Fleet:</span>
              <Select value={selectedFleet || ''} onValueChange={setSelectedFleet}>
                <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="Select fleet" /></SelectTrigger>
                <SelectContent>{fleets.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
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
                    <thead><tr className="border-b border-border/40">
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Name</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Status</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Gateway</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Policy</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Model</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">Location</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Heartbeat</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">Actions</th>
                    </tr></thead>
                    <tbody>
                      {agents.map(agent => {
                        const sc = STATUS_CONFIG[agent.status] || STATUS_CONFIG.offline;
                        return (
                          <tr key={agent.id} className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition" onClick={() => navigate(`/agent/${agent.id}`)}>
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-1.5 h-1.5 rounded-full ${agent.status === 'healthy' ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : agent.status === 'error' ? 'bg-red-500 animate-pulse' : 'bg-zinc-600'}`} />
                                <span className="font-bold text-sm tracking-tight">{agent.name}</span>
                              </div>
                            </td>
                            <td className="p-3"><Badge variant="outline" className={`${sc.text} ${sc.border} bg-transparent rounded-none text-[10px] font-mono uppercase tracking-wider`}>{sc.label}</Badge></td>
                            <td className="p-3 text-zinc-500 hidden md:table-cell font-mono text-xs uppercase">{agent.gateway_url}</td>
                            <td className="p-3">
                              <Badge variant="outline" className={`${getPolicy(agent.policy_profile).color} ${getPolicy(agent.policy_profile).bg} rounded-none text-[9px] font-mono border-opacity-50 tracking-tighter`}>
                                {getPolicy(agent.policy_profile).label}
                              </Badge>
                            </td>
                            <td className="p-3 text-sm text-zinc-400 hidden md:table-cell">{agent.model}</td>
                            <td className="p-3 text-sm text-zinc-400 hidden lg:table-cell">{agent.location || 'UNKNOWN'}</td>
                            <td className="p-3 text-sm text-zinc-500 font-mono">{timeAgo(agent.last_heartbeat)}</td>
                            <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-zinc-400 hover:text-white" onClick={() => navigate(`/agent/${agent.id}`)}><Eye className="w-3.5 h-3.5" /></Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-zinc-600 hover:text-red-500 hover:bg-transparent" onClick={() => handleDeleteAgent(agent.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
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
              <CardHeader className="pb-3"><CardTitle className="text-base">Recent Alerts</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {alerts.slice(0, 5).map(alert => (
                  <div key={alert.id} className={`flex items-center justify-between p-3 rounded-lg ${alert.resolved ? 'bg-muted/20' : 'bg-red-500/5 border border-red-500/20'}`}>
                    <div className="flex items-center gap-3">
                      <AlertTriangle className={`w-4 h-4 ${alert.resolved ? 'text-muted-foreground' : 'text-red-400'}`} />
                      <div>
                        <p className="text-sm font-medium">{alert.agent_name}: {alert.type}</p>
                        <p className="text-xs text-muted-foreground">{alert.message}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{timeAgo(alert.created_at)}</span>
                      {!alert.resolved && <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleResolveAlert(alert.id)}>Resolve</Button>}
                      {alert.resolved && <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 text-xs">Resolved</Badge>}
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
              <DialogDescription>Add an OpenClaw agent to your fleet. Paste the gateway URL or Droplet info.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddAgent} className="space-y-4">
              <div><Label>Agent Name</Label><Input placeholder="alpha-coder" value={newAgent.name} onChange={e => setNewAgent(p => ({ ...p, name: e.target.value }))} required /></div>
              <div><Label>Gateway URL</Label><Input placeholder="http://192.168.1.100:8080" value={newAgent.gateway_url} onChange={e => setNewAgent(p => ({ ...p, gateway_url: e.target.value }))} required /></div>
              <div>
                <Label>Policy Profile</Label>
                <Select value={newAgent.policy_profile || 'dev'} onValueChange={v => setNewAgent(p => ({ ...p, policy_profile: v }))}>
                  <SelectTrigger className="w-full text-xs rounded-none border-white/20 bg-zinc-900 h-10"><SelectValue placeholder="Select Policy" /></SelectTrigger>
                  <SelectContent className="bg-black border-white/10">
                    <SelectItem value="dev" className="text-xs">Developer (Full Access)</SelectItem>
                    <SelectItem value="ops" className="text-xs">Operations (System Only)</SelectItem>
                    <SelectItem value="exec" className="text-xs">Executive (Read Only)</SelectItem>
                    {(tier === 'enterprise' || tier === 'pro') && customPolicies.length > 0 && (
                      <>
                        <Separator className="my-2 bg-white/10" />
                        <div className="px-2 py-1.5 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Custom Policies</div>
                        {customPolicies.map(cp => (
                          <SelectItem key={cp.id} value={cp.name} className="text-xs">{cp.label}</SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>


              <DialogFooter><Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">Register Agent</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ============ AGENT DETAIL ============
  function AgentDetailView({ navigate, session, api, agentId, masterPassphrase, branding }) {
    const [agent, setAgent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [restarting, setRestarting] = useState(false);
    const [savingConfig, setSavingConfig] = useState(false);
    const [tier, setTier] = useState('free');
    const [customPolicies, setCustomPolicies] = useState([]);
    const [configEdit, setConfigEdit] = useState('');

    useEffect(() => {
      api('/api/billing').then(res => {
        const p = res.subscription?.plan || 'free';
        setTier(p.toLowerCase());
      }).catch(() => { });
    }, [api]);

    useEffect(() => {
      if (tier === 'enterprise' || tier === 'pro') {
        api('/api/custom-policies').then(res => setCustomPolicies(res.policies || [])).catch(() => { });
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
        if (err.message === 'Unauthorized') return;
        toast.error('Failed to load agent');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    }, [api, agentId, navigate, masterPassphrase]);

    useEffect(() => { loadAgent(); }, [loadAgent]);

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
          body: JSON.stringify({ config_json: payload })
        });
        toast.success('Config saved (E2EE Active)');
        loadAgent();
      } catch (err) {
        toast.error(err.message || 'Invalid JSON');
      } finally {
        setSavingConfig(false);
      }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><RefreshCw className="w-6 h-6 animate-spin text-emerald-400" /></div>;
    if (!agent) return null;

    const sc = STATUS_CONFIG[agent.status] || STATUS_CONFIG.offline;
    const m = agent.metrics_json || {};

    return (
      <div className="min-h-screen bg-background">
        <Navbar navigate={navigate} session={session} branding={branding} />
        <div className="pt-20 pb-10 container mx-auto px-6">
          {/* Back + Header */}
          <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate('/dashboard')}><ArrowLeft className="w-4 h-4 mr-1" />Back to Dashboard</Button>
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${sc.bgLight} flex items-center justify-center`}>
                <Server className={`w-6 h-6 ${sc.text}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">{agent.name}</h1>
                  <Badge variant="outline" className={`${sc.text} ${sc.border}`}>{sc.label}</Badge>
                </div>
                <p className="text-sm text-muted-foreground font-mono">{agent.gateway_url}</p>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <Badge variant="outline" className={`${getPolicy(agent.policy_profile).color} ${getPolicy(agent.policy_profile).bg} rounded-none text-xs font-mono px-3 py-1`}>
                {getPolicy(agent.policy_profile).label} PROFILE
              </Badge>
              <div className="w-px h-8 bg-border/40 mx-2 hidden md:block" />
              <Button variant="outline" size="sm" onClick={handleRestart} disabled={restarting}>
                <RefreshCw className={`w-4 h-4 mr-1 ${restarting ? 'animate-spin' : ''}`} />
                {restarting ? 'Restarting...' : 'Restart'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(agent.id); toast.success('Agent ID copied!'); }}>
                <Copy className="w-4 h-4 mr-1" />Copy ID
              </Button>
            </div>
          </div>

          <Tabs defaultValue="overview">
            <TabsList className="mb-6"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="setup">Setup</TabsTrigger><TabsTrigger value="config">Config</TabsTrigger></TabsList>

            <TabsContent value="overview">
              <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'LATENCY', value: `${m.latency_ms || 0}ms`, icon: Activity },
                  { label: 'COMPLETED', value: m.tasks_completed || 0, icon: CheckCircle },
                  { label: 'ERRORS', value: m.errors_count || 0, icon: XCircle },
                  { label: 'UPTIME', value: `${m.uptime_hours || 0}h`, icon: Clock },
                  { label: 'COST', value: `$${(m.cost_usd || 0).toFixed(2)}`, icon: DollarSign },
                  { label: 'CPU', value: `${m.cpu_usage || 0}%`, icon: Cpu },
                  { label: 'MEMORY', value: `${m.memory_usage || 0}%`, icon: HardDrive },
                  { label: 'LAST SEEN', value: timeAgo(agent.last_heartbeat), icon: Wifi },
                ].map(s => (
                  <div key={s.label} className="bg-black border border-white/10 p-4 hover:border-white/30 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-widest">{s.label}</span>
                      <s.icon className="w-3 h-3 text-zinc-600" />
                    </div>
                    <p className="text-xl font-bold text-white tracking-tight">{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                <Card className="glass-card shadow-[0_0_20px_rgba(255,255,255,0.02)]">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-xs font-mono uppercase tracking-widest text-zinc-400">Policy Enforcer</CardTitle>
                    <Shield className="w-4 h-4 text-white/40" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-3 bg-white/5 border border-white/10 rounded-sm">
                      <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">
                        {getPolicy(agent.policy_profile, customPolicies.find(cp => cp.name === agent.policy_profile)).description}
                      </p>
                      <Select value={agent.policy_profile} onValueChange={async (v) => {
                        try {
                          const customPolicy = customPolicies.find(cp => cp.name === v);
                          const policy = getPolicy(v, customPolicy);
                          const newConfig = {
                            ...agent.config_json,
                            profile: v,
                            skills: policy.skills,
                            data_scope: v === 'dev' ? 'full' : v === 'ops' ? 'system' : 'read-only'
                          };
                          await api(`/api/agents/${agent.id}`, {
                            method: 'PUT',
                            body: JSON.stringify({
                              policy_profile: v,
                              config_json: newConfig
                            })
                          });
                          setAgent(p => ({ ...p, policy_profile: v, config_json: newConfig }));
                          toast.success(`Policy updated to ${v}`);
                        } catch (err) { toast.error(err.message); }
                      }}>
                        <SelectTrigger className="w-full text-xs h-9 rounded-none border-white/10 bg-black"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-black border-white/10">
                          <SelectItem value="dev" className="text-xs">Developer</SelectItem>
                          <SelectItem value="ops" className="text-xs">Operations</SelectItem>
                          <SelectItem value="exec" className="text-xs">Executive</SelectItem>
                          {(tier === 'enterprise' || tier === 'pro') && customPolicies.length > 0 && (
                            <>
                              <Separator className="my-2 bg-white/10" />
                              {customPolicies.map(cp => (
                                <SelectItem key={cp.id} value={cp.name} className="text-xs">{cp.label}</SelectItem>
                              ))}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {getPolicy(agent.policy_profile).skills.map(s => (
                        <Badge key={s} variant="ghost" className="text-[9px] uppercase font-mono tracking-tighter bg-white/5 text-zinc-500 border-none">+{s}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Agent Info</CardTitle></CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {[['Machine ID', agent.machine_id || '-'], ['Location', agent.location || '-'], ['Model', agent.config_json?.model || agent.model || '-'], ['Profile', getPolicy(agent.policy_profile).label], ['Skills', getPolicy(agent.policy_profile).skills.join(', ')], ['Status', agent.status.toUpperCase()], ['Created', new Date(agent.created_at).toLocaleDateString()]].map(([k, v]) => (
                      <div key={k} className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></div>
                    ))}
                  </CardContent>
                </Card>
                <Card className="glass-card">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Resource Usage</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div><div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">CPU</span><span>{m.cpu_usage || 0}%</span></div><Progress value={m.cpu_usage || 0} className="h-2" /></div>
                    <div><div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">Memory</span><span>{m.memory_usage || 0}%</span></div><Progress value={m.memory_usage || 0} className="h-2" /></div>
                    <div><div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">Error Rate</span><span>{m.tasks_completed > 0 ? ((m.errors_count / m.tasks_completed) * 100).toFixed(1) : 0}%</span></div><Progress value={m.tasks_completed > 0 ? (m.errors_count / m.tasks_completed) * 100 : 0} className="h-2" /></div>
                  </CardContent>
                </Card>

                <SmartAlertsCard agent={agent} api={api} />
              </div>
            </TabsContent>

            <TabsContent value="setup">
              <div className="space-y-6">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><Terminal className="w-4 h-4 text-emerald-400" />Connect This Agent</CardTitle>
                    <CardDescription>Run one of these commands on the machine where your OpenClaw agent is running. Pick your OS below.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SetupInstructions agentId={agent.id} agentSecret={agent.agent_secret} />
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Agent ID</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-background border border-border rounded-lg px-4 py-2 text-sm font-mono text-emerald-400">{agent.id}</code>
                      <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(agent.id); toast.success('Agent ID copied!'); }}><Copy className="w-4 h-4" /></Button>
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
                      <Button variant="outline" size="xs" className="h-7 text-[10px] font-bold border-white/20 text-zinc-400 hover:text-white" onClick={() => window.dispatchEvent(new CustomEvent('open-master-key-modal'))}>
                        <Shield className="w-3 h-3 mr-1.5 text-emerald-400" /> {masterPassphrase ? 'UPDATE KEY' : 'UNLOCK E2EE'}
                      </Button>
                    </div>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 font-bold italic" onClick={handleSaveConfig} disabled={savingConfig}>{savingConfig ? 'Saving...' : 'Save Config'}</Button>
                  </div>
                  <CardDescription>Edit the JSON configuration and push to the agent.</CardDescription>
                </CardHeader>
                <CardContent>
                  <textarea
                    className="w-full h-64 bg-background border border-border rounded-lg p-4 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    value={configEdit}
                    onChange={e => setConfigEdit(e.target.value)}
                  />
                  <div className="mt-4 p-4 bg-muted/30 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground font-medium flex items-center gap-2"><Terminal className="w-3 h-3" />CLI Command</p>
                      <Button variant="ghost" size="xs" onClick={() => {
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
                      }} className="h-6 text-xs text-muted-foreground hover:text-foreground">Copy</Button>
                    </div>
                    <code className="block w-full p-3 bg-black/40 rounded border border-white/10 text-xs font-mono text-emerald-400 break-all">
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
  function SetupInstructions({ agentId, agentSecret }) {
    const [platform, setPlatform] = useState('windows');
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

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
    const pyOneLiner = platform === 'windows'
      ? `irm "${origin}/api/install-agent-py?agent_id=${agentId}&agent_secret=${agentSecret}" -OutFile openclaw-monitor.py; python openclaw-monitor.py`
      : `curl -sL "${origin}/api/install-agent-py?agent_id=${agentId}&agent_secret=${agentSecret}" -o openclaw-monitor.py && python3 openclaw-monitor.py`;

    return (
      <div className="space-y-5">
        {/* Platform Tabs */}
        <div className="flex gap-1 bg-muted/50 p-1 rounded-lg w-fit">
          {[
            { id: 'windows', label: 'Windows', icon: '🪟' },
            { id: 'mac', label: 'macOS', icon: '🍎' },
            { id: 'linux', label: 'Linux', icon: '🐧' },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setPlatform(p.id)}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-all ${platform === p.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {p.icon} {p.label}
            </button>
          ))}
        </div>

        {/* Windows / PowerShell */}
        {platform === 'windows' && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Badge className="bg-white text-black font-bold border-white rounded-none">RECOMMENDED</Badge>
                <span className="text-sm font-mono uppercase text-zinc-400">PowerShell — Continuous Monitor</span>
              </div>
              <div className="relative group">
                <pre className="bg-zinc-950 border border-white/10 p-4 text-xs font-mono overflow-x-auto text-zinc-300 whitespace-pre-wrap selection:bg-white selection:text-black">{psOneLiner}</pre>
                <Button variant="ghost" size="sm" className="absolute top-2 right-2 h-6 text-[10px] uppercase font-bold bg-white text-black hover:bg-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyText(psOneLiner)}>COPY COMMAND</Button>
              </div>
              <p className="text-[10px] text-zinc-500 mt-2 font-mono uppercase">COLLECTS CPU/MEM VIA <code className="text-white">Get-CimInstance</code>. HEARTBEAT: 5 MIN.</p>
            </div>
            <Separator className="bg-white/10" />
            <div>
              <span className="text-sm font-mono uppercase text-zinc-400">PowerShell — Single Heartbeat (Test)</span>
              <div className="relative mt-2 group">
                <pre className="bg-zinc-950 border border-white/10 p-4 text-xs font-mono overflow-x-auto text-zinc-400 whitespace-pre-wrap">{psSingle}</pre>
                <Button variant="ghost" size="sm" className="absolute top-2 right-2 h-6 text-[10px] uppercase font-bold bg-white text-black hover:bg-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyText(psSingle)}>COPY</Button>
              </div>
            </div>
            <Separator className="bg-white/10" />
            <div>
              <span className="text-sm font-mono uppercase text-zinc-400">Python — Cross-Platform</span>
              <div className="relative mt-2 group">
                <pre className="bg-zinc-950 border border-white/10 p-4 text-xs font-mono overflow-x-auto text-zinc-400 whitespace-pre-wrap">{pyOneLiner}</pre>
                <Button variant="ghost" size="sm" className="absolute top-2 right-2 h-6 text-[10px] uppercase font-bold bg-white text-black hover:bg-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyText(pyOneLiner)}>COPY</Button>
              </div>
            </div>
          </div>
        )}

        {/* macOS */}
        {platform === 'mac' && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Badge className="bg-white text-black font-bold border-white rounded-none">RECOMMENDED</Badge>
                <span className="text-sm font-mono uppercase text-zinc-400">Bash — Continuous Monitor</span>
              </div>
              <div className="relative group">
                <pre className="bg-zinc-950 border border-white/10 p-4 text-xs font-mono overflow-x-auto text-zinc-300 whitespace-pre-wrap selection:bg-white selection:text-black">{bashOneLiner}</pre>
                <Button variant="ghost" size="sm" className="absolute top-2 right-2 h-6 text-[10px] uppercase font-bold bg-white text-black hover:bg-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyText(bashOneLiner)}>COPY COMMAND</Button>
              </div>
              <p className="text-[10px] text-zinc-500 mt-2 font-mono uppercase">USES <code className="text-white">vm_stat</code> / <code className="text-white">sysctl</code>. HEARTBEAT: 5 MIN.</p>
            </div>
            <Separator className="bg-white/10" />
            <div>
              <span className="text-sm font-mono uppercase text-zinc-400">Single Heartbeat (Curl)</span>
              <div className="relative mt-2 group">
                <pre className="bg-zinc-950 border border-white/10 p-4 text-xs font-mono overflow-x-auto text-zinc-400 whitespace-pre-wrap">{bashSingle}</pre>
                <Button variant="ghost" size="sm" className="absolute top-2 right-2 h-6 text-[10px] uppercase font-bold bg-white text-black hover:bg-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyText(bashSingle)}>COPY</Button>
              </div>
            </div>
          </div>
        )}

        {/* Linux */}
        {platform === 'linux' && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Badge className="bg-white text-black font-bold border-white rounded-none">RECOMMENDED</Badge>
                <span className="text-sm font-mono uppercase text-zinc-400">Bash — Continuous Monitor</span>
              </div>
              <div className="relative group">
                <pre className="bg-zinc-950 border border-white/10 p-4 text-xs font-mono overflow-x-auto text-zinc-300 whitespace-pre-wrap selection:bg-white selection:text-black">{bashOneLiner}</pre>
                <Button variant="ghost" size="sm" className="absolute top-2 right-2 h-6 text-[10px] uppercase font-bold bg-white text-black hover:bg-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyText(bashOneLiner)}>COPY COMMAND</Button>
              </div>
              <p className="text-[10px] text-zinc-500 mt-2 font-mono uppercase">USES <code className="text-white">/proc/stat</code>. HEARTBEAT: 5 MIN.</p>
            </div>
            <Separator className="bg-white/10" />
            <div>
              <span className="text-sm font-mono uppercase text-zinc-400">Run as Background Daemon</span>
              <div className="relative mt-2 group">
                <pre className="bg-zinc-950 border border-white/10 p-4 text-xs font-mono overflow-x-auto text-zinc-400 whitespace-pre-wrap">{bashDaemon}</pre>
                <Button variant="ghost" size="sm" className="absolute top-2 right-2 h-6 text-[10px] uppercase font-bold bg-white text-black hover:bg-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyText(bashDaemon)}>COPY</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }


  // ============ PRICING ============
  function PricingView({ navigate, session, branding, api }) {
    const [isYearly, setIsYearly] = useState(false);
    const [loading, setLoading] = useState(null);

    const handleUpgrade = async (plan) => {
      if (!session) return navigate('/register');
      if (plan === 'FREE') return navigate('/dashboard');
      if (plan === 'ENTERPRISE') {
        window.location.href = 'mailto:sales@openclaw.io?subject=Enterprise Fleet Inquiry';
        return;
      }

      setLoading(plan);
      try {
        const res = await api('/api/billing/checkout', {
          method: 'POST',
          body: JSON.stringify({ plan: plan.toLowerCase(), yearly: isYearly })
        });
        if (res.checkout_url) {
          window.location.href = res.checkout_url;
        }
      } catch (err) {
        console.error('Checkout error:', err);
      } finally {
        setLoading(null);
      }
    };

    const tiers = [
      { name: 'FREE', price: '$0', period: '/mo', desc: 'For solo indie operators', features: ['1 Agent Node', 'Community Support', '5-min Heartbeat'], cta: 'INITIALIZE', popular: false },
      { name: 'PRO', price: isYearly ? '$15' : '$19', period: '/mo', desc: 'For scaling fleet commanders', features: ['Unlimited Nodes', 'Real-time Monitoring', 'Slack & Email Alerts', 'Policy Engine', 'Priority Ops', '1-min Heartbeat'], cta: 'UPGRADE TO PRO', popular: true },
      { name: 'ENTERPRISE', price: isYearly ? '$79' : '$99', period: '/mo', desc: 'For agencies & large systems', features: ['Everything in Pro', 'Custom Policies', 'SSO / SAML', 'Dedicated Ops', '99.99% SLA', 'Custom Integrations', 'On-Premise Option'], cta: 'CONTACT SALES', popular: false },
    ];

    return (
      <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
        <Navbar navigate={navigate} session={session} branding={branding} />
        <div className="pt-32 pb-20 container mx-auto px-6 font-geist">
          <div className="text-center mb-16">
            <Badge className="mb-6 bg-white/10 text-white border-white/20 hover:bg-white/20 cursor-default rounded-none px-3 py-1 font-mono tracking-widest text-xs uppercase">Pricing Protocols</Badge>
            <h1 className="text-5xl md:text-6xl font-black mb-6 tracking-tighter italic">TRANSPARENT SCALING</h1>
            <p className="text-lg text-zinc-400 max-w-xl mx-auto font-light mb-12">Start free. Scale when you're ready. No hidden fees.</p>

            <div className="flex items-center justify-center gap-4">
              <span className={`text-[10px] uppercase font-mono tracking-[0.2em] transition-colors ${!isYearly ? 'text-white font-bold' : 'text-zinc-500'}`}>Monthly</span>
              <button
                onClick={() => setIsYearly(!isYearly)}
                className="w-11 h-6 bg-zinc-900 border border-white/10 rounded-none relative transition-all hover:border-white/30 group"
              >
                <div className={`absolute top-1 bottom-1 w-4 bg-white transition-all duration-300 ${isYearly ? 'left-[26px]' : 'left-1'}`} />
              </button>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] uppercase font-mono tracking-[0.2em] transition-colors ${isYearly ? 'text-white font-bold' : 'text-zinc-500'}`}>Yearly</span>
                <Badge className="bg-white text-black border-none rounded-none text-[8px] px-1 py-0 font-black animate-pulse">20% OFF</Badge>
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {tiers.map(t => (
              <div key={t.name} className={`relative p-8 border ${t.popular ? 'border-white bg-white/5 shadow-[0_0_50px_-12px_rgba(255,255,255,0.2)]' : 'border-white/10 bg-black'} flex flex-col transition-all hover:border-white/30 backdrop-blur-sm group`}>
                {t.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-bold uppercase tracking-widest px-3 py-1">Recommended</div>}
                <div className="text-center mb-10">
                  <h3 className="text-2xl font-black tracking-tight mb-2 uppercase group-hover:italic transition-all">{t.name}</h3>
                  <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-8">{t.desc}</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-6xl font-black tracking-tighter">{t.price}</span>
                    <span className="text-zinc-500 font-mono text-sm">{t.period}</span>
                  </div>
                  {isYearly && t.name !== 'FREE' && (
                    <p className="text-[10px] text-white/40 font-mono uppercase mt-4 bg-white/5 py-1 px-3 inline-block">Billed annually</p>
                  )}
                </div>
                <ul className="flex flex-col gap-4 mb-10 flex-1">
                  {t.features.map(f => (
                    <li key={f} className="flex items-center gap-4 text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors">
                      <div className="w-1.5 h-1.5 bg-white/30 group-hover:bg-white transition-all rotate-45 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  disabled={loading === t.name}
                  className={`w-full rounded-none h-14 font-black tracking-widest text-xs uppercase transition-all ${t.popular ? 'bg-white text-black hover:bg-zinc-200 shadow-xl' : 'bg-black border border-white/20 hover:bg-white hover:text-black text-white'}`}
                  onClick={() => handleUpgrade(t.name)}
                >
                  {loading === t.name ? 'PROCESSING...' : t.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ============ LOADING ============
  function LoadingScreen() {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border border-white/20 flex items-center justify-center animate-pulse">
            <Zap className="w-6 h-6 text-white fill-white" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-lg font-bold tracking-widest text-white">SYSTEM INITIALIZING</p>
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-white animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-white animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-white animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }
}
