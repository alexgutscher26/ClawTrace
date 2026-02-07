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
  Server, Activity, AlertTriangle, Shield, Users, Settings,
  ChevronRight, Plus, RefreshCw, Trash2, Terminal, Zap, Globe,
  Clock, DollarSign, Cpu, HardDrive, ArrowLeft, LogOut, Menu, X,
  Check, Star, Rocket, CheckCircle, XCircle, Wifi, WifiOff,
  BarChart3, TrendingUp, Eye, Copy, Database
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const STATUS_CONFIG = {
  healthy: { color: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'Healthy', bgLight: 'bg-emerald-500/10' },
  idle: { color: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500/30', label: 'Idle', bgLight: 'bg-amber-500/10' },
  error: { color: 'bg-red-500', text: 'text-red-400', border: 'border-red-500/30', label: 'Error', bgLight: 'bg-red-500/10' },
  offline: { color: 'bg-slate-500', text: 'text-slate-400', border: 'border-slate-500/30', label: 'Offline', bgLight: 'bg-slate-500/10' },
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

export default function App() {
  const { view, params, navigate } = useHashRouter();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

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
  if (['dashboard', 'agent-detail'].includes(view) && !session) {
    if (typeof window !== 'undefined') window.location.hash = '/login';
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-right" theme="dark" />
      {view === 'landing' && <LandingView navigate={navigate} session={session} />}
      {view === 'login' && <LoginView navigate={navigate} session={session} />}
      {view === 'register' && <RegisterView navigate={navigate} session={session} />}
      {view === 'dashboard' && <DashboardView navigate={navigate} session={session} api={api} />}
      {view === 'agent-detail' && <AgentDetailView navigate={navigate} session={session} api={api} agentId={params.id} />}
      {view === 'pricing' && <PricingView navigate={navigate} session={session} />}
    </div>
  );
}

// ============ NAVBAR ============
function Navbar({ navigate, session, transparent = false }) {
  const [open, setOpen] = useState(false);
  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/'); };
  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all ${transparent ? 'bg-background/60' : 'bg-background/90'} backdrop-blur-md border-b border-border/40`}>
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center"><Zap className="w-4 h-4 text-white" /></div>
          <span className="text-lg font-bold tracking-tight">OpenClaw Fleet</span>
        </div>
        <div className="hidden md:flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => navigate('/pricing')}>Pricing</Button>
          {session ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>Dashboard</Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="w-4 h-4 mr-1" />Sign Out</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>Sign In</Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => navigate('/register')}>Get Started</Button>
            </>
          )}
        </div>
        <button className="md:hidden" onClick={() => setOpen(!open)}>{open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
      </div>
      {open && (
        <div className="md:hidden bg-background border-b border-border p-4 space-y-1">
          <button onClick={() => { navigate('/pricing'); setOpen(false); }} className="block w-full text-left p-2 rounded text-sm hover:bg-muted">Pricing</button>
          {session ? (
            <>
              <button onClick={() => { navigate('/dashboard'); setOpen(false); }} className="block w-full text-left p-2 rounded text-sm hover:bg-muted">Dashboard</button>
              <button onClick={() => { handleLogout(); setOpen(false); }} className="block w-full text-left p-2 rounded text-sm text-red-400 hover:bg-muted">Sign Out</button>
            </>
          ) : (
            <>
              <button onClick={() => { navigate('/login'); setOpen(false); }} className="block w-full text-left p-2 rounded text-sm hover:bg-muted">Sign In</button>
              <button onClick={() => { navigate('/register'); setOpen(false); }} className="block w-full text-left p-2 rounded text-sm text-emerald-400 hover:bg-muted">Get Started</button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}

// ============ LANDING ============
function LandingView({ navigate, session }) {
  const features = [
    { icon: Server, title: 'Fleet Dashboard', desc: 'Real-time overview of all your agents with status, health, and performance at a glance.' },
    { icon: Activity, title: 'Live Monitoring', desc: 'Track latency, errors, tasks, and resource usage with real-time charts and metrics.' },
    { icon: Shield, title: 'Policy Profiles', desc: 'Pre-built roles (Dev, Ops, Exec) to control agent skills, tools, and data access.' },
    { icon: Zap, title: 'Easy Onboarding', desc: 'Add agents in seconds. Paste a gateway URL or use our CLI tool to register.' },
    { icon: AlertTriangle, title: 'Smart Alerts', desc: 'Get notified via Slack or email when agents go down or exceed thresholds.' },
    { icon: DollarSign, title: 'Usage Analytics', desc: 'Track costs per agent, model, and provider. Optimize your AI spend efficiently.' },
  ];
  return (
    <div className="min-h-screen bg-background">
      <Navbar navigate={navigate} session={session} transparent />
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0 grid-pattern" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-emerald-500/8 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
        <div className="relative z-10 container mx-auto px-6 text-center max-w-5xl">
          <Badge className="mb-6 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15 cursor-default">
            <Rocket className="w-3 h-3 mr-1" /> Now in Beta
          </Badge>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6 tracking-tight leading-tight">
            Scale OpenClaw from{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">1 to 100 agents</span>
            {' '}in 2 clicks
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Centrally manage your self-hosted AI agents with real-time monitoring,
            policy enforcement, and scaling controls.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8" onClick={() => navigate(session ? '/dashboard' : '/register')}>
              {session ? 'Go to Dashboard' : 'Get Started Free'} <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
            <Button size="lg" variant="outline" className="border-border/60" onClick={() => navigate('/pricing')}>View Pricing</Button>
          </div>
          <div className="mt-10 flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-400" /> Free tier available</span>
            <span className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-400" /> No credit card required</span>
            <span className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-400" /> 5-minute setup</span>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative z-10 -mt-20 container mx-auto px-6 mb-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {[{ v: '10,000+', l: 'Agents Managed' }, { v: '99.9%', l: 'Uptime SLA' }, { v: '<50ms', l: 'Avg Latency' }, { v: '500+', l: 'Teams Active' }].map(s => (
            <Card key={s.l} className="bg-card/80 backdrop-blur-sm border-border/40 text-center">
              <CardContent className="pt-6 pb-4">
                <div className="text-2xl md:text-3xl font-bold text-emerald-400">{s.v}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.l}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-6 mb-24">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4">Features</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to manage your AI fleet</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">From onboarding to monitoring, OpenClaw Fleet gives you full control over your self-hosted agents.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map(f => (
            <Card key={f.title} className="bg-card/50 border-border/40 hover:border-emerald-500/30 transition-all group">
              <CardHeader>
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-2 group-hover:bg-emerald-500/20 transition">
                  <f.icon className="w-5 h-5 text-emerald-400" />
                </div>
                <CardTitle className="text-lg">{f.title}</CardTitle>
              </CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{f.desc}</p></CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="container mx-auto px-6 mb-24">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4">Pricing</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            { name: 'Free', price: '$0', period: '/mo', features: ['1 agent', 'Basic metrics', 'Community support'], cta: 'Start Free' },
            { name: 'Pro', price: '$19', period: '/mo', features: ['Unlimited agents', 'Alerts (Slack/Email)', 'Team collaboration', 'Policy profiles', 'Priority support'], cta: 'Start Pro Trial', popular: true },
            { name: 'Enterprise', price: '$99', period: '/mo', features: ['Everything in Pro', 'Custom policies', 'SSO/SAML', 'Dedicated support', 'SLA guarantee'], cta: 'Contact Sales' },
          ].map(t => (
            <Card key={t.name} className={`bg-card/50 border-border/40 relative ${t.popular ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/5' : ''}`}>
              {t.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><Badge className="bg-emerald-600 text-white"><Star className="w-3 h-3 mr-1" />Most Popular</Badge></div>}
              <CardHeader className="text-center">
                <CardTitle>{t.name}</CardTitle>
                <div className="mt-2"><span className="text-4xl font-bold">{t.price}</span><span className="text-muted-foreground">{t.period}</span></div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {t.features.map(f => (<li key={f} className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-emerald-400 shrink-0" />{f}</li>))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button className={`w-full ${t.popular ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`} variant={t.popular ? 'default' : 'outline'} onClick={() => navigate('/register')}>{t.cta}</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-6 h-6 rounded bg-emerald-500 flex items-center justify-center"><Zap className="w-3 h-3 text-white" /></div>
            <span className="font-semibold text-foreground">OpenClaw Fleet</span>
          </div>
          <p>&copy; 2025 OpenClaw Fleet Orchestrator. Built for indie devs and teams.</p>
        </div>
      </footer>
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
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center"><Zap className="w-6 h-6 text-white" /></div>
          </div>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Sign in to your OpenClaw Fleet account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div><Label htmlFor="email">Email</Label><Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required /></div>
            <div><Label htmlFor="password">Password</Label><Input id="password" type="password" placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">Don&apos;t have an account? <button onClick={() => navigate('/register')} className="text-emerald-400 hover:underline">Sign up</button></p>
        </CardFooter>
      </Card>
    </div>
  );
}

// ============ REGISTER ============
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
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center"><Zap className="w-6 h-6 text-white" /></div>
          </div>
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>Start managing your AI agent fleet for free</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div><Label htmlFor="reg-email">Email</Label><Input id="reg-email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required /></div>
            <div><Label htmlFor="reg-password">Password</Label><Input id="reg-password" type="password" placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} /></div>
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>{loading ? 'Creating account...' : 'Create Account'}</Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">Already have an account? <button onClick={() => navigate('/login')} className="text-emerald-400 hover:underline">Sign in</button></p>
        </CardFooter>
      </Card>
    </div>
  );
}

// ============ DASHBOARD ============
function DashboardView({ navigate, session, api }) {
  const [stats, setStats] = useState(null);
  const [fleets, setFleets] = useState([]);
  const [agents, setAgents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedFleet, setSelectedFleet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newAgent, setNewAgent] = useState({ name: '', gateway_url: '', model: 'gpt-4', location: '', machine_id: '' });
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
    if (!selectedFleet) return;
    try {
      const res = await api(`/api/agents?fleet_id=${selectedFleet}`);
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
      await api('/api/agents', { method: 'POST', body: JSON.stringify({ ...newAgent, fleet_id: selectedFleet }) });
      toast.success('Agent registered!');
      setAddOpen(false);
      setNewAgent({ name: '', gateway_url: '', model: 'gpt-4', location: '', machine_id: '' });
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
              { label: 'Total Agents', value: stats.total_agents, icon: Server, color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { label: 'Healthy', value: stats.healthy, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Errors', value: stats.error, icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
              { label: 'Total Tasks', value: stats.total_tasks?.toLocaleString(), icon: BarChart3, color: 'text-purple-400', bg: 'bg-purple-500/10' },
            ].map(s => (
              <Card key={s.label} className="bg-card/60 border-border/40">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${s.bg}`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
                    <div>
                      <p className="text-2xl font-bold">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {agents.length === 0 && fleets.length === 0 && (
          <Card className="bg-card/60 border-border/40 border-dashed">
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
          <Card className="bg-card/60 border-border/40 mb-8">
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
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Model</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">Location</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Heartbeat</th>
                    <th className="text-right p-3 text-xs font-medium text-muted-foreground">Actions</th>
                  </tr></thead>
                  <tbody>
                    {agents.map(agent => {
                      const sc = STATUS_CONFIG[agent.status] || STATUS_CONFIG.offline;
                      return (
                        <tr key={agent.id} className="border-b border-border/20 hover:bg-muted/30 cursor-pointer transition" onClick={() => navigate(`/agent/${agent.id}`)}>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${sc.color} ${agent.status === 'healthy' || agent.status === 'error' ? 'animate-pulse-dot' : ''}`} />
                              <span className="font-medium text-sm">{agent.name}</span>
                            </div>
                          </td>
                          <td className="p-3"><Badge variant="outline" className={`${sc.text} ${sc.border} text-xs`}>{sc.label}</Badge></td>
                          <td className="p-3 text-sm text-muted-foreground hidden md:table-cell font-mono text-xs">{agent.gateway_url}</td>
                          <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{agent.model}</td>
                          <td className="p-3 text-sm text-muted-foreground hidden lg:table-cell">{agent.location || '-'}</td>
                          <td className="p-3 text-sm text-muted-foreground">{timeAgo(agent.last_heartbeat)}</td>
                          <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => navigate(`/agent/${agent.id}`)}><Eye className="w-3.5 h-3.5" /></Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-300" onClick={() => handleDeleteAgent(agent.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
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
          <Card className="bg-card/60 border-border/40">
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
            <div><Label>Model</Label>
              <Select value={newAgent.model} onValueChange={v => setNewAgent(p => ({ ...p, model: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4">GPT-4</SelectItem>
                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                  <SelectItem value="claude-3">Claude 3</SelectItem>
                  <SelectItem value="llama-3">LLaMA 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Location</Label><Input placeholder="us-east-1" value={newAgent.location} onChange={e => setNewAgent(p => ({ ...p, location: e.target.value }))} /></div>
              <div><Label>Machine ID</Label><Input placeholder="droplet-001" value={newAgent.machine_id} onChange={e => setNewAgent(p => ({ ...p, machine_id: e.target.value }))} /></div>
            </div>
            <DialogFooter><Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">Register Agent</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ AGENT DETAIL ============
function AgentDetailView({ navigate, session, api, agentId }) {
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [restarting, setRestarting] = useState(false);
  const [configEdit, setConfigEdit] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  const loadAgent = useCallback(async () => {
    try {
      const res = await api(`/api/agents/${agentId}`);
      setAgent(res.agent);
      setConfigEdit(JSON.stringify(res.agent.config_json, null, 2));
    } catch (err) {
      toast.error('Failed to load agent');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [api, agentId, navigate]);

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
      await api(`/api/agents/${agentId}`, { method: 'PUT', body: JSON.stringify({ config_json: parsed }) });
      toast.success('Config saved');
      loadAgent();
    } catch (err) {
      toast.error(err.message || 'Invalid JSON');
    } finally {
      setSavingConfig(false);
    }
  };

  const metricsData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2, '0')}:00`,
    latency: agent ? Math.max(20, (agent.metrics_json?.latency_ms || 100) + (Math.random() - 0.5) * 100) : 0,
    errors: Math.floor(Math.random() * 5),
    tasks: Math.floor(Math.random() * 15 + 3),
  }));

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
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRestart} disabled={restarting}>
              <RefreshCw className={`w-4 h-4 mr-1 ${restarting ? 'animate-spin' : ''}`} />
              {restarting ? 'Restarting...' : 'Restart'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(`openclaw monitor --saas-url=${typeof window !== 'undefined' ? window.location.origin : ''} --agent-id=${agent.id}`); toast.success('CLI command copied!'); }}>
              <Copy className="w-4 h-4 mr-1" />Copy CLI
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="mb-6"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="config">Config</TabsTrigger><TabsTrigger value="metrics">Metrics</TabsTrigger></TabsList>

          <TabsContent value="overview">
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Latency', value: `${m.latency_ms || 0}ms`, icon: Activity, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
                { label: 'Tasks Done', value: m.tasks_completed || 0, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                { label: 'Errors', value: m.errors_count || 0, icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
                { label: 'Uptime', value: `${m.uptime_hours || 0}h`, icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                { label: 'Cost', value: `$${(m.cost_usd || 0).toFixed(2)}`, icon: DollarSign, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                { label: 'CPU', value: `${m.cpu_usage || 0}%`, icon: Cpu, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                { label: 'Memory', value: `${m.memory_usage || 0}%`, icon: HardDrive, color: 'text-pink-400', bg: 'bg-pink-500/10' },
                { label: 'Last Heartbeat', value: timeAgo(agent.last_heartbeat), icon: Wifi, color: 'text-slate-400', bg: 'bg-slate-500/10' },
              ].map(s => (
                <Card key={s.label} className="bg-card/60 border-border/40">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-1"><div className={`p-1.5 rounded ${s.bg}`}><s.icon className={`w-3.5 h-3.5 ${s.color}`} /></div><span className="text-xs text-muted-foreground">{s.label}</span></div>
                    <p className="text-xl font-bold pl-8">{s.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="bg-card/60 border-border/40">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Agent Info</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {[['Machine ID', agent.machine_id || '-'], ['Location', agent.location || '-'], ['Model', agent.model], ['Profile', agent.config_json?.profile || '-'], ['Skills', (agent.config_json?.skills || []).join(', ')], ['Data Scope', agent.config_json?.data_scope || '-'], ['Created', new Date(agent.created_at).toLocaleDateString()]].map(([k, v]) => (
                    <div key={k} className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></div>
                  ))}
                </CardContent>
              </Card>
              <Card className="bg-card/60 border-border/40">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Resource Usage</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div><div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">CPU</span><span>{m.cpu_usage || 0}%</span></div><Progress value={m.cpu_usage || 0} className="h-2" /></div>
                  <div><div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">Memory</span><span>{m.memory_usage || 0}%</span></div><Progress value={m.memory_usage || 0} className="h-2" /></div>
                  <div><div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">Error Rate</span><span>{m.tasks_completed > 0 ? ((m.errors_count / m.tasks_completed) * 100).toFixed(1) : 0}%</span></div><Progress value={m.tasks_completed > 0 ? (m.errors_count / m.tasks_completed) * 100 : 0} className="h-2" /></div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="config">
            <Card className="bg-card/60 border-border/40">
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
                <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Terminal className="w-3 h-3" />CLI: <code className="text-emerald-400">openclaw config push --agent-id={agent.id}</code></p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metrics">
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="bg-card/60 border-border/40">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Latency (24h)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={metricsData}>
                      <defs><linearGradient id="latGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#64748b' }} interval={5} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }} />
                      <Area type="monotone" dataKey="latency" stroke="#10b981" fill="url(#latGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="bg-card/60 border-border/40">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Tasks & Errors (24h)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={metricsData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#64748b' }} interval={5} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="tasks" fill="#10b981" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="errors" fill="#ef4444" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ============ PRICING ============
function PricingView({ navigate, session }) {
  const tiers = [
    { name: 'Free', price: '$0', period: '/mo', desc: 'Perfect for solo indie testers', features: ['1 agent', 'Basic metrics dashboard', 'Community support', '5-minute heartbeat interval'], cta: 'Start Free', popular: false },
    { name: 'Pro', price: '$19', period: '/mo', desc: 'For dev teams scaling their fleets', features: ['Unlimited agents', 'Real-time monitoring', 'Slack & email alerts', 'Team collaboration', 'Policy profiles (Dev/Ops/Exec)', 'Priority support', '1-minute heartbeat interval'], cta: 'Start Pro Trial', popular: true },
    { name: 'Enterprise', price: '$99', period: '/mo', desc: 'For agencies & large teams', features: ['Everything in Pro', 'Custom policy profiles', 'SSO / SAML auth', 'Dedicated account manager', 'SLA guarantee (99.99%)', 'Custom integrations', 'On-premise deployment option'], cta: 'Contact Sales', popular: false },
  ];
  return (
    <div className="min-h-screen bg-background">
      <Navbar navigate={navigate} session={session} />
      <div className="pt-28 pb-20 container mx-auto px-6">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Pricing</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Simple, transparent pricing</h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">Start free. Scale when you&apos;re ready. No hidden fees.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {tiers.map(t => (
            <Card key={t.name} className={`bg-card/60 border-border/40 relative ${t.popular ? 'border-emerald-500/50 shadow-xl shadow-emerald-500/5 scale-105' : ''}`}>
              {t.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><Badge className="bg-emerald-600 text-white"><Star className="w-3 h-3 mr-1" />Most Popular</Badge></div>}
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl">{t.name}</CardTitle>
                <CardDescription>{t.desc}</CardDescription>
                <div className="mt-4"><span className="text-5xl font-bold">{t.price}</span><span className="text-muted-foreground">{t.period}</span></div>
              </CardHeader>
              <CardContent>
                <Separator className="mb-6" />
                <ul className="space-y-3">
                  {t.features.map(f => (<li key={f} className="flex items-start gap-2 text-sm"><Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />{f}</li>))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button className={`w-full ${t.popular ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`} variant={t.popular ? 'default' : 'outline'} size="lg" onClick={() => navigate(session ? '/dashboard' : '/register')}>{t.cta}</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ LOADING ============
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center animate-pulse">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <p className="text-sm text-muted-foreground">Loading OpenClaw Fleet...</p>
      </div>
    </div>
  );
}
