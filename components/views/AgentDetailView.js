import React, { useState, useEffect, useCallback } from 'react';
import posthog from 'posthog-js';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Server,
  RefreshCw,
  Copy,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Cpu,
  HardDrive,
  Wifi,
  Shield,
  Terminal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import Navbar from '@/components/Navbar';
import SmartAlertsCard from '@/components/SmartAlertsCard';
import SetupInstructions from '@/components/SetupInstructions';
import { STATUS_CONFIG, timeAgo } from '@/lib/view-utils';
import { getPolicy } from '@/lib/policies';
import { encryptE2EE } from '@/lib/client-crypto';

import { useFleet } from '@/context/FleetContext';
import { useRouter, useParams } from 'next/navigation';

/**
 * Renders the agent detail view, displaying agent information and configuration options.
 *
 * This component fetches agent data and billing information, manages state for loading, restarting, and saving configurations, and handles user interactions for updating agent policies and configurations. It utilizes various hooks to manage side effects and API calls, ensuring a responsive UI that reflects the current state of the agent. The component also includes error handling and user feedback through toast notifications.
 *
 * @returns {JSX.Element|null} The rendered component or null if the agent is not found.
 */
export default function AgentDetailView() {
  const { session, api, masterPassphrase, branding } = useFleet();
  const router = useRouter();
  const params = useParams();
  const agentId = params.id;
  const navigate = (path) => router.push(path);
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

      setAgent({ ...res.agent, config_json: config });
      setConfigEdit(JSON.stringify(config, null, 2));
    } catch (err) {
      if (err.message === 'Unauthorized') return;
      toast.error('Failed to load agent');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [api, agentId, navigate]);

  useEffect(() => {
    loadAgent();
  }, [loadAgent]);

  const handleRestart = async () => {
    setRestarting(true);
    try {
      await api(`/api/agents/${agentId}/restart`, { method: 'POST' });
      toast.success('Restart initiated');
      posthog.capture('agent_restart_triggered', { agent_id: agentId });
      loadAgent();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRestarting(false);
    }
  };

  /**
   * Handles the saving of the configuration.
   *
   * This function sets a saving state and attempts to parse the configuration from `configEdit`.
   * If a master passphrase is provided, it encrypts the configuration using E2EE before sending it
   * to the API for saving. It captures an event for analytics and handles any errors that may occur
   * during the process, displaying an appropriate error message. Finally, it resets the saving state.
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
      posthog.capture('agent_config_updated', {
        agent_id: agentId,
        e2ee_enabled: !!masterPassphrase,
      });
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
      <Navbar session={session} branding={branding} />
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
