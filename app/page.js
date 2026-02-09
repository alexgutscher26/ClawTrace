'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Toaster, toast } from 'sonner';
import {
  Server, Activity, AlertTriangle, Shield,
  Plus, RefreshCw, Trash2, Terminal, Zap,
  Clock, DollarSign, Cpu, HardDrive, ArrowLeft, Menu, X,
  CheckCircle, XCircle, Wifi,
  BarChart3, Eye, Copy, Database,
  Bell, Slack, Webhook
} from 'lucide-react';


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

import { getPolicy } from '@/lib/policies';
import { encryptE2EE, decryptE2EE, isE2E } from '@/lib/client-crypto';

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

function useHashRouter() {
  const [route, setRoute] = useState({ view: 'landing', params: {} });
  useEffect(() => {
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
    const handle = () => setRoute(parseHash());
    handle();
    window.addEventListener('hashchange', handle);
    return () => window.removeEventListener('hashchange', handle);
  }, []);
  const navigate = useCallback((p) => { window.location.hash = p; }, []);
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

function ChangelogView({ navigate, session }) {
  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar navigate={navigate} session={session} />

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
          <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-emerald-500/50 via-white/10 to-transparent ml-[18px] md:ml-[34px] hidden sm:block" />

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

function SettingsView({ navigate, api, session }) {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newChannel, setNewChannel] = useState({ name: '', type: 'slack', webhook_url: '' });

  const loadChannels = useCallback(async () => {
    try {
      const res = await api('/api/alert-channels');
      setChannels(res.channels || []);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar navigate={navigate} session={session} />
      <div className="pt-24 pb-20 container mx-auto px-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white uppercase italic">Settings</h1>
            <p className="text-muted-foreground text-sm font-mono mt-1">CONFIGURE YOUR FLEET ORCHESTRATOR</p>
          </div>
          <Button className="bg-white text-black font-bold h-9 text-xs rounded-none hover:bg-zinc-200" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> ADD NOTIFICATION CHANNEL
          </Button>
        </div>

        <Tabs defaultValue="alert-channels" className="w-full">
          <TabsList className="bg-zinc-950 border border-white/10 rounded-none h-10 p-0 mb-8">
            <TabsTrigger value="alert-channels" className="h-full rounded-none px-8 font-mono text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-black">Alert Channels</TabsTrigger>
            <TabsTrigger value="general" className="h-full rounded-none px-8 font-mono text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-black">General</TabsTrigger>
          </TabsList>

          <TabsContent value="alert-channels">
            <div className="grid gap-4">
              {loading ? <LoadingScreen /> : channels.length === 0 ? (
                <Card className="glass-card p-12 text-center border-dashed border-white/10">
                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Slack className="w-6 h-6 text-zinc-500" />
                  </div>
                  <h3 className="text-sm font-bold text-white uppercase mb-1">No channels yet</h3>
                  <p className="text-muted-foreground text-xs font-mono max-w-xs mx-auto mb-6">Create a Slack or Discord webhook to receive deep intelligence alerts from your agents.</p>
                  <Button variant="outline" size="sm" className="rounded-none border-white/20 text-[10px] font-bold h-8" onClick={() => setAddOpen(true)}>CREATE FIRST CHANNEL</Button>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {channels.map(c => (
                    <Card key={c.id} className="glass-card border-white/5 hover:border-white/10 transition-colors">
                      <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-sm font-bold text-white">{c.name}</CardTitle>
                          <CardDescription className="text-[10px] font-mono text-emerald-400 mt-1 uppercase tracking-tighter">{c.type}</CardDescription>
                        </div>
                        <div className={`p-2 rounded-sm ${c.type === 'slack' ? 'bg-emerald-500/10' : 'bg-indigo-500/10'}`}>
                          {c.type === 'slack' ? <Slack className="w-4 h-4 text-emerald-400" /> : <MoreVertical className="w-4 h-4 text-indigo-400" />}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2 mt-2">
                          <code className="flex-1 bg-black/50 border border-white/5 px-2 py-1 text-[9px] font-mono text-zinc-500 rounded truncate">
                            {c.config?.webhook_url || '••••••••••••••••'}
                          </code>
                          <Badge className="bg-emerald-500 text-black text-[9px] font-bold rounded-none">ACTIVE</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="general">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-white">Project Identity</CardTitle>
                <CardDescription className="text-xs">General settings for your OpenClaw account.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label className="text-[10px] uppercase text-zinc-500">User ID</Label>
                  <Input readOnly value={session.user.id} className="bg-zinc-900 border-white/5 h-9 text-xs font-mono" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] uppercase text-zinc-500">Email</Label>
                  <Input readOnly value={session.user.email} className="bg-zinc-900 border-white/5 h-9 text-xs font-mono" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[425px] bg-black border-white/10 text-white rounded-none">
          <DialogHeader>
            <DialogTitle className="text-sm font-mono uppercase tracking-widest italic">New Alert Channel</DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">Configure where your smart alerts should be sent.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label className="text-[10px] uppercase text-zinc-500">Channel Name</Label>
              <Input placeholder="e.g., #production-alerts" className="bg-zinc-900 border-white/5 h-9 text-xs" value={newChannel.name} onChange={e => setNewChannel(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] uppercase text-zinc-500">Type</Label>
              <Select value={newChannel.type} onValueChange={v => setNewChannel(p => ({ ...p, type: v }))}>
                <SelectTrigger className="bg-zinc-900 border-white/5 h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-black border-white/10">
                  <SelectItem value="slack" className="text-xs">Slack Node</SelectItem>
                  <SelectItem value="discord" className="text-xs">Discord Webhook</SelectItem>
                  <SelectItem value="webhook" className="text-xs">Generic Webhook</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] uppercase text-zinc-500">Webhook URL</Label>
              <Input placeholder="https://hooks.slack.com/services/..." className="bg-zinc-900 border-white/5 h-9 text-xs" value={newChannel.webhook_url} onChange={e => setNewChannel(p => ({ ...p, webhook_url: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="text-xs border-white/10 rounded-none font-bold" onClick={() => setAddOpen(false)}>CANCEL</Button>
            <Button size="sm" className="text-xs bg-white text-black hover:bg-zinc-200 rounded-none font-black uppercase italic" onClick={handleAddChannel}>ACTIVATE CHANNEL</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
    const saved = sessionStorage.getItem('master_passphrase');
    if (!saved) setIsOpen(true);
    else onSetKey(saved);
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
  const { view, params, navigate } = useHashRouter();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [masterPassphrase, setMasterPassphrase] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const api = useCallback(async (url, options = {}) => {
    const headers = { 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) };
    const res = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }, [session]);

  if (loading) return <LoadingScreen />;
  if (['dashboard', 'agent-detail', 'settings'].includes(view) && !session) {
    if (typeof window !== 'undefined') window.location.hash = '/login';
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-right" theme="dark" />
      {session && ['dashboard', 'agent-detail', 'settings'].includes(view) && (
        <MasterKeyModal onSetKey={setMasterPassphrase} />
      )}

      {view === 'landing' && <LandingView navigate={navigate} session={session} />}
      {view === 'login' && <LoginView navigate={navigate} session={session} />}
      {view === 'register' && <RegisterView navigate={navigate} session={session} />}
      {view === 'dashboard' && <DashboardView navigate={navigate} session={session} api={api} masterPassphrase={masterPassphrase} />}
      {view === 'agent-detail' && <AgentDetailView navigate={navigate} session={session} api={api} agentId={params.id} masterPassphrase={masterPassphrase} />}
      {view === 'settings' && <SettingsView navigate={navigate} session={session} api={api} />}
      {view === 'changelog' && <ChangelogView navigate={navigate} session={session} />}
      {view === 'pricing' && <PricingView navigate={navigate} session={session} />}
    </div>
  );
}

// ============ NAVBAR ============
// ============ NAVBAR ============
function Navbar({ navigate, session, transparent = false }) {
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
            <span className="text-lg font-bold font-mono tracking-tighter text-white">FLEET<span className="text-zinc-500">//</span>OS</span>
          </div>
        </div>

        {/* Center / Spacer */}
        <div className="hidden md:flex col-span-5 items-center px-6 border-r border-white/20">
          <div className="flex gap-6 text-xs font-mono uppercase tracking-widest text-zinc-500">
            {session && <button onClick={() => navigate('/settings')} className="hover:text-white transition-colors">SETTINGS</button>}
            <button onClick={() => navigate('/changelog')} className="hover:text-white transition-colors">CHANGELOG</button>
            <button onClick={() => navigate('/pricing')} className="hover:text-white transition-colors">PRICING</button>
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
function LandingView({ navigate, session }) {
  const features = [
    { icon: Server, title: 'FLEET DASHBOARD', desc: 'Real-time overview of all your agents with status, health, and performance at a glance.' },
    { icon: Activity, title: 'LIVE MONITORING', desc: 'Track latency, errors, tasks, and resource usage.' },
    { icon: Shield, title: 'POLICY PROFILES', desc: 'Pre-built roles (Dev, Ops, Exec) to control agent skills, tools, and data access.' },
    { icon: Zap, title: 'EASY ONBOARDING', desc: 'Add agents in seconds. Paste a gateway URL or use our CLI tool to register.' },
    { icon: AlertTriangle, title: 'SMART ALERTS', desc: 'Get notified via Slack or email when agents go down or exceed thresholds.' },
    { icon: DollarSign, title: 'USAGE ANALYTICS', desc: 'Track costs per agent, model, and provider. Optimize your AI spend efficiently.' },
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
              <span className="text-lg font-bold tracking-tighter">FLEET<span className="text-zinc-500">//</span>OS</span>
            </div>
          </div>

          <div className="hidden md:flex col-span-6 items-center justify-center border-r border-white/20">
            <span className="text-xs text-zinc-500 uppercase tracking-widest animate-pulse">System Status: 100% Operational</span>
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
              <a href="#" className="hover:text-white">GITHUB</a>
              <a href="#" className="hover:text-white">DOCS</a>
              <a href="#" className="hover:text-white">TWITTER</a>
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
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-black relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-20" />
      <Card className="w-full max-w-md bg-black border border-white/20 relative z-10 rounded-none">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-white flex items-center justify-center"><Zap className="w-6 h-6 text-black fill-black" /></div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">SYSTEM LOGIN</CardTitle>
          <CardDescription className="font-mono text-zinc-500 uppercase text-xs tracking-widest">Identify Yourself</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2"><Label htmlFor="email" className="font-mono text-xs uppercase text-zinc-400">Email Address</Label><Input id="email" type="email" className="bg-zinc-900 border-white/10 text-white rounded-none h-10 focus:border-white/40" placeholder="USER@EXAMPLE.COM" value={email} onChange={e => setEmail(e.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="password" className="font-mono text-xs uppercase text-zinc-400">Password</Label><Input id="password" type="password" className="bg-zinc-900 border-white/10 text-white rounded-none h-10 focus:border-white/40" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required /></div>
            <Button type="submit" className="w-full bg-white text-black hover:bg-zinc-200 rounded-none font-bold uppercase tracking-widest h-10" disabled={loading}>{loading ? 'AUTHENTICATING...' : 'ACCESS DASHBOARD'}</Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center border-t border-white/10 pt-4 mt-2">
          <p className="text-xs text-zinc-500 font-mono">NO ACCOUNT? <button onClick={() => navigate('/register')} className="text-white hover:underline uppercase">INITIATE REGISTRATION</button></p>
        </CardFooter>
      </Card>
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
function DashboardView({ navigate, session, api, masterPassphrase }) {
  const [stats, setStats] = useState(null);
  const [fleets, setFleets] = useState([]);
  const [agents, setAgents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedFleet, setSelectedFleet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newAgent, setNewAgent] = useState({ name: '', gateway_url: '' });
  const [seeding, setSeeding] = useState(false);

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
      let config = {
        profile: newAgent.policy_profile || 'dev',
        skills: getPolicy(newAgent.policy_profile || 'dev').skills,
        model: 'gpt-4',
        data_scope: (newAgent.policy_profile || 'dev') === 'dev' ? 'full' : 'restricted'
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

  const handleDeleteAgent = async (id) => {
    if (!confirm('Delete this agent?')) return;
    try {
      await api(`/api/agents/${id}`, { method: 'DELETE' });
      toast.success('Agent deleted');
      loadAgents();
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
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
      <Navbar navigate={navigate} session={session} />
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
                <SelectTrigger className="w-full"><SelectValue placeholder="Select Policy" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dev">Developer (Full Access)</SelectItem>
                  <SelectItem value="ops">Operations (System Only)</SelectItem>
                  <SelectItem value="exec">Executive (Read Only)</SelectItem>
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
function AgentDetailView({ navigate, session, api, agentId, masterPassphrase }) {
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [restarting, setRestarting] = useState(false);
  const [configEdit, setConfigEdit] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);


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
      <Navbar navigate={navigate} session={session} />
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
                    <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">{getPolicy(agent.policy_profile).description}</p>
                    <Select value={agent.policy_profile} onValueChange={async (v) => {
                      try {
                        const policy = getPolicy(v);
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
                        toast.success(`Policy & Config updated to ${v.toUpperCase()}`);
                        loadAgent();
                      } catch (err) { toast.error(err.message); }
                    }}>
                      <SelectTrigger className="w-full bg-black border-white/20 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dev">Developer</SelectItem>
                        <SelectItem value="ops">Operations</SelectItem>
                        <SelectItem value="exec">Executive</SelectItem>
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
                  <CardTitle className="text-base">Agent Configuration</CardTitle>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveConfig} disabled={savingConfig}>{savingConfig ? 'Saving...' : 'Save Config'}</Button>
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
                        const cmd = `fleet-monitor config push --agent-id=${agent.id} --saas-url=${window.location.origin} --agent-secret=${agent.agent_secret} --model=${c.model} --skills=${skills} --profile=${c.profile} --data-scope=${c.data_scope}`;
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
                        return `fleet-monitor config push --agent-id=${agent.id} --saas-url=${typeof window !== 'undefined' ? window.location.origin : ''} --agent-secret=${agent.agent_secret} --model=${c.model || agent.model} --skills=${skills} --profile=${agent.policy_profile} --data-scope=${c.data_scope || (agent.policy_profile === 'dev' ? 'full' : 'restricted')}`;
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
function PricingView({ navigate, session }) {
  const tiers = [
    { name: 'FREE', price: '$0', period: '/mo', desc: 'For solo indie operators', features: ['1 Agent Node', 'Community Support', '5-min Heartbeat'], cta: 'INITIALIZE', popular: false },
    { name: 'PRO', price: '$19', period: '/mo', desc: 'For scaling fleet commanders', features: ['Unlimited Nodes', 'Real-time Monitoring', 'Slack & Email Alerts', 'Policy Engine', 'Priority Ops', '1-min Heartbeat'], cta: 'UPGRADE TO PRO', popular: true },
    { name: 'ENTERPRISE', price: '$99', period: '/mo', desc: 'For agencies & large systems', features: ['Everything in Pro', 'Custom Policies', 'SSO / SAML', 'Dedicated Ops', '99.99% SLA', 'Custom Integrations', 'On-Premise Option'], cta: 'CONTACT SALES', popular: false },
  ];
  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <Navbar navigate={navigate} session={session} />
      <div className="pt-32 pb-20 container mx-auto px-6">
        <div className="text-center mb-16">
          <Badge className="mb-6 bg-white/10 text-white border-white/20 hover:bg-white/20 cursor-default rounded-none px-3 py-1 font-mono tracking-widest text-xs uppercase">Pricing Protocols</Badge>
          <h1 className="text-5xl md:text-6xl font-black mb-6 tracking-tighter">TRANSPARENT SCALING</h1>
          <p className="text-lg text-zinc-400 max-w-xl mx-auto font-light">Start free. Scale when you're ready. No hidden fees.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {tiers.map(t => (
            <div key={t.name} className={`relative p-8 border ${t.popular ? 'border-white bg-white/5' : 'border-white/10 bg-black'} flex flex-col transition-all hover:border-white/30`}>
              {t.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-bold uppercase tracking-widest px-3 py-1">Recommended</div>}
              <div className="text-center mb-8">
                <h3 className="text-xl font-bold tracking-tight mb-2 uppercase">{t.name}</h3>
                <p className="text-xs text-zinc-500 font-mono uppercase tracking-wide mb-6">{t.desc}</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-black tracking-tighter">{t.price}</span>
                  <span className="text-zinc-500 font-mono">{t.period}</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {t.features.map(f => (<li key={f} className="flex items-start gap-3 text-sm text-zinc-300"><div className="w-1.5 h-1.5 bg-white rounded-full mt-1.5 shrink-0" />{f}</li>))}
              </ul>
              <Button className={`w-full rounded-none h-12 font-bold tracking-tight ${t.popular ? 'bg-white text-black hover:bg-zinc-200' : 'bg-transparent border border-white/20 hover:bg-white/5 text-white'}`} onClick={() => navigate(session ? '/dashboard' : '/register')}>{t.cta}</Button>
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
