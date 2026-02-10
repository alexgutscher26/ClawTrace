/**
 * Renders a loading component with an animated background and loader.
 */
export default function Loading() {
  return (
    <div className="bg-background relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      {/* Animated Grid Background */}
      <div className="grid-bg absolute inset-0 z-0 opacity-10" />

      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Modern Loader */}
        <div className="relative flex h-24 w-24 items-center justify-center">
          <div className="border-primary/20 absolute inset-0 animate-spin rounded-xl border-2" />
          <div className="border-primary/40 absolute inset-2 animate-spin rounded-lg border-2 [animation-duration:1.5s]" />
          <div className="border-primary absolute inset-4 animate-spin rounded-md border-b-2 [animation-duration:2s]" />

          {/* Pulsing Core */}
          <div className="bg-primary h-4 w-4 animate-pulse rounded-full" />
        </div>

        {/* Loading Text */}
        <div className="space-y-2 text-center">
          <h2 className="text-muted-foreground animate-pulse text-sm font-bold tracking-[0.5em] uppercase">
            Initializing Fleet Registry
          </h2>
          <div className="flex justify-center gap-1">
            <span className="bg-primary/20 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.3s]" />
            <span className="bg-primary/20 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.15s]" />
            <span className="bg-primary/20 h-1.5 w-1.5 animate-bounce rounded-full" />
          </div>
        </div>
      </div>

      {/* Retro Scanline Effect */}
      <div className="scanline pointer-events-none opacity-5" />
    </div>
  );
}
