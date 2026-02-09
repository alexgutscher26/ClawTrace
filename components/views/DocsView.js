'use client';
import { useState } from 'react';
import Navbar from '@/components/Navbar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

import { useFleet } from '@/context/FleetContext';

export default function DocsView() {
  const { session, branding } = useFleet();
  const [activePage, setActivePage] = useState('Introduction');

  const sections = [
    {
      title: 'Getting Started',
      items: ['Introduction', 'Installation', 'Architecture', 'Quick Start'],
    },
    { title: 'Core Concepts', items: ['Agents', 'Fleets', 'Policies', 'Security'] },
    { title: 'API Reference', items: ['Authentication', 'Endpoints', 'Webhooks'] },
    { title: 'Guides', items: ['Deploying to AWS', 'Self-Hosting', 'Custom Agents'] },
  ];

  const content = {
    Introduction: {
      title: 'Introduction to Fleet',
      subtitle: 'Orchestrate your AI swarms.',
      body: (
        <div className="space-y-8">
          <p className="text-lg leading-relaxed text-zinc-400">
            Fleet is a lightweight, secure, and scalable orchestration platform for managing
            autonomous AI agent swarms. Designed for high-performance environments, it provides
            real-time telemetry, remote execution, and policy enforcement.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              { title: 'Zero Latency', desc: 'Real-time state synchronization via WebSocket.' },
              {
                title: 'E2E Encryption',
                desc: 'Client-side encryption for all sensitive payloads.',
              },
              { title: 'Policy Engine', desc: 'Granular RBAC and execution constraints.' },
              { title: 'Self-Hosted', desc: 'Deploy anywhere with a single Docker container.' },
            ].map((f, i) => (
              <div key={i} className="border border-white/10 bg-black p-4">
                <h3 className="mb-2 text-sm font-bold tracking-wide text-white uppercase">
                  {f.title}
                </h3>
                <p className="text-xs text-zinc-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    Installation: {
      title: 'Installation',
      subtitle: 'Deploying the Fleet Agent.',
      body: (
        <div className="space-y-6">
          <p className="text-zinc-400">
            The Fleet Agent is a standalone binary that runs on Linux, macOS, and Windows. It
            connects to the Fleet Gateway and executes commands from the Control Plane.
          </p>
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white uppercase">
              One-Line Install (Linux/macOS)
            </h3>
            <div className="border border-white/10 bg-zinc-950 p-4 font-mono text-xs text-emerald-400">
              curl -sL https://fleet.sh/install | bash
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white uppercase">NPM Global Install</h3>
            <div className="border border-white/10 bg-zinc-950 p-4 font-mono text-xs text-emerald-400">
              npm install -g openclaw-fleet-monitor
            </div>
          </div>
        </div>
      ),
    },
    Architecture: {
      title: 'System Architecture',
      subtitle: 'How Fleet fits together.',
      body: (
        <div className="space-y-8">
          <Card className="border-white/10 bg-black p-6">
            <pre className="font-mono text-xs whitespace-pre-wrap text-zinc-400">
              {`[CONTROL PLANE] <---> [GATEWAY] <---> [AGENTS]
      |                   |
  [DASHBOARD]        [DATABASE]`}
            </pre>
          </Card>
          <div className="space-y-4 text-sm text-zinc-400">
            <p>
              <strong className="text-white">Control Plane:</strong> The brain of the operation.
              Handles API requests, auth, and state.
            </p>
            <p>
              <strong className="text-white">Gateway:</strong> High-performance WebSocket server
              dealing with agent connections.
            </p>
            <p>
              <strong className="text-white">Agents:</strong> Lightweight daemons running on edge
              compute (EC2, Droplets, Raspberry Pi).
            </p>
          </div>
        </div>
      ),
    },
    'Quick Start': {
      title: 'Quick Start',
      subtitle: 'From zero to fleet in 5 minutes.',
      body: (
        <div className="space-y-6">
          <ol className="list-inside list-decimal space-y-4 text-sm text-zinc-400">
            <li>
              Create an account to get your{' '}
              <span className="bg-white/10 px-1 font-mono text-white">FLEET_KEY</span>.
            </li>
            <li>Run the install script on your target machine.</li>
            <li>
              Enter your <span className="bg-white/10 px-1 font-mono text-white">FLEET_KEY</span>{' '}
              when prompted.
            </li>
            <li>Check the Dashboard to see your new agent online.</li>
          </ol>
        </div>
      ),
    },
    Agents: {
      title: 'Agents',
      subtitle: 'The workers of your fleet.',
      body: (
        <div className="space-y-6">
          <p className="text-zinc-400">
            Agents are the leaf nodes of the Fleet network. They are responsible for:
          </p>
          <ul className="list-inside list-disc space-y-2 text-sm text-zinc-400">
            <li>Reporting telemetry (CPU, Mem, Disk, Net)</li>
            <li>Executing received commands</li>
            <li>Streaming logs back to the gateway</li>
            <li>Managing local child processes</li>
          </ul>
        </div>
      ),
    },
    Fleets: {
      title: 'Fleets',
      subtitle: 'Grouping and organization.',
      body: (
        <div className="space-y-6">
          <p className="text-zinc-400">
            Fleets allow you to group agents logically. You can target commands to entire fleets
            instead of individual agents.
          </p>
          <div className="border border-yellow-500/20 bg-yellow-500/10 p-4 text-xs text-yellow-200">
            <strong>NOTE:</strong> Fleet grouping features are available on the PRO plan.
          </div>
        </div>
      ),
    },
    Policies: {
      title: 'Policies',
      subtitle: 'Governance and RBAC.',
      body: (
        <div className="space-y-6">
          <p className="text-zinc-400">
            Policies define what an agent is allowed to do. You can restrict:
          </p>
          <ul className="list-inside list-disc space-y-2 text-sm text-zinc-400">
            <li>Available shell commands</li>
            <li>Resource usage limits</li>
            <li>Network whitelist/blacklist</li>
          </ul>
        </div>
      ),
    },
    Security: {
      title: 'Security',
      subtitle: 'Zero-knowledge architecture.',
      body: (
        <div className="space-y-6">
          <p className="text-zinc-400">
            Fleet uses a zero-knowledge architecture. The server never sees your agent secrets or
            configuration details in plain text.
          </p>
          <p className="text-zinc-400">
            We use <strong className="text-white">AES-256-GCM</strong> for client-side encryption.
            The decryption key lives only in your browser's session storage.
          </p>
        </div>
      ),
    },
    Authentication: {
      title: 'Authentication',
      subtitle: 'API Security and Tokens.',
      body: (
        <div className="space-y-6">
          <p className="text-zinc-400">
            All API requests require a Bearer token. You can generate API tokens in the Settings
            panel.
          </p>
          <pre className="border border-white/10 bg-zinc-950 p-4 font-mono text-xs text-zinc-400">
            Authorization: Bearer sk_live_...
          </pre>
        </div>
      ),
    },
    Endpoints: {
      title: 'Endpoints',
      subtitle: 'REST API Reference.',
      body: (
        <div className="space-y-4">
          <div className="border border-white/10 p-4">
            <span className="mr-2 bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-400">
              GET
            </span>
            <span className="font-mono text-sm text-white">/api/agents</span>
            <p className="mt-2 text-xs text-zinc-500">List all active agents.</p>
          </div>
          <div className="border border-white/10 p-4">
            <span className="mr-2 bg-blue-500/10 px-2 py-1 text-xs font-bold text-blue-400">
              POST
            </span>
            <span className="font-mono text-sm text-white">/api/cmd</span>
            <p className="mt-2 text-xs text-zinc-500">Dispatch a command to an agent or fleet.</p>
          </div>
        </div>
      ),
    },
    Webhooks: {
      title: 'Webhooks',
      subtitle: 'Event subscriptions.',
      body: (
        <p className="text-zinc-400">
          Receive HTTP POST callbacks for events like Agent Online, Agent Offline, and Alert
          Triggered.
        </p>
      ),
    },
    'Deploying to AWS': {
      title: 'Deploying to AWS',
      subtitle: 'Production setup guide.',
      body: (
        <p className="text-zinc-400">
          Use our Terraform provider to spin up a high-availability Fleet cluster on ECS Fargate.
        </p>
      ),
    },
    'Self-Hosting': {
      title: 'Self-Hosting',
      subtitle: 'Run Fleet on your own metal.',
      body: (
        <div className="space-y-4">
          <p className="text-zinc-400">
            Fleet provides a Docker Compose file for easy self-hosting.
          </p>
          <pre className="border border-white/10 bg-zinc-950 p-4 font-mono text-xs text-emerald-400">
            docker compose up -d
          </pre>
        </div>
      ),
    },
    'Custom Agents': {
      title: 'Custom Agents',
      subtitle: 'Building with the SDK.',
      body: (
        <p className="text-zinc-400">
          Use the Fleet Node.js SDK to build custom agents that integrate directly with your
          application logic.
        </p>
      ),
    },
  };

  const activeContent = content[activePage] || content['Introduction'];

  return (
    <div className="bg-background flex min-h-screen flex-col text-white">
      <Navbar session={session} branding={branding} />
      <div className="flex flex-1 pt-16">
        {/* Sidebar */}
        <div className="fixed top-16 bottom-0 hidden w-64 overflow-y-auto border-r border-white/10 bg-black p-6 md:block">
          <div className="space-y-8">
            {sections.map((section, i) => (
              <div key={i}>
                <h4 className="mb-4 text-xs font-bold tracking-widest text-white uppercase">
                  {section.title}
                </h4>
                <ul className="space-y-2">
                  {section.items.map((item, j) => (
                    <li key={j}>
                      <button
                        onClick={() => setActivePage(item)}
                        className={`w-full text-left text-[13px] transition-colors ${activePage === item ? 'font-bold text-emerald-400' : 'text-zinc-500 hover:text-white'}`}
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
        <div className="min-h-screen flex-1 bg-zinc-950/50 md:ml-64">
          <div className="mx-auto max-w-4xl px-8 py-12">
            <div className="mb-12 border-b border-white/10 pb-8">
              <Badge
                variant="outline"
                className="mb-4 border-emerald-500/30 bg-emerald-500/5 px-3 py-1 font-mono text-[10px] tracking-widest text-emerald-400 uppercase"
              >
                Documentation
              </Badge>
              <h1 className="mb-4 text-4xl font-black tracking-tight uppercase italic">
                {activeContent.title}
              </h1>
              <p className="text-lg leading-relaxed font-light text-zinc-400">
                {activeContent.subtitle}
              </p>
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
