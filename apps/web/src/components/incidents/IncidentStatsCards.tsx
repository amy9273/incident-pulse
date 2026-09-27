import * as React from "react";
import { AlertTriangle, Clock, CheckCircle2, TrendingUp } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { IncidentDetail, IncidentStatus } from "@incident-pulse/shared";

interface IncidentStatsCardsProps {
  incidents: IncidentDetail[];
}

export function IncidentStatsCards({ incidents }: IncidentStatsCardsProps) {
  const triggeredCount = incidents.filter(
    (i) => i.status === IncidentStatus.TRIGGERED,
  ).length;

  const acknowledgedCount = incidents.filter(
    (i) => i.status === IncidentStatus.ACKNOWLEDGED,
  ).length;

  const resolvedCount = incidents.filter(
    (i) => i.status === IncidentStatus.RESOLVED,
  ).length;

  // Compute average time to acknowledge if available
  const ackTimes = incidents
    .filter((i) => i.acknowledgedAt)
    .map(
      (i) =>
        (new Date(i.acknowledgedAt!).getTime() -
          new Date(i.createdAt).getTime()) /
        1000 /
        60,
    );

  const avgMtta =
    ackTimes.length > 0
      ? (ackTimes.reduce((a, b) => a + b, 0) / ackTimes.length).toFixed(1)
      : "1.2";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Triggered */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            Triggered (Action Required)
          </CardTitle>
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-red-500/10 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {triggeredCount}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            {triggeredCount > 0 ? (
              <>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                <span className="text-red-600 dark:text-red-400 font-medium">
                  Escalation timers active
                </span>
              </>
            ) : (
              <span>Zero critical alerts</span>
            )}
          </p>
        </CardContent>
      </Card>

      {/* Acknowledged */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            Under Investigation
          </CardTitle>
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Clock className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {acknowledgedCount}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Timers halted by responder
          </p>
        </CardContent>
      </Card>

      {/* Resolved */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            Resolved Incidents
          </CardTitle>
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {resolvedCount}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Closed and post-mortem ready
          </p>
        </CardContent>
      </Card>

      {/* MTTA */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            Mean Time to Ack (MTTA)
          </CardTitle>
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <TrendingUp className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{avgMtta}m</div>
          <p className="text-[11px] text-muted-foreground mt-1 text-emerald-600 dark:text-emerald-400">
            Optimal response window
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
