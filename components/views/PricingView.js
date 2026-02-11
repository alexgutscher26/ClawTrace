'use client';
import { useState } from 'react';
import Navbar from '@/components/Navbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

import { useFleet } from '@/context/FleetContext';

export default function PricingView() {
  const { session, api, branding } = useFleet();
  const router = useRouter();
  const [isYearly, setIsYearly] = useState(false);
  const [loading, setLoading] = useState(null);

  const tiers = [
    {
      name: 'FREE',
      price: '$0',
      period: '/mo',
      desc: 'For solo indie operators',
      features: ['1 Agent Node', 'Community Support', '5-min Heartbeat'],
      cta: 'INITIALIZE',
      popular: false,
    },
    {
      name: 'PRO',
      price: isYearly ? '$15' : '$19',
      period: '/mo',
      desc: 'For scaling fleet commanders',
      features: [
        'Unlimited Nodes',
        'Real-time Monitoring',
        'Slack & Email Alerts',
        'Policy Engine',
        'Priority Ops',
        '1-min Heartbeat',
      ],
      cta: 'UPGRADE TO PRO',
      popular: true,
    },
    {
      name: 'ENTERPRISE',
      price: isYearly ? '$79' : '$99',
      period: '/mo',
      desc: 'For agencies & large systems',
      features: [
        'Everything in Pro',
        'Custom Policies',
        'SSO / SAML',
        'Dedicated Ops',
        '99.99% SLA',
        'Custom Integrations',
        'On-Premise Option',
      ],
      cta: 'CONTACT SALES',
      popular: false,
    },
  ];

  const handleUpgrade = async (plan) => {
    if (!session) return router.push('/register');
    if (plan === 'FREE') return router.push('/dashboard');
    if (plan === 'ENTERPRISE') {
      window.location.href = 'mailto:sales@clawtrace.dev?subject=Enterprise Fleet Inquiry';
      return;
    }

    setLoading(plan);
    try {
      const res = await api('/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan: plan.toLowerCase(), yearly: isYearly }),
      });
      if (res.checkout_url) {
        window.location.href = res.checkout_url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <Navbar session={session} branding={branding} />
      <div className="font-geist container mx-auto px-6 pt-32 pb-20">
        <div className="mb-16 text-center">
          <Badge className="mb-6 cursor-default rounded-none border-white/20 bg-white/10 px-3 py-1 font-mono text-xs tracking-widest text-white uppercase hover:bg-white/20">
            Pricing Protocols
          </Badge>
          <h1 className="mb-6 text-5xl font-black tracking-tighter italic md:text-6xl">
            TRANSPARENT SCALING
          </h1>
          <p className="mx-auto mb-12 max-w-xl text-lg font-light text-zinc-400">
            Start free. Scale when you're ready. No hidden fees.
          </p>

          <div className="flex items-center justify-center gap-4">
            <span
              className={`font-mono text-[10px] tracking-[0.2em] uppercase transition-colors ${!isYearly ? 'font-bold text-white' : 'text-zinc-500'}`}
            >
              Monthly
            </span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className="group relative h-6 w-11 rounded-none border border-white/10 bg-zinc-900 transition-all hover:border-white/30"
            >
              <div
                className={`absolute top-1 bottom-1 w-4 bg-white transition-all duration-300 ${isYearly ? 'left-[26px]' : 'left-1'}`}
              />
            </button>
            <div className="flex items-center gap-2">
              <span
                className={`font-mono text-[10px] tracking-[0.2em] uppercase transition-colors ${isYearly ? 'font-bold text-white' : 'text-zinc-500'}`}
              >
                Yearly
              </span>
              <Badge className="animate-pulse rounded-none border-none bg-white px-1 py-0 text-[8px] font-black text-black">
                20% OFF
              </Badge>
            </div>
          </div>
        </div>
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`relative border p-8 ${t.popular ? 'border-white bg-white/5 shadow-[0_0_50px_-12px_rgba(255,255,255,0.2)]' : 'border-white/10 bg-black'} group flex flex-col backdrop-blur-sm transition-all hover:border-white/30`}
            >
              {t.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-3 py-1 text-[10px] font-bold tracking-widest text-black uppercase">
                  Recommended
                </div>
              )}
              <div className="mb-10 text-center">
                <h3 className="mb-2 text-2xl font-black tracking-tight uppercase transition-all group-hover:italic">
                  {t.name}
                </h3>
                <p className="mb-8 font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
                  {t.desc}
                </p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-6xl font-black tracking-tighter">{t.price}</span>
                  <span className="font-mono text-sm text-zinc-500">{t.period}</span>
                </div>
                {isYearly && t.name !== 'FREE' && (
                  <p className="mt-4 inline-block bg-white/5 px-3 py-1 font-mono text-[10px] text-white/40 uppercase">
                    Billed annually
                  </p>
                )}
              </div>
              <ul className="mb-10 flex flex-1 flex-col gap-4">
                {t.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-4 text-sm text-zinc-400 transition-colors group-hover:text-zinc-200"
                  >
                    <div className="h-1.5 w-1.5 shrink-0 rotate-45 bg-white/30 transition-all group-hover:bg-white" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                disabled={loading === t.name}
                className={`h-14 w-full rounded-none text-xs font-black tracking-widest uppercase transition-all ${t.popular ? 'bg-white text-black shadow-xl hover:bg-zinc-200' : 'border border-white/20 bg-black text-white hover:bg-white hover:text-black'}`}
                onClick={() => handleUpgrade(t.name)}
              >
                {loading === t.name ? 'PROCESSING...' : t.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
