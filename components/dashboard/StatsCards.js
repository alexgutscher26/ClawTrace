import React from 'react';
import {
  Server,
  CheckCircle,
  XCircle,
  BarChart3,
} from 'lucide-react';

/**
 * Renders a grid of statistics cards based on the provided stats.
 * @param {Object} props - The component props.
 * @param {Object} props.stats - The statistics data to display.
 * @returns {JSX.Element|null} The rendered statistics cards or null if no stats are provided.
 */
export function StatsCards({ stats }) {
  if (!stats) return null;

  return (
    <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
      {[
        { label: 'TOTAL AGENTS', value: stats.total_agents, icon: Server },
        { label: 'OPERATIONAL', value: stats.healthy, icon: CheckCircle },
        { label: 'ERRORS', value: stats.error, icon: XCircle },
        {
          label: 'TASKS EXECUTED',
          value: stats.total_tasks?.toLocaleString(),
          icon: BarChart3,
        },
      ].map((s) => (
        <div
          key={s.label}
          className="group flex items-start justify-between border border-white/10 bg-black p-6 transition-colors hover:border-white/30"
        >
          <div>
            <div className="mb-1 text-3xl font-black tracking-tighter text-white">
              {s.value}
            </div>
            <div className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
              {s.label}
            </div>
          </div>
          <s.icon className="h-5 w-5 text-zinc-700 transition-colors group-hover:text-white" />
        </div>
      ))}
    </div>
  );
}
