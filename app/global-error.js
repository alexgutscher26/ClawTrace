'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';

/**
 * Renders a global error page during a critical system failure.
 *
 * The GlobalError component captures the provided error and logs it to the console. If the PostHog analytics library is loaded, it captures the error with a severity of 'fatal'. The component returns a structured HTML layout that informs the user of the system kernel panic, displays the error message, and provides options for attempting a kernel reset or forcing a hard reload of the page.
 *
 * @param {Object} props - The component props.
 * @param {Error} props.error - The error object containing error details.
 * @param {Function} props.reset - A function to reset the kernel.
 */
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('CRITICAL CORE FAILURE:', error);
    if (typeof window !== 'undefined' && posthog.__loaded) {
      posthog.captureException(error, {
        severity: 'fatal',
        scope: 'global_root',
      });
    }
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-50 antialiased selection:bg-red-500 selection:text-white">
        <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6 font-mono tracking-tight">
          {/* Stark Red Glow */}
          <div className="absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-900/10 blur-[120px]" />

          {/* Glitchy Static Background Pattern */}
          <div
            className="absolute inset-0 z-0 opacity-[0.03]"
            style={{
              backgroundImage: 'radial-gradient(#fff 1px, transparent 0)',
              backgroundSize: '24px 24px',
            }}
          />

          <main className="relative z-10 w-full max-w-lg">
            {/* Panic Header */}
            <div className="mb-8 border-l-4 border-red-600 bg-red-950/20 p-6 backdrop-blur-sm">
              <h1 className="mb-2 text-2xl font-black tracking-tighter text-red-500 uppercase">
                System Kernel Panic
              </h1>
              <p className="text-sm leading-relaxed font-medium text-zinc-400">
                The root coordinator has crashed. High-level routing and state management have been
                suspended to protect fleet data integrity.
              </p>
            </div>

            {/* Diagnostic Box */}
            <div className="mb-12 rounded-lg border border-zinc-800 bg-black/80 p-6 shadow-2xl backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between text-[10px] tracking-widest text-zinc-600 uppercase">
                <span>Core Error Log</span>
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
              </div>
              <div className="scrollbar-thin scrollbar-thumb-zinc-800 max-h-[200px] overflow-y-auto text-xs leading-relaxed text-zinc-300">
                {error?.message || 'CRITICAL_UNKNOWN_EXCEPTION'}
                <br />
                {error?.digest && <div className="mt-2 text-zinc-600">Digest: {error.digest}</div>}
              </div>
            </div>

            {/* Emergency Actions */}
            <div className="flex flex-col gap-4">
              <button
                onClick={() => reset()}
                className="group relative flex h-14 items-center justify-center overflow-hidden rounded-md bg-zinc-50 px-8 text-sm font-bold text-zinc-950 transition-all hover:bg-white active:scale-[0.98]"
              >
                <span className="relative z-10">Attempt Kernel Reset</span>
              </button>

              <button
                onClick={() => (window.location.href = '/')}
                className="h-14 rounded-md border border-zinc-700 bg-transparent px-8 text-sm font-bold text-zinc-400 transition-all hover:border-zinc-500 hover:text-zinc-200"
              >
                Force Hard Reload
              </button>
            </div>

            {/* Bottom Status */}
            <div className="mt-16 text-center">
              <span className="text-[10px] tracking-[0.3em] text-zinc-700 uppercase">
                Termination Signal: PROT_FAULT_001
              </span>
            </div>
          </main>

          {/* Simple Overlay scanline for global page */}
          <div
            className="pointer-events-none fixed inset-0 z-50 opacity-[0.07]"
            style={{
              background:
                'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
              backgroundSize: '100% 4px, 3px 100%',
            }}
          />
        </div>
      </body>
    </html>
  );
}
