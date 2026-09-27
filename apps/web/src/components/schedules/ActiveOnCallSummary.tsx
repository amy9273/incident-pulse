"use client";

import * as React from "react";
import { ScheduleDetail } from "@incident-pulse/shared";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { User, Clock, ShieldCheck, AlertCircle, Globe } from "lucide-react";

function formatRemaining(endTimeStr: string): string {
  const diffMs = new Date(endTimeStr).getTime() - Date.now();
  if (diffMs <= 0) return "Ending now";
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

interface ActiveOnCallSummaryProps {
  schedules: ScheduleDetail[];
}

export function ActiveOnCallSummary({ schedules }: ActiveOnCallSummaryProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {schedules.map((sch) => {
        const hasActive = !!sch.currentOnCallUser;

        return (
          <Card key={sch.id} className="border-border">
            <CardHeader className="pb-3 space-y-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold truncate">
                  {sch.name}
                </CardTitle>
                {hasActive ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Covered
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400">
                    <AlertCircle className="h-3 w-3" />
                    No Shift Active
                  </span>
                )}
              </div>
              <CardDescription className="text-xs line-clamp-1">
                {sch.description || "Primary on-call rotation"}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-2.5 pt-0">
              {hasActive ? (
                <div className="rounded-lg bg-secondary/50 p-3 space-y-2 border border-border/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                        {sch.currentOnCallUser!.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {sch.currentOnCallUser!.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {sch.currentOnCallUser!.email}
                        </p>
                      </div>
                    </div>

                    <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Ends in {formatRemaining(sch.currentOnCallUser!.shiftEnd)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Shift ends:
                    </span>
                    <span className="font-medium text-foreground">
                      {new Date(
                        sch.currentOnCallUser!.shiftEnd,
                      ).toLocaleDateString()}{" "}
                      {new Date(
                        sch.currentOnCallUser!.shiftEnd,
                      ).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3 text-center space-y-1">
                  <p className="text-xs font-semibold text-destructive">
                    Shift Coverage Gap
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Assign an engineer to ensure alerts are routed.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                <span className="flex items-center gap-1">
                  <Globe className="h-3 w-3" /> TimeZone: {sch.timeZone}
                </span>
                <span>{sch.shifts?.length || 0} scheduled shifts</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
