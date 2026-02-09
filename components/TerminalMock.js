'use client';
import { useState, useEffect } from 'react';

export default function TerminalMock() {
  const [visibleLines, setVisibleLines] = useState([]);
  const [showMetrics, setShowMetrics] = useState(false);
  const [cpuWidth, setCpuWidth] = useState(0);
  const [memWidth, setMemWidth] = useState(0);

  const sequence = [
    {
      type: 'line',
      content: (
        <>
          <span className="text-emerald-500">user@fleet:~$</span> curl -sL https://fleet.sh/install
          | bash
        </>
      ),
      delay: 500,
    },
    {
      type: 'line',
      content: (
        <span className="font-mono text-zinc-500">[INFO] Downloading Fleet Agent v2.0...</span>
      ),
      delay: 1000,
    },
    {
      type: 'line',
      content: <span className="font-mono text-zinc-500">[INFO] Verifying checksums...</span>,
      delay: 800,
    },
    {
      type: 'line',
      content: <span className="font-mono text-zinc-500">[INFO] Expanding package...</span>,
      delay: 600,
    },
    {
      type: 'line',
      content: (
        <>
          <span className="mr-2 font-bold text-emerald-500">➜</span>{' '}
          <span className="font-bold text-white">Agent node initialized.</span>
        </>
      ),
      delay: 800,
    },
    {
      type: 'line',
      content: (
        <>
          <span className="mr-2 font-bold text-emerald-500">➜</span>{' '}
          <span className="font-bold text-white">Connected to gateway: 192.168.1.40</span>
        </>
      ),
      delay: 600,
    },
    {
      type: 'line',
      content: (
        <>
          <span className="mr-2 font-bold text-emerald-500">➜</span>{' '}
          <span className="font-bold text-white">Status: </span>
          <span className="ml-1 bg-white px-2 py-0.5 text-[10px] font-black text-black">
            ONLINE
          </span>
        </>
      ),
      delay: 800,
    },
  ];

  useEffect(() => {
    let timeoutId;
    const runSequence = async () => {
      for (let i = 0; i < sequence.length; i++) {
        await new Promise((resolve) => (timeoutId = setTimeout(resolve, sequence[i].delay)));
        setVisibleLines((prev) => [...prev, sequence[i].content]);
      }
      setShowMetrics(true);
      setTimeout(() => {
        setCpuWidth(45);
        setMemWidth(62);
      }, 500);
    };
    runSequence();
    return () => clearTimeout(timeoutId);
  }, []);

  // CPU/MEM oscillation effect
  useEffect(() => {
    if (!showMetrics) return;
    const interval = setInterval(() => {
      setCpuWidth((prev) => {
        const delta = (Math.random() - 0.5) * 4;
        return Math.min(Math.max(prev + delta, 40), 50);
      });
      setMemWidth((prev) => {
        const delta = (Math.random() - 0.5) * 2;
        return Math.min(Math.max(prev + delta, 60), 65);
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [showMetrics]);

  return (
    <div className="relative min-h-[400px] flex-1 overflow-hidden border border-white/10 bg-black p-6 pt-12 font-mono text-xs leading-relaxed md:text-sm">
      {/* Terminal Header */}
      <div className="absolute top-0 left-0 flex h-10 w-full items-center border-b border-white/10 bg-zinc-900/40 px-4">
        <div className="group flex gap-2">
          <div className="flex h-3 w-3 cursor-pointer items-center justify-center rounded-full border border-black/20 bg-red-500/80 transition-all hover:scale-110 active:scale-95">
            <span className="hidden text-[8px] font-bold text-black group-hover:block">×</span>
          </div>
          <div className="flex h-3 w-3 cursor-pointer items-center justify-center rounded-full border border-black/20 bg-yellow-500/80 transition-all hover:scale-110 active:scale-95">
            <span className="hidden text-[8px] font-bold text-black group-hover:block">−</span>
          </div>
          <div className="flex h-3 w-3 cursor-pointer items-center justify-center rounded-full border border-black/20 bg-emerald-500/80 transition-all hover:scale-110 active:scale-95">
            <span className="hidden text-[8px] font-bold text-black group-hover:block">+</span>
          </div>
        </div>
        <span className="ml-auto font-mono text-[10px] tracking-widest text-zinc-500 uppercase opacity-50">
          bash - 80x24
        </span>
      </div>

      {/* Terminal Content */}
      <div className="mt-4 space-y-2">
        {visibleLines.map((line, i) => (
          <div
            key={i}
            className="animate-in fade-in slide-in-from-left-2 fill-mode-both duration-500"
          >
            {line}
          </div>
        ))}

        {showMetrics && (
          <div className="animate-in fade-in duration-1000">
            <div className="my-8 h-px bg-white/5" />
            <div className="grid grid-cols-2 gap-10">
              <div className="space-y-2">
                <p className="text-[10px] font-bold tracking-[0.2em] text-zinc-500">CPU LOAD</p>
                <div className="relative h-1 w-full bg-zinc-900">
                  <div
                    className="absolute top-0 left-0 h-full bg-white transition-all duration-2000 ease-in-out"
                    style={{ width: `${cpuWidth}%` }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-bold tracking-[0.2em] text-zinc-500">MEMORY</p>
                <div className="relative h-1 w-full bg-zinc-900">
                  <div
                    className="absolute top-0 left-0 h-full bg-white transition-all duration-2000 ease-in-out"
                    style={{ width: `${memWidth}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Blinking Cursor */}
      <div className="absolute right-6 bottom-6 animate-pulse font-bold text-white">_</div>

      {/* CRT Scanline Effect (Subtle) */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-size-[100%_2px,3px_100%]" />
    </div>
  );
}
