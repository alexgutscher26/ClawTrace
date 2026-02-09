'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

export default function SetupInstructions({ agentId, agentSecret }) {
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
