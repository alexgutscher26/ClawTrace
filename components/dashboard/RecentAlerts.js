import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { timeAgo } from '@/lib/view-utils';

/**
 * Renders a component displaying recent alerts.
 *
 * The RecentAlerts component takes in a list of alerts and a function to handle resolving alerts.
 * If there are no alerts, it returns null. It displays the first five alerts, showing their details
 * and providing an option to resolve them if they are not already resolved. The alerts are styled
 * based on their resolved status.
 *
 * @param {Object} props - The component props.
 * @param {Array} props.alerts - The list of alerts to display.
 * @param {Function} props.handleResolveAlert - The function to call when resolving an alert.
 */
export function RecentAlerts({ alerts, handleResolveAlert }) {
  if (alerts.length === 0) return null;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recent Alerts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.slice(0, 5).map((alert) => (
          <div
            key={alert.id}
            className={`flex items-center justify-between rounded-lg p-3 ${alert.resolved ? 'bg-muted/20' : 'border border-red-500/20 bg-red-500/5'}`}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle
                className={`h-4 w-4 ${alert.resolved ? 'text-muted-foreground' : 'text-red-400'}`}
              />
              <div>
                <p className="text-sm font-medium">
                  {alert.agent_name}: {alert.type}
                </p>
                <p className="text-muted-foreground text-xs">{alert.message}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">{timeAgo(alert.created_at)}</span>
              {!alert.resolved && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => handleResolveAlert(alert.id)}
                >
                  Resolve
                </Button>
              )}
              {alert.resolved && (
                <Badge variant="outline" className="border-emerald-500/30 text-xs text-emerald-400">
                  Resolved
                </Badge>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
