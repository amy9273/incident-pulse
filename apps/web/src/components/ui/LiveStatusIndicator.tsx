"use client";

import * as React from "react";
import { Activity, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface LiveStatusIndicatorProps {
  isConnected?: boolean;
  className?: string;
}

export function LiveStatusIndicator({
  isConnected = true,
  className,
}: LiveStatusIndicatorProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium transition-all select-none",
        isConnected
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        className,
      )}
      title={
        isConnected
          ? "Real-time updates active"
          : "Reconnecting to event stream..."
      }
    >
      <span className="relative flex h-2 w-2">
        {isConnected ? (
          <>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </>
        ) : (
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 animate-pulse" />
        )}
      </span>
      <span className="hidden sm:inline font-medium">
        {isConnected ? "Connected (Live)" : "Reconnecting..."}
      </span>
    </div>
  );
}
