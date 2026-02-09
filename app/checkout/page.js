'use client';

import posthog from 'posthog-js';
import Navbar from '@/components/Navbar';
import { useFleet } from '@/context/FleetContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Zap, Shield, CreditCard } from 'lucide-react';

/**
 * Renders the checkout page for purchasing a Pro subscription.
 */
export default function CheckoutPage() {
  const { session, branding } = useFleet();

  /**
   * Captures a purchase event in PostHog.
   */
  function handlePurchase() {
    posthog.capture('purchase_completed', {
      amount: 99,
      currency: 'USD',
      plan: 'PRO_MONTHLY',
    });
    alert('Purchase event captured in PostHog!');
  }

  return (
    <div className="bg-background min-h-screen">
      <Navbar session={session} branding={branding} />
      <div className="flex min-h-screen items-center justify-center pt-20 pb-10">
        <Card className="glass-card w-full max-w-md border-white/5 bg-white/2">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center bg-white/5">
              <Zap className="h-6 w-6 text-emerald-400" />
            </div>
            <CardTitle className="text-3xl font-black tracking-tighter uppercase italic">
              Upgrade to Pro
            </CardTitle>
            <CardDescription className="font-mono text-[10px] tracking-widest uppercase">
              Secure the keys to your silicon fleet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-none border border-white/10 bg-black/50 p-4 font-mono">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500 uppercase">Product</span>
                <span className="text-white">PRO ORCHESTRATOR</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-zinc-500 uppercase">Interval</span>
                <span className="text-white">MONTHLY RECURRING</span>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                <span className="text-sm font-bold uppercase italic">Total</span>
                <span className="font-mono text-2xl font-black text-emerald-400">$99.00</span>
              </div>
            </div>

            <div className="space-y-3 font-mono text-[10px] leading-relaxed text-zinc-500 uppercase">
              <div className="flex items-center gap-2">
                <Shield className="h-3 w-3 text-emerald-500" />
                <span>Unlimited Fleet Nodes</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-3 w-3 text-emerald-500" />
                <span>Custom Policy Guardrails</span>
              </div>
            </div>

            <Button
              onClick={handlePurchase}
              className="h-14 w-full rounded-none bg-emerald-500 text-xs font-black tracking-widest text-black uppercase hover:bg-emerald-400"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Complete purchase
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
