'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import TerminalMock from '@/components/TerminalMock';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Terminal as TerminalIcon,
  Shield,
  Radio,
  Server,
  Code,
  Zap,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

import { useFleet } from '@/context/FleetContext';

export default function LandingView() {
  const { session, branding } = useFleet();
  const [scrolled, setScrolled] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="font-geist min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <Navbar session={session} branding={branding} transparent={!scrolled} />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-20 md:pt-48 md:pb-32">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03),transparent_70%)]" />

        <div className="relative z-10 container mx-auto px-6">
          <div className="mx-auto mb-16 max-w-4xl text-center">
            <div className="animate-in fade-in slide-in-from-bottom-4 mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[10px] tracking-widest uppercase duration-500">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              v1.4.1 Release Live
            </div>

            <h1 className="animate-in fade-in slide-in-from-bottom-6 fill-mode-both mb-8 bg-linear-to-b from-white to-white/50 bg-clip-text text-5xl leading-[0.9] font-black tracking-tighter text-transparent duration-700 md:text-7xl">
              ORCHESTRATE YOUR <br />
              <span className="text-white italic">SILICON FLEET</span>
            </h1>

            <p className="animate-in fade-in slide-in-from-bottom-8 fill-mode-both mx-auto mb-10 max-w-2xl text-lg leading-relaxed font-light text-zinc-400 delay-100 duration-700 md:text-xl">
              A high-performance command center for autonomous agent swarms. Real-time telemetry,
              remote execution, and policy enforcement in a single binary.
            </p>

            <div className="animate-in fade-in slide-in-from-bottom-8 fill-mode-both flex flex-col items-center justify-center gap-4 delay-200 duration-700 sm:flex-row">
              <Link href={session ? '/dashboard' : '/register'}>
                <Button className="h-12 w-full rounded-none bg-white px-8 text-xs font-bold tracking-widest text-black uppercase transition-all hover:bg-zinc-200 sm:w-auto">
                  {session ? 'Enter Console' : 'Initialize Fleet'}{' '}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <div className="flex w-full items-center gap-4 sm:w-auto">
                <Button
                  variant="outline"
                  className="h-12 w-full rounded-none border-white/20 px-8 font-mono text-xs tracking-widest text-white uppercase hover:bg-white/10 sm:w-auto"
                  onClick={() => window.open('https://github.com/openclaw/fleet', '_blank')}
                >
                  <Code className="mr-2 h-4 w-4" /> GitHub
                </Button>
                <div className="font-mono text-xs text-zinc-500">
                  <span className="font-bold text-white">12.4k</span> stars
                </div>
              </div>
            </div>
          </div>

          {/* Terminal Demo */}
          <div className="animate-in fade-in slide-in-from-bottom-12 mx-auto max-w-5xl delay-300 duration-1000">
            <div className="group relative">
              <div className="absolute -inset-1 bg-linear-to-r from-emerald-500/20 via-blue-500/20 to-purple-500/20 opacity-50 blur-xl transition-opacity duration-1000 group-hover:opacity-100" />
              <TerminalMock />
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="border-t border-white/5 bg-zinc-950/50 py-24">
        <div className="container mx-auto px-6">
          <div className="grid gap-12 md:grid-cols-3">
            {[
              {
                icon: Zap,
                title: 'Real-time Telemetry',
                desc: 'Sub-millisecond latency heartbeat system via WebSocket. Monitor thousands of agents concurrently.',
              },
              {
                icon: Shield,
                title: 'Zero Trust Security',
                desc: 'Agent secrets never leave the edge. Payloads are E2E encrypted with AES-256-GCM.',
              },
              {
                icon: Radio,
                title: 'Remote Execution',
                desc: 'Dispatch shell commands to any node instantly. Stream stdout/stderr in real-time.',
              },
              {
                icon: Server,
                title: 'Self-Hosted First',
                desc: 'Deploy the entire stack with a single Docker Compose. You own your meaningful data.',
              },
              {
                icon: TerminalIcon,
                title: 'Developer Native',
                desc: 'Built by engineers, for engineers. TypeScript SDK, CLI tools, and REST API included.',
              },
              {
                icon: Code,
                title: 'Open Source',
                desc: 'MIT Licensed. Audit the code, fork it, extend it. No vendor lock-in ever.',
              },
            ].map((f, i) => (
              <div
                key={i}
                className="group border border-transparent p-6 transition-all duration-300 hover:border-white/10 hover:bg-white/5"
              >
                <f.icon className="mb-6 h-8 w-8 stroke-1 text-white" />
                <h3 className="mb-3 text-lg font-bold tracking-wide uppercase">{f.title}</h3>
                <p className="text-sm leading-relaxed font-light text-zinc-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden border-t border-white/5 py-32">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(45deg,rgba(0,0,0,0)_40%,rgba(255,255,255,0.03)_100%)]" />
        <div className="relative z-10 container mx-auto px-6 text-center">
          <h2 className="mb-8 text-4xl font-black tracking-tight uppercase italic md:text-5xl">
            Ready to command?
          </h2>
          <p className="mx-auto mb-10 max-w-xl font-mono text-sm text-zinc-500">
            Join 2,000+ developers building the next generation of autonomous infrastructure.
          </p>
          <Link href="/register">
            <Button className="h-14 rounded-none bg-white px-10 text-sm font-bold tracking-widest text-black uppercase hover:bg-zinc-200">
              Get Started Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black py-12 text-center">
        <div className="container mx-auto flex flex-col items-center px-6">
          <div className="mb-6 flex items-center gap-2 opacity-50 grayscale transition-all hover:grayscale-0">
            <Zap className="h-4 w-4 fill-white text-white" />
            <span className="font-mono font-bold tracking-tighter text-white">
              FLEET<span className="text-zinc-500">//</span>OS
            </span>
          </div>
          <p className="font-mono text-[10px] tracking-widest text-zinc-600 uppercase">
            © 2026 OpenClaw Systems Inc. • MIT License
          </p>
        </div>
      </footer>
    </div>
  );
}
