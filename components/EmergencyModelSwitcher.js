'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Zap, RotateCw } from 'lucide-react';
import { MODEL_PRICING } from '@/lib/pricing';

/**
 * Renders the Emergency Model Switcher component for rotating AI models.
 *
 * This component allows users to select a model to rotate from and to, and executes the rotation
 * by making an API call. It manages the loading state during the operation and provides feedback
 * through toast notifications. The component also ensures that the action applies to all agents
 * matching the selected 'From' model, with updates occurring on the next heartbeat.
 *
 * @param {Object} props - The component properties.
 * @param {boolean} props.open - Indicates if the dialog is open.
 * @param {function} props.onOpenChange - Function to handle dialog open/close state.
 * @param {function} props.api - API function to make requests.
 * @param {string} props.fleetId - Identifier for the fleet of agents.
 */
export default function EmergencyModelSwitcher({ open, onOpenChange, api, fleetId }) {
  const [fromModel, setFromModel] = useState('gpt-4');
  const [toModel, setToModel] = useState('claude-3-opus');
  const [executing, setExecuting] = useState(false);

  const handleRotation = async () => {
    setExecuting(true);
    try {
      const res = await api('/api/emergency/rotate', {
        method: 'POST',
        body: JSON.stringify({ fromModel, toModel, fleetId }),
      });

      if (res.success) {
        toast.success(res.message);
        onOpenChange(false);
        // Force refresh via window reload or context if possible (simple reload for emergency)
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.error(res.error || 'Rotation failed');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setExecuting(false);
    }
  };

  const models = Object.keys(MODEL_PRICING);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-red-500/30 bg-black shadow-2xl shadow-red-500/10">
        <DialogHeader>
          <div className="mb-2 flex items-center justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500">
              <Zap className="h-6 w-6" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl font-bold tracking-widest text-red-500 uppercase">
            Emergency Model Switcher
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-400">
            Instantly rotate all agents from one model to another. <br />
            Use this during provider outages (e.g., OpenAI Down).
          </DialogDescription>
        </DialogHeader>

        <div className="my-6 space-y-4 rounded-lg border border-red-500/20 bg-red-500/5 p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 block text-xs font-bold text-zinc-500 uppercase">
                Rotate FROM
              </Label>
              <Select value={fromModel} onValueChange={setFromModel}>
                <SelectTrigger className="border-red-500/20 bg-black text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block text-xs font-bold text-zinc-500 uppercase">
                Rotate TO
              </Label>
              <Select value={toModel} onValueChange={setToModel}>
                <SelectTrigger className="border-emerald-500/20 bg-black text-emerald-400">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded bg-black/40 p-3 text-xs text-zinc-400">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <span>
              Action will be applied to <strong>ALL agents</strong> matching 'From'. Agents will
              update on next heartbeat.
            </span>
          </div>
        </div>

        <DialogFooter className="sm:justify-center">
          <Button
            variant="destructive"
            className="w-full bg-red-600 font-bold tracking-wider hover:bg-red-700"
            onClick={handleRotation}
            disabled={executing || fromModel === toModel}
          >
            {executing ? (
              <>
                <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                ROTATING FLEET...
              </>
            ) : (
              'EXECUTE EMERGENCY ROTATION'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
