import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

/**
 * Renders a dialog for adding a new agent to the fleet.
 *
 * This component displays a form where users can input the agent's name, gateway URL, and select a policy profile.
 * It utilizes the provided `handleAddAgent` function to handle form submission and updates the `newAgent` state
 * based on user input. The dialog also conditionally displays custom policies based on the user's tier.
 *
 * @param {Object} props - The properties for the component.
 * @param {boolean} props.open - Indicates if the dialog is open.
 * @param {function} props.onOpenChange - Function to handle dialog open state changes.
 * @param {function} props.handleAddAgent - Function to handle the addition of a new agent.
 * @param {Object} props.newAgent - The current state of the new agent being added.
 * @param {function} props.setNewAgent - Function to update the new agent state.
 * @param {string} props.tier - The tier of the user, which affects available policies.
 * @param {Array} props.customPolicies - List of custom policies available for selection.
 */
export function AddAgentDialog({ open, onOpenChange, handleAddAgent, newAgent, setNewAgent, tier, customPolicies }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-zinc-800 bg-zinc-950 text-white shadow-2xl">
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
  );
}
