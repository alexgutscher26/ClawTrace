'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Bell, Plus, AlertTriangle, Slack, Webhook } from 'lucide-react';
import { toast } from 'sonner';

export default function SmartAlertsCard({ agent, api }) {
  const [configs, setConfigs] = useState([]);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingConfig, setAddingConfig] = useState(false);
  const [newConfig, setNewConfig] = useState({
    channel_id: '',
    cpu_threshold: 90,
    mem_threshold: 90,
    latency_threshold: 1000,
  });

  const loadAlertData = useCallback(async () => {
    try {
      const [confRes, chanRes] = await Promise.all([
        api(`/api/alert-configs?agent_id=${agent.id}`),
        api('/api/alert-channels'),
      ]);
      setConfigs(confRes.configs || []);
      setChannels(chanRes.channels || []);
    } catch (err) {
      if (err.message === 'Unauthorized') return;
      toast.error('Failed to load alert configuration');
      console.error('Failed to load alert data:', err);
    } finally {
      setLoading(false);
    }
  }, [api, agent.id]);

  useEffect(() => {
    loadAlertData();
  }, [loadAlertData]);

  const handleAddConfig = async () => {
    if (!newConfig.channel_id) return toast.error('Select a channel');
    try {
      await api('/api/alert-configs', {
        method: 'POST',
        body: JSON.stringify({ ...newConfig, agent_id: agent.id }),
      });
      toast.success('Alert configured!');
      setAddingConfig(false);
      loadAlertData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="border-b border-white/5 bg-white/2 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-emerald-400" />
            <CardTitle className="font-mono text-xs tracking-widest text-zinc-400 uppercase">
              Smart Alerts
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setAddingConfig(true)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-0 pt-4">
        {loading ? (
          <div className="text-muted-foreground p-4 text-center text-xs">Loading alerts...</div>
        ) : configs.length === 0 ? (
          <div className="space-y-3 p-8 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5">
              <AlertTriangle className="h-5 w-5 text-zinc-600" />
            </div>
            <div>
              <p className="text-xs font-bold tracking-tight text-white uppercase">
                No alerts active
              </p>
              <p className="mt-1 text-[10px] text-zinc-500">
                Get notified via Slack or email when thresholds are exceeded.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 border-white/10 text-[10px] font-bold hover:bg-white/5"
              onClick={() => setAddingConfig(true)}
            >
              CONFIGURE ALERTS
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {configs.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-3 transition-colors hover:bg-white/2"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-sm border border-emerald-500/20 bg-emerald-500/10">
                    {c.channel?.type === 'slack' ? (
                      <Slack className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Webhook className="h-3.5 w-3.5 text-emerald-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-white">{c.channel?.name}</p>
                    <p className="font-mono text-[9px] text-zinc-500 uppercase">
                      CPU &gt; {c.cpu_threshold}% • LAT &gt; {c.latency_threshold}ms
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="border-white/10 bg-emerald-400/5 font-mono text-[9px] text-emerald-400"
                >
                  ACTIVE
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={addingConfig} onOpenChange={setAddingConfig}>
        <DialogContent className="border-white/10 bg-black text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm tracking-widest uppercase">
              New Smart Alert
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Route threshold alerts to a notification channel.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label className="text-[10px] text-zinc-500 uppercase">Channel</Label>
              <Select
                value={newConfig.channel_id}
                onValueChange={(v) => setNewConfig((p) => ({ ...p, channel_id: v }))}
              >
                <SelectTrigger className="h-9 border-white/5 bg-zinc-900 text-xs">
                  <SelectValue placeholder="Select Channel" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-black">
                  {channels.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name} ({c.type.toUpperCase()})
                    </SelectItem>
                  ))}
                  {channels.length === 0 && (
                    <p className="p-2 text-[10px] text-zinc-500">
                      No channels configured. Go to Settings.
                    </p>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-[10px] text-zinc-500 uppercase">CPU Threshold (%)</Label>
                <Input
                  type="number"
                  className="h-9 border-white/5 bg-zinc-900 text-xs"
                  value={newConfig.cpu_threshold}
                  onChange={(e) =>
                    setNewConfig((p) => ({ ...p, cpu_threshold: parseInt(e.target.value) }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] text-zinc-500 uppercase">
                  Latency Threshold (ms)
                </Label>
                <Input
                  type="number"
                  className="h-9 border-white/5 bg-zinc-900 text-xs"
                  value={newConfig.latency_threshold}
                  onChange={(e) =>
                    setNewConfig((p) => ({ ...p, latency_threshold: parseInt(e.target.value) }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="border-white/10 text-xs"
              onClick={() => setAddingConfig(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-emerald-500 text-xs font-bold text-black hover:bg-emerald-600"
              onClick={handleAddConfig}
            >
              ACTIVATE ALERT
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
