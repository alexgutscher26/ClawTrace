'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, MoveLeft, Terminal } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background font-sans selection:bg-primary selection:text-primary-foreground">
            {/* Dynamic Grid Background */}
            <div className="grid-bg absolute inset-0 z-0 opacity-40" />

            {/* Ambient Glow */}
            <div className="absolute top-1/2 left-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-[120px]" />

            <main className="relative z-10 flex flex-col items-center px-6 text-center">
                {/* Animated Error Code */}
                <div className="relative mb-12 animate-in fade-in zoom-in duration-700">
                    <h1 className="text-[12rem] font-black leading-none tracking-tighter text-foreground sm:text-[18rem]">
                        404
                    </h1>
                    <div className="absolute -top-4 -right-4 flex h-24 w-24 items-center justify-center rounded-full border border-border/50 bg-card/50 backdrop-blur-xl">
                        <Terminal className="h-10 w-10 text-muted-foreground" />
                    </div>
                </div>

                {/* Messaging */}
                <div className="max-w-xl space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                    <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                        Signal Lost in Deep Space
                    </h2>
                    <p className="text-lg text-muted-foreground">
                        The agent coordinates you requested do not exist in the fleet registry.
                        It's possible the instance was decommissioned or moved to a restricted sector.
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="mt-12 flex flex-col gap-4 sm:flex-row animate-in fade-in slide-in-from-bottom-12 duration-700 delay-300">
                    <Button asChild size="lg" className="h-12 px-8 text-base font-semibold">
                        <Link href="/" className="gap-2">
                            <Home className="h-4 w-4" />
                            Return to Command Center
                        </Link>
                    </Button>
                    <Button
                        variant="outline"
                        size="lg"
                        className="h-12 border-border/50 bg-card/50 px-8 text-base font-semibold backdrop-blur-sm hover:bg-accent"
                        onClick={() => window.history.back()}
                    >
                        <div className="flex items-center gap-2">
                            <MoveLeft className="h-4 w-4" />
                            Previous Coordinates
                        </div>
                    </Button>
                </div>

                {/* Technical Metadata Footer */}
                <div className="mt-20 flex items-center gap-3 text-xs font-mono tracking-widest text-muted-foreground/40 uppercase animate-in fade-in duration-1000 delay-500">
                    <span className="h-1 w-1 rounded-full bg-destructive animate-pulse-dot" />
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
