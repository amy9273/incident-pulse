import * as React from "react";
import { AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { IncidentStatus } from "@incident-pulse/shared";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: IncidentStatus | string;
  className?: string;
  showIcon?: boolean;
  showPulse?: boolean;
}

export function StatusBadge({
  status,
  className,
  showIcon = true,
  showPulse = true,
}: StatusBadgeProps) {
  const normalizedStatus = (status || "TRIGGERED").toUpperCase();

  if (normalizedStatus === IncidentStatus.TRIGGERED) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide",
          className,
        )}
      >
        {showPulse && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
        )}
        {showIcon && !showPulse && (
          <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
        )}
        <span>TRIGGERED</span>
      </span>
    );
  }

  if (normalizedStatus === IncidentStatus.ACKNOWLEDGED) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide",
          className,
        )}
      >
        {showIcon && <Clock className="h-3.5 w-3.5 text-amber-500" />}
        <span>ACKNOWLEDGED</span>
      </span>
    );
  }

  if (normalizedStatus === IncidentStatus.RESOLVED) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide",
          className,
        )}
      >
        {showIcon && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
        <span>RESOLVED</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-slate-500/30 bg-slate-500/10 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide",
        className,
      )}
    >
      {normalizedStatus}
    </span>
  );
}
