'use client';
import Navbar from '@/components/Navbar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const CHANGELOG_DATA = [
  {
    date: 'February 2026',
    version: 'v1.6.0',
    title: 'Policy Enforcement & Core Stability',
    items: [
      {
        type: 'feature',
        text: 'Implemented Policy Enforcement Engine with Guardrails (Budget, Time, Tools).',
      },
      {
        type: 'feature',
        text: 'Added real-time policy syncing via agent heartbeats.',
      },
      {
        type: 'improvement',
        text: 'Enhanced CLI with Service Mode, Auto-Discovery, and Plugin System.',
      },
      {
        type: 'security',
        text: 'Hardened Agent Handshake with signed JWTs and rate limiting.',
      },
    ],
  },
  {
    date: 'February 2026',
    version: 'v1.5.1',
    title: 'Accessibility & Navigation',
    items: [
      {
        type: 'feature',
        text: 'Added global Command Palette (Cmd+K) for instant navigation and agent search.',
      },
      {
        type: 'improvement',
        text: 'Implemented comprehensive ARIA labels and semantic structure for better screen reader support.',
      },
      {
        type: 'improvement',
        text: 'Enhanced keyboard navigation within complex data tables and interactive elements.',
      },
    ],
  },
  {
    date: 'February 2026',
    version: 'v1.5.0',
    title: 'App Router & Global Context Architecture',
    items: [
      {
        type: 'feature',
        text: 'Migrated from useHashRouter to Next.js App Router for better SEO and performance.',
      },
      {
        type: 'feature',
        text: 'Implemented FleetProvider (Context API) for centralized session and branding management.',
      },
      {
        type: 'improvement',
        text: 'Refactored component logic to use standardized Next.js hooks (useRouter, useParams).',
      },
      {
        type: 'improvement',
        text: 'Added professional project documentation (README, .env.example).',
      },
    ],
  },
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

import { useFleet } from '@/context/FleetContext';

/**
 * Renders the changelog view displaying platform updates and release information.
 */
export default function ChangelogView() {
  const { session, branding } = useFleet();
  return (
    <div className="bg-background min-h-screen text-white">
      <Navbar session={session} branding={branding} />

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
                          className={`mt-0.5 h-fit shrink-0 rounded-sm px-2 py-1 font-mono text-[9px] font-bold tracking-tighter uppercase ${item.type === 'feature'
                              ? 'bg-white text-black'
                              : item.type === 'security'
                                ? 'bg-red-500 text-white'
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
