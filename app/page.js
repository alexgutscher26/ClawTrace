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
// ============ LANDING ============
function LandingView({ navigate, session }) {
  const features = [
    { icon: Server, title: 'FLEET DASHBOARD', desc: 'Real-time overview of all your agents with status, health, and performance at a glance.' },
    { icon: Activity, title: 'LIVE MONITORING', desc: 'Track latency, errors, tasks, and resource usage with real-time charts and metrics.' },
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
          <div className="bg-zinc-950 p-8 md:p-12 flex flex-col md:border-l border-white/0">
            <div className="flex-1 border border-white/10 bg-black relative p-6 font-mono text-xs md:text-sm text-zinc-300 leading-relaxed overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-8 border-b border-white/10 bg-zinc-900/50 flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50" />
                <span className="ml-auto text-[10px] text-zinc-600">bash - 80x24</span>
              </div>
              <div className="mt-8 space-y-2">
                <p><span className="text-emerald-500">user@fleet:~$</span> curl -sL https://fleet.sh/install | bash</p>
                <p className="text-zinc-500">[INFO] Downloading Fleet Agent v2.0...</p>
                <p className="text-zinc-500">[INFO] Verifying checksums...</p>
                <p className="text-zinc-500">[INFO] Expanding package...</p>
                <p><span className="text-emerald-500">➜</span> <span className="text-white">Agent node initialized.</span></p>
                <p><span className="text-emerald-500">➜</span> <span className="text-white">Connected to gateway: 192.168.1.40</span></p>
                <p><span className="text-emerald-500">➜</span> <span className="text-white">Status: </span><span className="bg-white text-black px-1 font-bold">ONLINE</span></p>
                <div className="mt-4 border-t border-white/10 pt-4 grid grid-cols-2 gap-4 text-[10px] uppercase tracking-widest text-zinc-500">
                  <div>
                    <p>CPU LOAD</p>
                    <div className="w-full bg-zinc-900 h-1 mt-1"><div className="bg-white h-full w-[45%]" /></div>
                  </div>
                  <div>
                    <p>MEMORY</p>
                    <div className="w-full bg-zinc-900 h-1 mt-1"><div className="bg-white h-full w-[62%]" /></div>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-4 right-4 animate-pulse">_</div>
            </div>
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
            <p>&copy; 2025 OPENCLAW SYSTEMS INC.</p>
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
/**
 * Renders the agent detail view, displaying agent information and metrics.
 *
 * This component fetches agent details using the provided API and agentId, manages loading and restarting states, and allows configuration editing. It utilizes various hooks such as useState and useEffect to manage state and side effects. The metrics are generated dynamically based on the agent's data, and the UI is structured with tabs for different sections like overview, setup, config, and metrics.
 *
 * @param {Object} props - The component props.
 * @param {function} props.navigate - Function to navigate to different routes.
 * @param {Object} props.session - The current user session.
 * @param {function} props.api - Function to make API calls.
 * @param {string} props.agentId - The ID of the agent to display.
 * @returns {JSX.Element|null} The rendered component or null if the agent is not found.
 */
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
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(agent.id); toast.success('Agent ID copied!'); }}>
              <Copy className="w-4 h-4 mr-1" />Copy ID
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="mb-6"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="setup">Setup</TabsTrigger><TabsTrigger value="config">Config</TabsTrigger><TabsTrigger value="metrics">Metrics</TabsTrigger></TabsList>

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

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="glass-card">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Agent Info</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {[['Machine ID', agent.machine_id || '-'], ['Location', agent.location || '-'], ['Model', agent.config_json?.model || agent.model || '-'], ['Profile', agent.config_json?.profile || '-'], ['Skills', (agent.config_json?.skills || []).join(', ')], ['Data Scope', agent.config_json?.data_scope || '-'], ['Created', new Date(agent.created_at).toLocaleDateString()]].map(([k, v]) => (
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
                        return `fleet-monitor config push --agent-id=${agent.id} --saas-url=${typeof window !== 'undefined' ? window.location.origin : ''} --agent-secret=${agent.agent_secret} --model=${c.model} --skills=${skills} --profile=${c.profile} --data-scope=${c.data_scope}`;
                      } catch (e) {
                        return `fleet-monitor config push --agent-id=${agent.id} --config-file=./config.json (Fix JSON to see full command)`;
                      }
                    })()}
                  </code>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metrics">
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="glass-card">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Latency (24h)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={metricsData}>
                      <defs><linearGradient id="latGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#64748b' }} interval={5} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }} />
                      <Area type="monotone" dataKey="latency" stroke="#10b981" fill="url(#latGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <div className="bg-black border border-white/10 p-1">
                <CardHeader className="pb-2"><CardTitle className="text-xs font-mono uppercase tracking-widest text-zinc-500">Latency (24h)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={metricsData}>
                      <defs><linearGradient id="latGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ffffff" stopOpacity={0.3} /><stop offset="95%" stopColor="#ffffff" stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#666', fontFamily: 'monospace' }} interval={5} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#666', fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#000', border: '1px solid #333', borderRadius: 0 }} itemStyle={{ color: '#fff', fontSize: '12px', fontFamily: 'monospace' }} />
                      <Area type="monotone" dataKey="latency" stroke="#fff" fill="url(#latGrad)" strokeWidth={1} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </div>
              <div className="bg-black border border-white/10 p-1">
                <CardHeader className="pb-2"><CardTitle className="text-xs font-mono uppercase tracking-widest text-zinc-500">Tasks & Errors (24h)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={metricsData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#666', fontFamily: 'monospace' }} interval={5} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#666', fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#000', border: '1px solid #333', borderRadius: 0 }} itemStyle={{ color: '#fff', fontSize: '12px', fontFamily: 'monospace' }} />
                      <Bar dataKey="tasks" fill="#333" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="errors" fill="#fff" radius={[0, 0, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </div>
            </div>
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
    { name: 'FREE', price: '$0', period: '/mo', desc: 'For solo indie operators', features: ['1 Agent Node', 'Basic Metrics', 'Community Support', '5-min Heartbeat'], cta: 'INITIALIZE', popular: false },
    { name: 'PRO', price: '$19', period: '/mo', desc: 'For scaling fleet commanders', features: ['Unlimited Nodes', 'Real-time Monitoring', 'Slack & Email Alerts', 'Team Access', 'Policy Engine', 'Priority Ops', '1-min Heartbeat'], cta: 'UPGRADE TO PRO', popular: true },
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
