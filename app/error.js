'use client';

import { useEffect, useState } from 'react';
import posthog from 'posthog-js';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCcw, ChevronDown, ChevronUp, Bug, Terminal } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function Error({ error, reset }) {
    const [showTechnical, setShowTechnical] = useState(false);

    useEffect(() => {
        // Log the error to console and PostHog
        console.error('Runtime Exception Captured:', error);
        if (typeof window !== 'undefined' && posthog.__loaded) {
            posthog.captureException(error, {
                severity: 'critical',
                path: window.location.href,
                component_stack: error?.stack,
            });
        }
    }, [error]);

    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background font-sans selection:bg-destructive selection:text-destructive-foreground">
            {/* Dynamic Grid Background with Red Tint */}
            <div className="grid-bg absolute inset-0 z-0 opacity-20" style={{ filter: 'hue-rotate(-45deg)' }} />

            {/* Critical Alert Glow */}
            <div className="absolute top-1/2 left-1/2 -z-10 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-destructive/10 blur-[150px]" />

            <main className="relative z-10 w-full max-w-2xl px-6 py-12 text-center">
                {/* Animated Icon Container */}
                <div className="relative mx-auto mb-8 flex h-32 w-32 items-center justify-center rounded-3xl border border-destructive/30 bg-destructive/5 backdrop-blur-xl animate-in fade-in zoom-in duration-500">
                    <AlertTriangle className="h-16 w-16 text-destructive animate-pulse" />
                    <div className="absolute -top-2 -right-2">
                        <Badge variant="destructive" className="border-none px-3 font-mono tracking-tighter">
                            RUNTIME_EXCEPTION
                        </Badge>
                    </div>
                </div>

                {/* Messaging */}
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-500 delay-100">
                    <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl">
                        Circuit Overload
                    </h1>
                    <p className="mx-auto max-w-lg text-lg text-muted-foreground">
                        The instance encountered an unhandled exception. This event has been logged
                        to the fleet's health monitoring system.
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row animate-in fade-in slide-in-from-bottom-12 duration-500 delay-200">
                    <Button
                        onClick={() => reset()}
                        size="lg"
                        variant="default"
                        className="h-14 bg-destructive px-10 text-base font-bold text-destructive-foreground hover:bg-destructive/90"
                    >
                        <RefreshCcw className="mr-2 h-5 w-5" />
                        Reboot Component
                    </Button>
                    <Button
                        variant="outline"
                        size="lg"
                        className="h-14 border-border/50 bg-card/50 px-10 text-base font-semibold backdrop-blur-md hover:bg-accent"
                        onClick={() => (window.location.href = '/')}
                    >
                        Evacuate to Safety
                    </Button>
                </div>

                {/* Collapsible Technical Details */}
                <div className="mt-16 w-full animate-in fade-in duration-700 delay-300">
                    <button
                        onClick={() => setShowTechnical(!showTechnical)}
                        className="group flex w-full items-center justify-between rounded-t-xl border-x border-t border-border/30 bg-card/40 p-4 transition-all hover:bg-card/60 backdrop-blur-sm"
                    >
                        <div className="flex items-center gap-3">
                            <Terminal className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                                Technical Telemetry
                            </span>
                        </div>
                        {showTechnical ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </button>

                    {showTechnical && (
                        <div className="overflow-hidden rounded-b-xl border border-border/30 bg-zinc-950/90 p-1 text-left shadow-2xl backdrop-blur-2xl">
                            <div className="max-h-[300px] overflow-y-auto p-4 font-mono text-[10px] leading-relaxed text-destructive/80 sm:text-xs">
                                <div className="mb-2 flex items-center gap-2 border-b border-white/5 pb-2 text-white/40">
                                    <Bug className="h-3 w-3" />
                                    <span>STACKTRACE_DUMP_0x{Date.now().toString(16).toUpperCase()}</span>
                                </div>
                                <div className="whitespace-pre-wrap selection:bg-destructive/30">
                                    {error?.stack || 'No diagnostic message found in local memory.'}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Hardware Info */}
                <div className="mt-12 flex items-center justify-center gap-6 opacity-30 sm:gap-12">
                    <div className="text-[10px] uppercase tracking-widest font-mono">Status: Offline</div>
                    <div className="text-[10px] uppercase tracking-widest font-mono">Log ID: {error?.digest || 'N/A'}</div>
                    <div className="text-[10px] uppercase tracking-widest font-mono">System: {process.env.NODE_ENV}</div>
                </div>
            </main>

            {/* Retro Scanline Effect */}
            <div className="scanline pointer-events-none" />
        </div>
    );
}
