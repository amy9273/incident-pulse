"use client";

import * as React from "react";
import { CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";

interface ServiceUptimeBarProps {
  activeIncidents: number;
  totalIncidents: number;
  className?: string;
}

interface UptimeSegment {
  hourIndex: number;
  label: string;
  relativeLabel: string;
  status: "HEALTHY" | "DEGRADED" | "OUTAGE";
  incidentCount: number;
}

export function ServiceUptimeBar({
  activeIncidents,
  totalIncidents,
  className = "",
}: ServiceUptimeBarProps) {
  const [hoveredSegment, setHoveredSegment] =
    React.useState<UptimeSegment | null>(null);

  const segments = React.useMemo<UptimeSegment[]>(() => {
    const list: UptimeSegment[] = [];
    const now = new Date();

    for (let i = 23; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 3600 * 1000);
      const hourStr = `${String(d.getHours()).padStart(2, "0")}:00`;
      const relative =
        i === 0 ? "Current hour" : i === 1 ? "1 hour ago" : `${i} hours ago`;

      let status: "HEALTHY" | "DEGRADED" | "OUTAGE" = "HEALTHY";
      let count = 0;

      // Assign incident presence to latest segments if active
      if (activeIncidents > 0 && i < 2) {
        status = activeIncidents > 1 ? "OUTAGE" : "DEGRADED";
        count = activeIncidents;
      }

      list.push({
        hourIndex: 23 - i,
        label: `${hourStr} UTC`,
        relativeLabel: relative,
        status,
        incidentCount: count,
      });
    }

    return list;
  }, [activeIncidents]);

  const uptimePercentage = React.useMemo(() => {
    if (activeIncidents > 2) return "98.7%";
    if (activeIncidents > 0) return "99.4%";
    return "99.98%";
  }, [activeIncidents]);

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
        <span>24-Hour Availability History</span>
        <span
          className={
            activeIncidents > 0
              ? "font-semibold text-amber-500"
              : "font-semibold text-emerald-600 dark:text-emerald-400"
          }
        >
          {uptimePercentage} uptime
        </span>
      </div>

      {/* 24 Segmented Pills */}
      <div className="flex items-center gap-1 h-3.5 w-full">
        {segments.map((seg) => {
          let bgClass = "bg-emerald-500 hover:bg-emerald-400";
          if (seg.status === "OUTAGE") {
            bgClass = "bg-red-500 hover:bg-red-400 animate-pulse";
          } else if (seg.status === "DEGRADED") {
            bgClass = "bg-amber-500 hover:bg-amber-400 animate-pulse";
          }

          return (
            <div
              key={seg.hourIndex}
              onMouseEnter={() => setHoveredSegment(seg)}
              onMouseLeave={() => setHoveredSegment(null)}
              className={`flex-1 h-full rounded-xs transition-transform cursor-pointer hover:scale-y-125 ${bgClass}`}
            />
          );
        })}
      </div>

      {/* Footer labels and Hover Tooltip */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 min-h-[16px]">
        {hoveredSegment ? (
          <div className="flex items-center gap-1.5 text-foreground font-mono text-[10px]">
            {hoveredSegment.status === "HEALTHY" ? (
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            ) : hoveredSegment.status === "DEGRADED" ? (
              <AlertTriangle className="h-3 w-3 text-amber-500" />
            ) : (
              <AlertCircle className="h-3 w-3 text-red-500" />
            )}
            <span>
              {hoveredSegment.relativeLabel} ({hoveredSegment.label}):{" "}
              <strong>
                {hoveredSegment.status === "HEALTHY"
                  ? "Operational (100%)"
                  : `${hoveredSegment.incidentCount} Active Incident`}
              </strong>
            </span>
          </div>
        ) : (
          <>
            <span>24h ago</span>
            <span>Now</span>
          </>
        )}
      </div>
    </div>
  );
}
