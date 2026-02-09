import React, { useState, useEffect, useCallback } from 'react';
import posthog from 'posthog-js';
import { toast } from 'sonner';
import { MessageSquare, Terminal, Lock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import Navbar from '@/components/Navbar';

import { useFleet } from '@/context/FleetContext';
import { useRouter } from 'next/navigation';

export default function SettingsView() {
  const { api, session, branding: initialBranding, setBranding: setGlobalBranding } = useFleet();
  const router = useRouter();
  const navigate = (path) => router.push(path);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newChannel, setNewChannel] = useState({ name: '', type: 'slack', webhook_url: '' });
  const [tier, setTier] = useState('free');
  const [policies, setPolicies] = useState([]);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [newPolicy, setNewPolicy] = useState({
    name: '',
    label: '',
    description: '',
    skills: '',
    tools: '',
    heartbeat_interval: 300,
  });
  const [branding, setBranding] = useState(initialBranding || { domain: '', name: '' });
  const [savingBranding, setSavingBranding] = useState(false);

  useEffect(() => {
    if (initialBranding) setBranding(initialBranding);
  }, [initialBranding]);

  useEffect(() => {
    api('/api/billing')
      .then((res) => {
        const p = res.subscription?.plan || 'free';
        setTier(p.toLowerCase());
      })
      .catch(() => { });
  }, [api]);

  useEffect(() => {
    if (tier === 'enterprise') {
      api('/api/enterprise/branding')
        .then((res) => {
          if (res.branding) setBranding(res.branding);
        })
        .catch(() => { });
    }
  }, [tier, api]);

  const loadPolicies = useCallback(async () => {
    try {
      const res = await api('/api/custom-policies');
      setPolicies(res.policies || []);
    } catch (err) {
      if (err.message === 'Unauthorized') return;
      toast.error('Failed to load policies');
      console.error(err);
    }
  }, [api]);

  useEffect(() => {
    if (tier === 'enterprise' || tier === 'pro') loadPolicies();
  }, [tier, loadPolicies]);

  const loadChannels = useCallback(async () => {
    try {
      const res = await api('/api/alert-channels');
      setChannels(res.channels || []);
    } catch (err) {
      if (err.message === 'Unauthorized') return;
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  const handleAddChannel = async () => {
    try {
      await api('/api/alert-channels', {
        method: 'POST',
        body: JSON.stringify({
          name: newChannel.name,
          type: newChannel.type,
          config: { webhook_url: newChannel.webhook_url },
        }),
      });
      toast.success('Channel added!');
      posthog.capture('alert_channel_created', { type: newChannel.type });
      setAddOpen(false);
      setNewChannel({ name: '', type: 'slack', webhook_url: '' });
      loadChannels();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAddPolicy = async () => {
    try {
      await api('/api/custom-policies', {
        method: 'POST',
        body: JSON.stringify({
          ...newPolicy,
          skills: newPolicy.skills
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          tools: newPolicy.tools
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      toast.success('Custom policy created!');
      setPolicyOpen(false);
      setNewPolicy({
        name: '',
        label: '',
        description: '',
        skills: '',
        tools: '',
        heartbeat_interval: 300,
      });
      loadPolicies();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeletePolicy = (id) => {
    toast('Delete this custom policy?', {
      action: {
        label: 'Confirm',
        onClick: async () => {
          try {
            await api(`/api/custom-policies/${id}`, { method: 'DELETE' });
            toast.success('Policy removed');
            loadPolicies();
          } catch (err) {
            toast.error(err.message);
          }
        },
      },
    });
  };

  const handleSaveBranding = async () => {
    setSavingBranding(true);
    try {
      const res = await api('/api/enterprise/branding', {
        method: 'POST',
        body: JSON.stringify(branding),
      });
      if (res.branding && setGlobalBranding) {
        setGlobalBranding(res.branding);
      }
      toast.success('Branding updated successfully');
      posthog.capture('enterprise_branding_updated', {
        has_domain: !!branding.domain,
        has_name: !!branding.name,
      });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingBranding(false);
    }
  };

  const isFree = tier === 'free';
  const isEnterprise = tier === 'enterprise';

  const UpgradeGate = ({ title, desc }) => (
    <Card className="rounded-none border-white bg-black p-12 text-center shadow-none">
      <div className="mb-6 flex justify-center">
        <div className="flex h-16 w-16 rotate-45 items-center justify-center border border-white/20 bg-white/5">
          <Lock className="h-6 w-6 -rotate-45 text-white" />
        </div>
      </div>
      <h3 className="mb-2 text-xl font-bold tracking-tight uppercase italic">
        SECURED FOR {title}
      </h3>
      <p className="mx-auto mb-8 max-w-sm text-sm font-light tracking-wider text-zinc-500 uppercase">
        {desc}
      </p>
      <Button
        onClick={() => navigate('/pricing')}
        className="h-12 rounded-none bg-white px-8 text-xs font-black tracking-widest text-black uppercase hover:bg-zinc-200"
      >
        UPGRADE PROTOCOL
      </Button>
    </Card>
  );

  return (
    <div className="font-geist min-h-screen bg-black pt-24 pb-12">
      <Navbar session={session} branding={branding} />
      <div className="container mx-auto max-w-4xl px-6">
        <div className="mb-12">
          <h1 className="mb-2 text-4xl font-black tracking-tighter italic">CONTROL CENTER</h1>
          <p className="text-[10px] font-light tracking-[0.3em] text-zinc-500 uppercase">
            Global configurations and security protocols
          </p>
        </div>

        <Tabs defaultValue="alerts" className="space-y-8">
          <TabsList className="h-auto w-full justify-start gap-8 rounded-none border-b border-white/10 bg-black p-0">
            <TabsTrigger
              value="alerts"
              className="rounded-none border-b-2 border-transparent px-0 pb-4 text-xs font-black tracking-widest text-zinc-500 uppercase transition-all data-[state=active]:border-white data-[state=active]:bg-transparent data-[state=active]:text-white"
            >
              Alert Channels
            </TabsTrigger>
            <TabsTrigger
              value="policies"
              className="rounded-none border-b-2 border-transparent px-0 pb-4 text-xs font-black tracking-widest text-zinc-500 uppercase transition-all data-[state=active]:border-white data-[state=active]:bg-transparent data-[state=active]:text-white"
            >
              Custom Policies
            </TabsTrigger>
            <TabsTrigger
              value="branding"
              className="rounded-none border-b-2 border-transparent px-0 pb-4 text-xs font-black tracking-widest text-zinc-500 uppercase transition-all data-[state=active]:border-white data-[state=active]:bg-transparent data-[state=active]:text-white"
            >
              White-Labeling
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="alerts"
            className="animate-in fade-in slide-in-from-bottom-2 duration-500"
          >
            {isFree ? (
              <UpgradeGate
                title="SCALING TEAMS"
                desc="Real-time Slack, Discord, and Webhook alert protocols require a PRO or ENTERPRISE license."
              />
            ) : (
              <div className="space-y-6">
                {/* Channel List Logic */}
                <div className="mb-8 flex items-center justify-between border border-white/10 bg-white/5 p-6">
                  <div>
                    <h3 className="text-lg font-bold tracking-tight uppercase italic">
                      ALERT PIPELINES
                    </h3>
                    <p className="text-[10px] tracking-widest text-zinc-500 uppercase">
                      Configured dispatch routes for smart alerts
                    </p>
                  </div>
                  <Dialog open={addOpen} onOpenChange={setAddOpen}>
                    <DialogTrigger asChild>
                      <Button className="rounded-none bg-white text-xs font-bold text-black hover:bg-zinc-200">
                        ADD CHANNEL
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md rounded-none border-white bg-black p-10 text-white">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-black tracking-tighter uppercase italic">
                          NEW PIPELINE
                        </DialogTitle>
                        <DialogDescription className="text-[10px] tracking-widest text-zinc-500 uppercase">
                          Connect external notification systems
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-6 py-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-400 uppercase">
                            CHANNEL NAME
                          </label>
                          <Input
                            value={newChannel.name}
                            onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
                            className="h-12 rounded-none border-white/20 bg-zinc-900 transition-all transition-colors focus:border-white"
                            placeholder="PRODUCTION-SLACK"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-400 uppercase">
                            INTEGRATION TYPE
                          </label>
                          <select
                            value={newChannel.type}
                            onChange={(e) => setNewChannel({ ...newChannel, type: e.target.value })}
                            className="h-12 w-full rounded-none border border-white/20 bg-zinc-900 px-3 text-sm outline-none focus:border-white"
                          >
                            <option value="slack">SLACK WEBHOOK</option>
                            <option value="discord">DISCORD WEBHOOK</option>
                            <option value="webhook">GENERIC WEBHOOK</option>
                            <option value="email">EMAIL (RESERVED)</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-400 uppercase">
                            WEBHOOK URL
                          </label>
                          <Input
                            value={newChannel.webhook_url}
                            onChange={(e) =>
                              setNewChannel({ ...newChannel, webhook_url: e.target.value })
                            }
                            className="h-12 rounded-none border-white/20 bg-zinc-900 transition-all transition-colors focus:border-white"
                            placeholder="https://hooks.slack.com/services/..."
                          />
                        </div>
                      </div>
                      <Button
                        onClick={handleAddChannel}
                        className="h-14 w-full bg-white text-xs font-black tracking-widest text-black uppercase italic hover:bg-zinc-200"
                      >
                        INITIALIZE CHANNEL
                      </Button>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="grid gap-4">
                  {loading ? (
                    <div className="animate-pulse p-12 text-center font-mono tracking-[0.3em] text-zinc-500 uppercase">
                      SYNCHRONIZING...
                    </div>
                  ) : (
                    channels.map((c) => (
                      <div
                        key={c.id}
                        className="group flex items-center justify-between border border-white/10 bg-black p-6 transition-all hover:bg-white/5"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center border border-white/10 bg-white/5 transition-all group-hover:border-white/30">
                            {c.type === 'slack' ? (
                              <MessageSquare className="h-5 w-5" />
                            ) : (
                              <Terminal className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold tracking-tight uppercase">{c.name}</h4>
                            <p className="text-[10px] tracking-widest text-zinc-500 uppercase">
                              {c.type} pipe
                            </p>
                          </div>
                        </div>
                        <div
                          className={`px-3 py-1 text-[8px] font-black tracking-widest uppercase ${c.active ? 'bg-zinc-800 text-emerald-400' : 'bg-red-950 text-red-500'}`}
                        >
                          {c.active ? 'CONNECTED' : 'TERMINATED'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent
            value="policies"
            className="animate-in fade-in slide-in-from-bottom-2 duration-500"
          >
            {tier === 'enterprise' ? (
              <div className="space-y-8">
                <div className="mb-8 flex items-center justify-between border border-white/10 bg-white/5 p-6">
                  <div>
                    <h3 className="text-lg font-bold tracking-tight uppercase italic">
                      CUSTOM DIRECTIVES
                    </h3>
                    <p className="text-[10px] tracking-widest text-zinc-500 uppercase">
                      Define granular agent execution policies
                    </p>
                  </div>
                  <Dialog open={policyOpen} onOpenChange={setPolicyOpen}>
                    <DialogTrigger asChild>
                      <Button className="rounded-none bg-white text-xs font-bold text-black hover:bg-zinc-200">
                        NEW POLICY
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-xl rounded-none border-white bg-black p-10 text-white">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-black tracking-tighter uppercase italic">
                          CREATE DIRECTIVE
                        </DialogTitle>
                      </DialogHeader>
                      <div className="grid grid-cols-2 gap-6 py-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-400 uppercase">
                            POLICY KEY (SLUG)
                          </label>
                          <Input
                            value={newPolicy.name}
                            onChange={(e) => setNewPolicy({ ...newPolicy, name: e.target.value })}
                            className="h-12 rounded-none border-white/20 bg-zinc-900"
                            placeholder="ops-hardened"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-400 uppercase">
                            DISPLAY LABEL
                          </label>
                          <Input
                            value={newPolicy.label}
                            onChange={(e) => setNewPolicy({ ...newPolicy, label: e.target.value })}
                            className="h-12 rounded-none border-white/20 bg-zinc-900"
                            placeholder="HARDENED OPS"
                          />
                        </div>
                        <div className="col-span-2 space-y-2">
                          <label className="text-[10px] font-black text-zinc-400 uppercase">
                            ALLOWED SKILLS (CSV)
                          </label>
                          <Input
                            value={newPolicy.skills}
                            onChange={(e) => setNewPolicy({ ...newPolicy, skills: e.target.value })}
                            className="h-12 rounded-none border-white/20 bg-zinc-900"
                            placeholder="monitoring, security, scaling"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-400 uppercase">
                            HEARTBEAT (SEC)
                          </label>
                          <Input
                            type="number"
                            value={newPolicy.heartbeat_interval}
                            onChange={(e) =>
                              setNewPolicy({
                                ...newPolicy,
                                heartbeat_interval: parseInt(e.target.value),
                              })
                            }
                            className="h-12 rounded-none border-white/20 bg-zinc-900"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-400 uppercase">
                            DATA ACCESS
                          </label>
                          <select
                            value={newPolicy.data_access}
                            onChange={(e) =>
                              setNewPolicy({ ...newPolicy, data_access: e.target.value })
                            }
                            className="h-12 w-full rounded-none border border-white/20 bg-zinc-900 px-3 text-sm"
                          >
                            <option value="restricted">RESTRICTED</option>
                            <option value="system-only">SYSTEM ONLY</option>
                            <option value="unrestricted">UNRESTRICTED</option>
                          </select>
                        </div>
                      </div>
                      <Button
                        onClick={handleAddPolicy}
                        className="h-14 w-full bg-white text-xs font-black tracking-widest text-black uppercase italic hover:bg-zinc-200"
                      >
                        COMMENCE POLICY
                      </Button>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="grid gap-4">
                  {policies.map((p) => (
                    <div
                      key={p.id}
                      className="group flex items-center justify-between border border-white/10 bg-black p-6 hover:bg-white/2"
                    >
                      <div className="flex items-center gap-6">
                        <div
                          className={`flex h-10 items-center justify-center border px-4 ${p.color} bg-black text-[10px] font-black tracking-widest uppercase italic`}
                        >
                          {p.label}
                        </div>
                        <div>
                          <h4 className="font-bold tracking-tight text-white/90 uppercase">
                            {p.name}
                          </h4>
                          <div className="mt-1 flex gap-2">
                            {p.skills?.slice(0, 3).map((s) => (
                              <span
                                key={s}
                                className="border border-white/5 px-2 py-0.5 text-[8px] text-zinc-500 uppercase"
                              >
                                {s}
                              </span>
                            ))}
                            {p.skills?.length > 3 && (
                              <span className="px-1 text-[8px] text-zinc-500 uppercase">
                                +{p.skills.length - 3} MORE
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeletePolicy(p.id)}
                        className="rounded-none text-zinc-600 hover:bg-red-500/10 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <UpgradeGate
                title="AGENCY CONTROLS"
                desc="Custom policy directives and RBAC engine require an ENTERPRISE license for large-scale operations."
              />
            )}
          </TabsContent>

          <TabsContent
            value="branding"
            className="animate-in fade-in slide-in-from-bottom-2 duration-500"
          >
            {tier === 'enterprise' ? (
              <Card className="rounded-none border-white bg-black p-10 shadow-none">
                <div className="mb-10">
                  <h3 className="mb-2 text-xl font-bold tracking-tighter uppercase italic">
                    WHITE-LABEL PROTOCOL
                  </h3>
                  <p className="text-[10px] font-light tracking-[0.2em] text-zinc-500 uppercase">
                    Custom organizational identity and domain routing
                  </p>
                </div>

                <div className="max-w-lg space-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">
                      ORGANIZATION NAME
                    </label>
                    <Input
                      value={branding.name}
                      onChange={(e) => setBranding({ ...branding, name: e.target.value })}
                      className="h-14 rounded-none border-white/20 bg-zinc-900 text-lg font-bold tracking-tighter uppercase transition-all focus:border-white"
                      placeholder="CYBERDYNE SYSTEMS"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">
                      CUSTOM DOMAIN
                    </label>
                    <Input
                      value={branding.domain}
                      onChange={(e) => setBranding({ ...branding, domain: e.target.value })}
                      className="h-14 rounded-none border-white/20 bg-zinc-900 font-mono transition-all focus:border-white"
                      placeholder="fleet.cyberdyne.io"
                    />
                  </div>
                  <Button
                    disabled={savingBranding}
                    onClick={handleSaveBranding}
                    className="h-14 w-full bg-white text-xs font-black tracking-widest text-black uppercase italic hover:bg-zinc-200"
                  >
                    {savingBranding ? 'SYNCHRONIZING...' : 'UPDATE IDENTITY'}
                  </Button>
                </div>
              </Card>
            ) : (
              <UpgradeGate
                title="WHITE-LABEL"
                desc="Organization branding, custom domains, and white-labeling are reserved for ENTERPRISE fleets."
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
