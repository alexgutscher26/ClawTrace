'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Shield,
  Zap,
  Globe,
  Lock,
  Terminal,
  Code,
  Activity,
  Server,
  Cpu,
  Workflow
} from 'lucide-react';
import { useFleet } from '@/context/FleetContext';

// Technical Stat Component
/**
 * Renders a technical statistic display with a label, value, and optional status indicator.
 */
const TechStat = ({ label, value, status = 'normal' }) => (
  <div className="flex flex-col border-l border-white/10 pl-4 py-1">
    <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider mb-1">{label}</span>
    <div className="flex items-center gap-2">
      <span className="font-mono text-xl font-bold text-white tracking-tighter">{value}</span>
      {status === 'active' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
    </div>
  </div>
);

// Feature Block Component
/**
 * Renders a feature block with an icon, title, and description.
 */
const FeatureBlock = ({ icon: Icon, title, desc, delay }) => (
  <div
    className="group tech-card p-6 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 fill-mode-both"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="corner-accents absolute inset-0 pointer-events-none" />
    <div className="mb-6 flex justify-between items-start">
      <div className="p-2 bg-white/5 border border-white/10">
        <Icon className="h-5 w-5 text-white stroke-1" />
      </div>
      <span className="font-mono text-[10px] text-zinc-600">SYS-MOD-{Math.floor(Math.random() * 999)}</span>
    </div>
    <h3 className="text-lg font-bold uppercase tracking-wide mb-3 group-hover:text-emerald-500 transition-colors">
      {title}
    </h3>
    <p className="text-sm text-zinc-400 font-mono leading-relaxed">
      {desc}
    </p>
  </div>
);

/**
 * Renders the landing view of the application.
 */
export default function LandingView() {
  const { session, branding } = useFleet();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-emerald-900 selection:text-white overflow-x-hidden">
      {/* Background Grid */}
      <div className="fixed inset-0 bg-grid-tech pointer-events-none z-0" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)] pointer-events-none z-0" />

      {/* Top Status Bar (HUD) */}
      <div className="fixed top-0 w-full h-8 border-b border-white/10 bg-black/80 backdrop-blur-md z-50 items-center px-4 justify-between font-mono text-[10px] text-zinc-500 uppercase tracking-widest hidden md:flex">
        <div className="flex gap-6">
          <span>Freq: 60Hz</span>
          <span>Lat: 34.0522° N</span>
          <span>Lon: 118.2437° W</span>
          <span className="text-emerald-500">SYS: ONLINE</span>
        </div>
        <div className="flex gap-6">
          <span>Mem: 42%</span>
          <span>Load: 0.02</span>
          <span>Uptime: 99.999%</span>
        </div>
      </div>

      <Navbar session={session} branding={branding} transparent={false} />

      <main className="relative z-10 pt-32 pb-20 container mx-auto px-6">
        {/* Intro / Hero Area */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 border-b border-white/10 pb-24">
          <div className="lg:col-span-8 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 mb-8 animate-in fade-in slide-in-from-left-4 duration-700">
              <span className="h-px w-8 bg-emerald-500" />
              <span className="font-mono text-emerald-500 text-xs tracking-widest uppercase">
                Orchestration Protocol v2.0
              </span>
            </div>

            <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-[0.85] mb-12 animate-glitch cursor-default">
              TOTAL<br />
              CONTROL<br />
              <span className="text-stroke-1 text-transparent bg-clip-text bg-white/10">PLANE</span>
            </h1>

            <div className="flex flex-col md:flex-row gap-8 items-start md:items-center max-w-2xl">
              <p className="font-mono text-sm text-zinc-400 leading-relaxed max-w-md border-l-2 border-emerald-500 pl-6">
                 // DIRECTIVE: ELIMINATE LATENCY<br />
                Establish real-time bilateral command links with your entire infrastructure.
                Execute at silicon speed.
              </p>

              <div className="flex gap-4">
                <Link href={session ? '/dashboard' : '/register'}>
                  <Button className="h-14 bg-white text-black hover:bg-emerald-500 hover:text-black rounded-none px-8 font-mono font-bold uppercase tracking-wider text-xs border border-transparent transition-all">
                    Initialize System
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="h-14 rounded-none px-8 font-mono text-xs uppercase tracking-wider border-white/20 hover:bg-white/5 text-white"
                  onClick={() => window.open('https://github.com/alexgutscher26/fleet', '_blank')}
                >
                  Docs_Reference
                </Button>
              </div>
            </div>
          </div>

          {/* Right Side Technical Graphic */}
          <div className="lg:col-span-4 hidden lg:flex flex-col justify-between border-l border-white/10 pl-12 py-4">
            <div className="space-y-8">
              <TechStat label="Active Agents" value="8,492" status="active" />
              <TechStat label="Commands/Sec" value="142.5k" />
              <TechStat label="Avg Latency" value="0.2ms" />
              <TechStat label="Success Rate" value="99.99%" />
            </div>

            <div className="mt-12 bg-grid-tech-small h-48 w-full border border-white/10 relative opacity-50">
              <div className="absolute top-1/2 left-0 w-full h-px bg-emerald-500/50" />
              <div className="absolute top-0 left-1/2 w-px h-full bg-emerald-500/50" />
              <div className="absolute inset-0 flex items-center justify-center animate-pulse">
                <div className="h-2 w-2 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]" />
              </div>
            </div>
          </div>
        </section>

        {/* System capabilities (Features) */}
        <section className="py-24">
          <div className="flex items-end justify-between mb-12 border-b border-white/10 pb-4">
            <h2 className="text-3xl font-bold uppercase tracking-tight">System Modules</h2>
            <span className="font-mono text-xs text-zinc-500">INDEX: 01-06</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/10 border border-white/10">
            {/* Using a 1px gap grid for that 'segmented' feel */}
            <div className="bg-black">
              <FeatureBlock
                icon={Zap}
                title="Zero-Latency Sync"
                desc="WebSocket bi-directional streams ensure state consistency across distributed nodes."
                delay={100}
              />
            </div>
            <div className="bg-black">
              <FeatureBlock
                icon={Shield}
                title="Cryptographic Mesh"
                desc="End-to-end AES-256 encryption. Zero-knowledge architecture by default."
                delay={200}
              />
            </div>
            <div className="bg-black">
              <FeatureBlock
                icon={Terminal}
                title="Remote Shell"
                desc="Direct stdout/stderr piping. Execute arbitrary commands on any connected node."
                delay={300}
              />
            </div>
            <div className="bg-black">
              <FeatureBlock
                icon={Globe}
                title="Global Edge"
                desc="Distributed control plane ensures command delivery regardless of network topology."
                delay={400}
              />
            </div>
            <div className="bg-black">
              <FeatureBlock
                icon={Activity}
                title="Telemetry Stream"
                desc="Real-time resource monitoring (CPU/RAM/Disk) with 1s resolution."
                delay={500}
              />
            </div>
            <div className="bg-black">
              <FeatureBlock
                icon={Workflow}
                title="Auto-Scaling"
                desc="Define policies to automatically provision or decommission agents based on load."
                delay={600}
              />
            </div>
          </div>
        </section>

        {/* Ticker / Marquee */}
        <section className="border-y border-white/10 py-6 overflow-hidden bg-white/5 mb-24">
          <div className="flex whitespace-nowrap gap-12 font-mono text-xs uppercase tracking-[0.2em] text-zinc-400 animate-shine">
            {Array(10).fill("SYSTEM STATUS: NOMINAL // ALL SYSTEMS GO // SECURE CONNECTION ESTABLISHED //").map((t, i) => (
              <span key={i}>{t}</span>
            ))}
          </div>
        </section>

        {/* CLI Section */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="font-mono text-emerald-500 text-xs">
              $ fleet --version
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase">
              The CLI is<br />
              The Platform
            </h2>
            <p className="text-zinc-400 max-w-md font-mono text-sm leading-relaxed">
              Don't leave your terminal. Manage your entire fleet using our Rust-based CLI optimized for speed and scriptability.
            </p>
            <div className="space-y-4 font-mono text-sm text-zinc-500">
              <div className="flex gap-4 border-b border-white/5 py-4">
                <span className="text-white min-w-[120px]">fleet list</span>
                <span>List all active agents</span>
              </div>
              <div className="flex gap-4 border-b border-white/5 py-4">
                <span className="text-white min-w-[120px]">fleet exec</span>
                <span>Run command on targets</span>
              </div>
              <div className="flex gap-4 border-b border-white/5 py-4">
                <span className="text-white min-w-[120px]">fleet logs</span>
                <span>Stream logs in real-time</span>
              </div>
            </div>
          </div>

          <div className="bg-[#0a0a0a] border border-white/10 p-2">
            <div className="h-full border border-white/5 bg-black p-6 font-mono text-xs md:text-sm overflow-hidden">
              <div className="flex gap-2 mb-4 text-zinc-600">
                <div className="h-3 w-3 rounded-full border border-white/20" />
                <div className="h-3 w-3 rounded-full border border-white/20" />
                <div className="h-3 w-3 rounded-full border border-white/20" />
              </div>
              <div className="space-y-2 text-zinc-300">
                <p><span className="text-emerald-500">➜</span> <span className="text-blue-400">~</span> fleet connect --secure</p>
                <p className="text-zinc-500">Establishing encrypted tunnel...</p>
                <p className="text-zinc-500">Verifying handshake...</p>
                <p className="text-emerald-500">Connected to 142 nodes.</p>
                <p className="invisible">_</p>
                <p><span className="text-emerald-500">➜</span> <span className="text-blue-400">~</span> fleet status --all</p>
                <div className="grid grid-cols-3 gap-8 py-2 text-zinc-400">
                  <span>NODE-01</span>
                  <span className="text-emerald-500">ONLINE</span>
                  <span>12ms</span>
                </div>
                <div className="grid grid-cols-3 gap-8 py-2 text-zinc-400">
                  <span>NODE-02</span>
                  <span className="text-emerald-500">ONLINE</span>
                  <span>45ms</span>
                </div>
                <div className="grid grid-cols-3 gap-8 py-2 text-zinc-400">
                  <span>NODE-03</span>
                  <span className="text-yellow-500">WARN</span>
                  <span>112ms</span>
                </div>
                <p className="animate-pulse">_</p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-32 border-t border-white/10 pt-12 pb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-5 w-5 text-white fill-white" />
                <span className="font-mono font-bold text-lg tracking-tighter">FLEET<span className="text-emerald-500">_OS</span></span>
              </div>
              <p className="font-mono text-[10px] text-zinc-600 max-w-[200px] uppercase">
                Orchestration for the machine age.
              </p>
            </div>

            <div className="grid grid-cols-2 md:flex gap-12 font-mono text-xs uppercase tracking-wider text-zinc-500">
              <div className="flex flex-col gap-4">
                <span className="text-white font-bold">Product</span>
                <Link href="/pricing" className="hover:text-emerald-500 transition-colors">Pricing</Link>
                <Link href="/changelog" className="hover:text-emerald-500 transition-colors">Changelog</Link>
              </div>
              <div className="flex flex-col gap-4">
                <span className="text-white font-bold">Resources</span>
                <Link href="/docs" className="hover:text-emerald-500 transition-colors">Documentation</Link>
                <Link href="/blog" className="hover:text-emerald-500 transition-colors">Blog</Link>
              </div>
              <div className="flex flex-col gap-4">
                <span className="text-white font-bold">Legal</span>
                <Link href="/privacy" className="hover:text-emerald-500 transition-colors">Privacy</Link>
                <Link href="/terms" className="hover:text-emerald-500 transition-colors">Terms of Service</Link>
              </div>
            </div>
          </div>

          <div className="mt-12 flex justify-between items-center bg-zinc-900/50 p-4 border border-white/5">
            <span className="font-mono text-[10px] text-zinc-600">
              SYSTEM: v2.4.0-RC1
            </span>
            <span className="font-mono text-[10px] text-zinc-600">
              © 2026 CLAWTRACE INC.
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
}
