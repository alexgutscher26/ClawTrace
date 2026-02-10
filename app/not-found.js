'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, MoveLeft, Terminal } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="bg-background selection:bg-primary selection:text-primary-foreground relative flex min-h-screen flex-col items-center justify-center overflow-hidden font-sans">
      {/* Dynamic Grid Background */}
      <div className="grid-bg absolute inset-0 z-0 opacity-40" />

      {/* Ambient Glow */}
      <div className="bg-primary/5 absolute top-1/2 left-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]" />

      <main className="relative z-10 flex flex-col items-center px-6 text-center">
        {/* Animated Error Code */}
        <div className="animate-in fade-in zoom-in relative mb-12 duration-700">
          <h1 className="text-foreground text-[12rem] leading-none font-black tracking-tighter sm:text-[18rem]">
            404
          </h1>
          <div className="border-border/50 bg-card/50 absolute -top-4 -right-4 flex h-24 w-24 items-center justify-center rounded-full border backdrop-blur-xl">
            <Terminal className="text-muted-foreground h-10 w-10" />
          </div>
        </div>

        {/* Messaging */}
        <div className="animate-in fade-in slide-in-from-bottom-8 max-w-xl space-y-4 delay-200 duration-700">
          <h2 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">
            Signal Lost in Deep Space
          </h2>
          <p className="text-muted-foreground text-lg">
            The agent coordinates you requested do not exist in the fleet registry. It's possible
            the instance was decommissioned or moved to a restricted sector.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="animate-in fade-in slide-in-from-bottom-12 mt-12 flex flex-col gap-4 delay-300 duration-700 sm:flex-row">
          <Button asChild size="lg" className="h-12 px-8 text-base font-semibold">
            <Link href="/" className="gap-2">
              <Home className="h-4 w-4" />
              Return to Command Center
            </Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="border-border/50 bg-card/50 hover:bg-accent h-12 px-8 text-base font-semibold backdrop-blur-sm"
            onClick={() => window.history.back()}
          >
            <div className="flex items-center gap-2">
              <MoveLeft className="h-4 w-4" />
              Previous Coordinates
            </div>
          </Button>
        </div>

        {/* Technical Metadata Footer */}
        <div className="text-muted-foreground/40 animate-in fade-in mt-20 flex items-center gap-3 font-mono text-xs tracking-widest uppercase delay-500 duration-1000">
          <span className="bg-destructive animate-pulse-dot h-1 w-1 rounded-full" />
          Error: ERR_INSTANCE_NOT_FOUND
          <span className="mx-2 opacity-30">|</span>
          Registry: FLEET-V2
        </div>
      </main>

      {/* Retro Scanline Effect */}
      <div className="scanline pointer-events-none" />
    </div>
  );
}
