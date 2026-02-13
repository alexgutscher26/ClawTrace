import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import posthog from 'posthog-js';
import { toast } from 'sonner';
import { Server, Plus, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import Navbar from '@/components/Navbar';
import { useFleet } from '@/context/FleetContext';
import { useRouter } from 'next/navigation';
import EmergencyModelSwitcher from '@/components/EmergencyModelSwitcher';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { AgentsTable } from '@/components/dashboard/AgentsTable';
import { AddAgentDialog } from '@/components/dashboard/AddAgentDialog';
import { RecentAlerts } from '@/components/dashboard/RecentAlerts';

/**
 * Renders the dashboard view for managing AI agents and monitoring their status.
 *
 * This component fetches and displays various statistics related to the agent fleet, including total agents, operational status, and alerts. It handles user interactions for adding and deleting agents, as well as resolving alerts. The component utilizes multiple hooks to manage state and side effects, ensuring data is loaded and updated appropriately based on user actions and API responses. The loading state is managed to provide feedback during data fetching, and the component also supports demo environment seeding.
 *
 * @returns {JSX.Element} The rendered dashboard view.
 */

/**
 * Renders the dashboard view for managing AI agents within a fleet.
 *
 * This component handles the state and lifecycle of the dashboard, including fetching data from the API, managing agent and alert states, and providing real-time updates via subscriptions. It also includes functionality for adding, deleting, and resolving agents and alerts, as well as handling user navigation and session management. The component utilizes various hooks to manage state and side effects, ensuring a responsive user experience.
 *
 * @returns {JSX.Element} The rendered dashboard view.
 */
export default function DashboardView() {
  const { session, api, masterPassphrase, branding } = useFleet();
  const router = useRouter();
  const navigate = useCallback((path) => router.push(path), [router]);
  const [selectedFleet, setSelectedFleet] = useState(null);
  const [tier, setTier] = useState('free');
  const [limits, setLimits] = useState({ max_agents: 1, alerts: false, teams: false });
  const [customPolicies, setCustomPolicies] = useState([]);
  const [fleets, setFleets] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [agents, setAgents] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [newAgent, setNewAgent] = useState({ name: '', gateway_url: '', policy_profile: 'dev' });

  useEffect(() => {
    if (!loading && !session) {
      navigate('/');
    }
  }, [loading, session]);

  useEffect(() => {
    if (!session) return;
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
          toast.message('New Alert', {
            description: `${payload.new.type}: ${payload.new.message}`,
          });
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
            <Badge
              variant="outline"
              className="animate-pulse gap-1.5 border-emerald-500/50 bg-emerald-500/10 py-1 text-emerald-400"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
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
            <Button
              size="sm"
              variant="destructive"
              className="border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20"
              onClick={() => setEmergencyOpen(true)}
            >
              <AlertTriangle className="mr-1 h-4 w-4" />
              EMERGENCY
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <StatsCards stats={stats} />

        {/* Empty State */}
        {agents.length === 0 && (
          <Card className="glass-card border-dashed">
            <CardContent className="py-16 text-center">
              <Server className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
              <h3 className="mb-2 text-lg font-semibold">No agents yet</h3>
              <p className="text-muted-foreground mb-6 text-sm">
                Get started by adding your first agent.
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setAddOpen(true)}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add Agent
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
        <AgentsTable
          agents={agents}
          totalPages={totalPages}
          page={page}
          setPage={setPage}
          navigate={navigate}
          handleDeleteAgent={handleDeleteAgent}
        />

        {/* Alerts */}
        <RecentAlerts alerts={alerts} handleResolveAlert={handleResolveAlert} />
      </div>

      {/* Add Agent Dialog */}
      <AddAgentDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        handleAddAgent={handleAddAgent}
        newAgent={newAgent}
        setNewAgent={setNewAgent}
        tier={tier}
        customPolicies={customPolicies}
      />

      {/* Emergency Switcher Component */}
      <EmergencyModelSwitcher
        open={emergencyOpen}
        onOpenChange={setEmergencyOpen}
        api={api}
        fleetId={selectedFleet}
      />
    </div>
  );
}
