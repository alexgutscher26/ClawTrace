import React from 'react';
import {
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { STATUS_CONFIG, timeAgo } from '@/lib/view-utils';
import { getPolicy } from '@/lib/policies';

export function AgentsTable({ agents, totalPages, page, setPage, navigate, handleDeleteAgent }) {
  if (agents.length === 0) return null;

  return (
    <Card className="glass-card mb-8">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Agents ({agents.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-border/40 border-b">
                <th scope="col" className="text-muted-foreground p-3 text-left text-xs font-medium">
                  Name
                </th>
                <th scope="col" className="text-muted-foreground p-3 text-left text-xs font-medium">
                  Status
                </th>
                <th scope="col" className="text-muted-foreground hidden p-3 text-left text-xs font-medium md:table-cell">
                  Gateway
                </th>
                <th scope="col" className="text-muted-foreground p-3 text-left text-xs font-medium">
                  Policy
                </th>
                <th scope="col" className="text-muted-foreground hidden p-3 text-left text-xs font-medium md:table-cell">
                  Model
                </th>
                <th scope="col" className="text-muted-foreground hidden p-3 text-left text-xs font-medium lg:table-cell">
                  Location
                </th>
                <th scope="col" className="text-muted-foreground p-3 text-left text-xs font-medium">
                  Heartbeat
                </th>
                <th scope="col" className="text-muted-foreground p-3 text-right text-xs font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => {
                const sc = STATUS_CONFIG[agent.status] || STATUS_CONFIG.offline;
                return (
                  <tr
                    key={agent.id}
                    className="border-b border-white/5 transition hover:bg-white/5"
                  >
                    <td className="p-3">
                      <button
                        onClick={() => navigate(`/dashboard/agents/${agent.id}`)}
                        className="flex items-center gap-3 text-left hover:underline focus:outline-none focus:underline"
                        aria-label={`View agent ${agent.name}`}
                      >
                        <div
                          className={`h-1.5 w-1.5 rounded-full ${agent.status === 'healthy' ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : agent.status === 'error' ? 'animate-pulse bg-red-500' : 'bg-zinc-600'}`}
                          aria-hidden="true"
                        />
                        <span className="text-sm font-bold tracking-tight">{agent.name}</span>
                      </button>
                    </td>
                    <td className="p-3">
                      <Badge
                        variant="outline"
                        className={`${sc.text} ${sc.border} rounded-none bg-transparent font-mono text-[10px] tracking-wider uppercase`}
                      >
                        {sc.label}
                      </Badge>
                    </td>
                    <td className="hidden p-3 font-mono text-xs text-zinc-500 uppercase md:table-cell">
                      {agent.gateway_url}
                    </td>
                    <td className="p-3">
                      <Badge
                        variant="outline"
                        className={`${getPolicy(agent.policy_profile).color} ${getPolicy(agent.policy_profile).bg} border-opacity-50 rounded-none font-mono text-[9px] tracking-tighter`}
                      >
                        {getPolicy(agent.policy_profile).label}
                      </Badge>
                    </td>
                    <td className="hidden p-3 text-sm text-zinc-400 md:table-cell">
                      {agent.model}
                    </td>
                    <td className="hidden p-3 text-sm text-zinc-400 lg:table-cell">
                      {agent.location || 'UNKNOWN'}
                    </td>
                    <td className="p-3 font-mono text-sm text-zinc-500">
                      {timeAgo(agent.last_heartbeat)}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
                          onClick={() => navigate(`/dashboard/agents/${agent.id}`)}
                          aria-label={`View details for ${agent.name}`}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-zinc-600 hover:bg-transparent hover:text-red-500"
                          onClick={() => handleDeleteAgent(agent.id)}
                          aria-label={`Delete agent ${agent.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 border-t border-white/10 p-2">
          <span className="text-xs text-zinc-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
