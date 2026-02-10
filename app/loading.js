export default function Loading() {
    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background">
            {/* Animated Grid Background */}
            <div className="grid-bg absolute inset-0 z-0 opacity-10" />

            <div className="relative z-10 flex flex-col items-center gap-8">
                {/* Modern Loader */}
                <div className="relative flex h-24 w-24 items-center justify-center">
                    <div className="absolute inset-0 animate-spin rounded-xl border-2 border-primary/20" />
                    <div className="absolute inset-2 animate-spin rounded-lg border-2 border-primary/40 [animation-duration:1.5s]" />
                    <div className="absolute inset-4 animate-spin rounded-md border-b-2 border-primary [animation-duration:2s]" />

                    {/* Pulsing Core */}
                    <div className="h-4 w-4 rounded-full bg-primary animate-pulse" />
                </div>

                {/* Loading Text */}
                <div className="space-y-2 text-center">
                    <h2 className="text-sm font-bold uppercase tracking-[0.5em] text-muted-foreground animate-pulse">
                        Initializing Fleet Registry
                    </h2>
                    <div className="flex justify-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary/20 animate-bounce [animation-delay:-0.3s]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-primary/20 animate-bounce [animation-delay:-0.15s]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-primary/20 animate-bounce" />
                    </div>
                </div>
            </div>

            {/* Retro Scanline Effect */}
            <div className="scanline pointer-events-none opacity-5" />
        </div>
    );
}
