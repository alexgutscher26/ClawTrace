import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import posthog from 'posthog-js';
import { toast } from 'sonner';
import {
  Server,
  CheckCircle,
  XCircle,
  BarChart3,
  Plus,
  RefreshCw,
  Database,
  Trash2,
  Eye,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Navbar from '@/components/Navbar';
import { STATUS_CONFIG, timeAgo } from '@/lib/view-utils';
import { getPolicy } from '@/lib/policies';
import { useFleet } from '@/context/FleetContext';
import { useRouter } from 'next/navigation';

/**
 * Renders the dashboard view for managing AI agents and monitoring their status.
 *
 * This component fetches and displays various statistics related to the agent fleet, including total agents, operational status, and alerts. It handles user interactions for adding and deleting agents, as well as resolving alerts. The component utilizes multiple hooks to manage state and side effects, ensuring data is loaded and updated appropriately based on user actions and API responses. The loading state is managed to provide feedback during data fetching, and the component also supports demo environment seeding.
 *
 * @returns {JSX.Element} The rendered dashboard view.
 */
export default function DashboardView() {
  const { session, api, masterPassphrase, branding } = useFleet();
  const router = useRouter();
  const navigate = (path) => router.push(path);
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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [newAgent, setNewAgent] = useState({ name: '', gateway_url: '', policy_profile: 'dev' });

  useEffect(() => {
    api('/api/billing')
      .then((res) => {
        const p = res.subscription?.plan || 'free';
        setTier(p.toLowerCase());
        if (res.limits) setLimits(res.limits[p.toLowerCase()] || res.limits.free);
      })
      .catch(() => { });
  }, [api]);

  useEffect(() => {
    if (tier === 'enterprise' || tier === 'pro') {
      api('/api/custom-policies')
        .then((res) => setCustomPolicies(res.policies || []))
        .catch(() => { });
    }
  }, [api, tier]);

  // Realtime subscription
  useEffect(() => {
    if (!selectedFleet) return;

    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agents',
          filter: `fleet_id=eq.${selectedFleet}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setAgents((prev) => [...prev, payload.new]);
            setStats((prev) => ({
              ...prev,
              total_agents: (prev?.total_agents || 0) + 1,
            }));
          } else if (payload.eventType === 'UPDATE') {
            setAgents((prev) =>
              prev.map((agent) => (agent.id === payload.new.id ? payload.new : agent))
            );
            // Pulse effect can be handled via CSS/state if needed, but the status update handles the visual
          } else if (payload.eventType === 'DELETE') {
            setAgents((prev) => prev.filter((agent) => agent.id !== payload.old.id));
            setStats((prev) => ({
              ...prev,
              total_agents: Math.max(0, (prev?.total_agents || 0) - 1),
            }));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
        },
        (payload) => {
          setAlerts((prev) => [payload.new, ...prev]);
          toast.message('New Alert', { description: `${payload.new.type}: ${payload.new.message}` });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedFleet]);

  useEffect(() => {
    if (loading) loadData();
  }, [loading]); // Only run once on mount via loading check, but defined this way to be safe

  const loadData = useCallback(async () => {
    try {
      const [statsRes, fleetsRes, alertsRes] = await Promise.all([
        api('/api/dashboard/stats'),
        api('/api/fleets'),
        api('/api/alerts'),
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
      let url = selectedFleet ? `/api/agents?fleet_id=${selectedFleet}` : '/api/agents';
      url += (url.includes('?') ? '&' : '?') + `page=${page}&limit=50`;
      const res = await api(url);
      setAgents(res.agents);
      if (res.meta) setTotalPages(res.meta.pages);
    } catch (err) {
      if (err.message === 'Unauthorized') return;
      toast.error('Failed to load agents');
      console.error(err);
    }
  }, [api, selectedFleet, page]);

  useEffect(() => {
    setPage(1);
  }, [selectedFleet]);

  useEffect(() => {
    if (!loading) loadAgents();
  }, [loadAgents, loading, selectedFleet, page]);

  /**
   * Seeds the demo environment and handles success or error notifications.
   */
  const handleSeedDemo = async () => {
    setSeeding(true);
    try {
      await api('/api/demo/seed', { method: 'POST' });
      toast.success('Demo environment provisioned');
      posthog.capture('demo_environment_seeded');
      window.location.reload();
    } catch (err) {
      toast.error(err.message);
      setSeeding(false);
    }
  };

  /**
   * Handles the addition of a new agent.
   *
   * This function prevents the default form submission behavior and checks if the maximum number of agents has been reached, displaying an error message if the limit is exceeded. If the limit is not exceeded, it sends a POST request to register the new agent with the provided details. Upon successful registration, it captures an event, resets the form state, and reloads the agents and data. In case of an error during the API call, it displays an error message.
   *
   * @param {Event} e - The event object from the form submission.
   */
  const handleAddAgent = async (e) => {
    e.preventDefault();
    if (agents.length >= limits.max_agents && limits.max_agents !== -1) {
      toast.error(`Plan limit reached (${limits.max_agents} agents). Upgrade to Pro.`);
      return;
    }

    try {
      await api('/api/agents', {
        method: 'POST',
        body: JSON.stringify({
          name: newAgent.name,
          gateway_url: newAgent.gateway_url,
          fleet_id: selectedFleet,
          policy_profile: newAgent.policy_profile,
        }),
      });
      toast.success('Agent registered successfully');
      posthog.capture('agent_registered', {
        policy: newAgent.policy_profile,
        fleet_id: selectedFleet,
      });
      setAddOpen(false);
      setNewAgent({ name: '', gateway_url: '' });
      setPage(1);
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
        },
      },
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

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-emerald-400" />
      </div>
    );

  return (
    <div className="bg-background min-h-screen">
      <Navbar session={session} branding={branding} />
      <div className="container mx-auto px-6 pt-20 pb-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Fleet Dashboard</h1>
            <p className="text-muted-foreground text-sm">Monitor and manage your AI agent fleet</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 animate-pulse bg-emerald-500/10 gap-1.5 py-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              LIVE
            </Badge>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Agent
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { label: 'TOTAL AGENTS', value: stats.total_agents, icon: Server },
              { label: 'OPERATIONAL', value: stats.healthy, icon: CheckCircle },
              { label: 'ERRORS', value: stats.error, icon: XCircle },
              {
                label: 'TASKS EXECUTED',
                value: stats.total_tasks?.toLocaleString(),
                icon: BarChart3,
              },
            ].map((s) => (
              <div
                key={s.label}
                className="group flex items-start justify-between border border-white/10 bg-black p-6 transition-colors hover:border-white/30"
              >
                <div>
                  <div className="mb-1 text-3xl font-black tracking-tighter text-white">
                    {s.value}
                  </div>
                  <div className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
                    {s.label}
                  </div>
                </div>
                <s.icon className="h-5 w-5 text-zinc-700 transition-colors group-hover:text-white" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {agents.length === 0 && (
          <Card className="glass-card border-dashed">
            <CardContent className="py-16 text-center">
              <Server className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
              <h3 className="mb-2 text-lg font-semibold">No agents yet</h3>
              <p className="text-muted-foreground mb-6 text-sm">
                Get started by adding your first agent or load demo data to explore.
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setAddOpen(true)}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add Agent
                </Button>
                <Button variant="outline" onClick={handleSeedDemo} disabled={seeding}>
                  <Database className="mr-1 h-4 w-4" />
                  {seeding ? 'Loading...' : 'Load Demo Data'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fleet Selector */}
        {fleets.length > 0 && (
          <div className="mb-4 flex items-center gap-3">
            <span className="text-muted-foreground text-sm">Fleet:</span>
            <Select value={selectedFleet || ''} onValueChange={setSelectedFleet}>
              <SelectTrigger className="h-9 w-[200px]">
                <SelectValue placeholder="Select fleet" />
              </SelectTrigger>
              <SelectContent>
                {fleets.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
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
                  <thead>
                    <tr className="border-border/40 border-b">
                      <th className="text-muted-foreground p-3 text-left text-xs font-medium">
                        Name
                      </th>
                      <th className="text-muted-foreground p-3 text-left text-xs font-medium">
                        Status
                      </th>
                      <th className="text-muted-foreground hidden p-3 text-left text-xs font-medium md:table-cell">
                        Gateway
                      </th>
                      <th className="text-muted-foreground p-3 text-left text-xs font-medium">
                        Policy
                      </th>
                      <th className="text-muted-foreground hidden p-3 text-left text-xs font-medium md:table-cell">
                        Model
                      </th>
                      <th className="text-muted-foreground hidden p-3 text-left text-xs font-medium lg:table-cell">
                        Location
                      </th>
                      <th className="text-muted-foreground p-3 text-left text-xs font-medium">
                        Heartbeat
                      </th>
                      <th className="text-muted-foreground p-3 text-right text-xs font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map((agent) => {
                      const sc = STATUS_CONFIG[agent.status] || STATUS_CONFIG.offline;
                      return (
                        <tr
                          key={agent.id}
                          className="cursor-pointer border-b border-white/5 transition hover:bg-white/5"
                          onClick={() => navigate(`/dashboard/agents/${agent.id}`)}
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`h-1.5 w-1.5 rounded-full ${agent.status === 'healthy' ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : agent.status === 'error' ? 'animate-pulse bg-red-500' : 'bg-zinc-600'}`}
                              />
                              <span className="text-sm font-bold tracking-tight">{agent.name}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge
                              variant="outline"
                              className={`${sc.text} ${sc.border} rounded-none bg-transparent font-mono text-[10px] tracking-wider uppercase`}
                            >
                              {sc.label}
                            </Badge>
                          </td>
                          <td className="hidden p-3 font-mono text-xs text-zinc-500 uppercase md:table-cell">
                            {agent.gateway_url}
                          </td>
                          <td className="p-3">
                            <Badge
                              variant="outline"
                              className={`${getPolicy(agent.policy_profile).color} ${getPolicy(agent.policy_profile).bg} border-opacity-50 rounded-none font-mono text-[9px] tracking-tighter`}
                            >
                              {getPolicy(agent.policy_profile).label}
                            </Badge>
                          </td>
                          <td className="hidden p-3 text-sm text-zinc-400 md:table-cell">
                            {agent.model}
                          </td>
                          <td className="hidden p-3 text-sm text-zinc-400 lg:table-cell">
                            {agent.location || 'UNKNOWN'}
                          </td>
                          <td className="p-3 font-mono text-sm text-zinc-500">
                            {timeAgo(agent.last_heartbeat)}
                          </td>
                          <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
                                onClick={() => navigate(`/dashboard/agents/${agent.id}`)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-zinc-600 hover:bg-transparent hover:text-red-500"
                                onClick={() => handleDeleteAgent(agent.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
            {totalPages > 1 && (
              <div className="flex items-center justify-end gap-2 border-t border-white/10 p-2">
                <span className="text-xs text-zinc-500">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Alerts */}
        {alerts.length > 0 && (
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-center justify-between rounded-lg p-3 ${alert.resolved ? 'bg-muted/20' : 'border border-red-500/20 bg-red-500/5'}`}
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle
                      className={`h-4 w-4 ${alert.resolved ? 'text-muted-foreground' : 'text-red-400'}`}
                    />
                    <div>
                      <p className="text-sm font-medium">
                        {alert.agent_name}: {alert.type}
                      </p>
                      <p className="text-muted-foreground text-xs">{alert.message}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      {timeAgo(alert.created_at)}
                    </span>
                    {!alert.resolved && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleResolveAlert(alert.id)}
                      >
                        Resolve
                      </Button>
                    )}
                    {alert.resolved && (
                      <Badge
                        variant="outline"
                        className="border-emerald-500/30 text-xs text-emerald-400"
                      >
                        Resolved
                      </Badge>
                    )}
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
            <DialogDescription>
              Add an OpenClaw agent to your fleet. Paste the gateway URL or Droplet info.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddAgent} className="space-y-4">
            <div>
              <Label>Agent Name</Label>
              <Input
                placeholder="alpha-coder"
                value={newAgent.name}
                onChange={(e) => setNewAgent((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label>Gateway URL</Label>
              <Input
                placeholder="http://192.168.1.100:8080"
                value={newAgent.gateway_url}
                onChange={(e) => setNewAgent((p) => ({ ...p, gateway_url: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label>Policy Profile</Label>
              <Select
                value={newAgent.policy_profile || 'dev'}
                onValueChange={(v) => setNewAgent((p) => ({ ...p, policy_profile: v }))}
              >
                <SelectTrigger className="h-10 w-full rounded-none border-white/20 bg-zinc-900 text-xs">
                  <SelectValue placeholder="Select Policy" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-black">
                  <SelectItem value="dev" className="text-xs">
                    Developer (Full Access)
                  </SelectItem>
                  <SelectItem value="ops" className="text-xs">
                    Operations (System Only)
                  </SelectItem>
                  <SelectItem value="exec" className="text-xs">
                    Executive (Read Only)
                  </SelectItem>
                  {(tier === 'enterprise' || tier === 'pro') && customPolicies.length > 0 && (
                    <>
                      <Separator className="my-2 bg-white/10" />
                      <div className="px-2 py-1.5 font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
                        Custom Policies
                      </div>
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

            <DialogFooter>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                Register Agent
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
