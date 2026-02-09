export const STATUS_CONFIG = {
  healthy: {
    color: 'bg-white',
    text: 'text-white',
    border: 'border-white/20',
    label: 'OPERATIONAL',
    bgLight: 'bg-white/10',
  },
  idle: {
    color: 'bg-zinc-500',
    text: 'text-zinc-400',
    border: 'border-white/10',
    label: 'IDLE',
    bgLight: 'bg-white/5',
  },
  error: {
    color: 'bg-white',
    text: 'text-white',
    border: 'border-white/40',
    label: 'ERROR',
    bgLight: 'bg-white/20',
  },
  offline: {
    color: 'bg-zinc-700',
    text: 'text-zinc-500',
    border: 'border-white/5',
    label: 'OFFLINE',
    bgLight: 'bg-white/5',
  },
};

export function timeAgo(dateString) {
  if (!dateString) return 'Never';
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
