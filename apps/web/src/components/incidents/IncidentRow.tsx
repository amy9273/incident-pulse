import * as React from "react";
import {
  IncidentDetail,
  IncidentStatus,
  IncidentUrgency,
} from "@incident-pulse/shared";
import { StatusBadge } from "../ui/StatusBadge";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Layers, User, Clock, ShieldAlert, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface IncidentRowProps {
  incident: IncidentDetail;
  onSelect: (incident: IncidentDetail) => void;
  onAcknowledge: (id: string, e: React.MouseEvent) => void;
  onResolve: (id: string, e: React.MouseEvent) => void;
  isAckLoading?: boolean;
  isResolveLoading?: boolean;
}

function formatRelativeTime(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export function IncidentRow({
  incident,
  onSelect,
  onAcknowledge,
  onResolve,
  isAckLoading = false,
  isResolveLoading = false,
}: IncidentRowProps) {
  const isTriggered = incident.status === IncidentStatus.TRIGGERED;
  const isAck = incident.status === IncidentStatus.ACKNOWLEDGED;
  const isResolved = incident.status === IncidentStatus.RESOLVED;

  return (
    <div
      onClick={() => onSelect(incident)}
      className={cn(
        "group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border bg-card p-4 transition-all hover:border-primary/60 cursor-pointer shadow-xs",
        isTriggered && "border-l-4 border-l-red-500 hover:shadow-red-500/5",
        isAck && "border-l-4 border-l-amber-500 hover:shadow-amber-500/5",
        isResolved && "border-l-4 border-l-emerald-500 opacity-80",
      )}
    >
      {/* Left Details */}
      <div className="space-y-1.5 flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={incident.status} />

          <Badge
            variant={
              incident.urgency === IncidentUrgency.HIGH
                ? "urgency-high"
                : "urgency-low"
            }
          >
            {incident.urgency}
          </Badge>

          {incident.escalationStep && incident.escalationStep > 1 && (
            <span className="inline-flex items-center gap-1 rounded bg-red-500/10 text-red-600 dark:text-red-400 px-1.5 py-0.2 text-[10px] font-semibold uppercase">
              <ShieldAlert className="h-3 w-3" />
              Tier {incident.escalationStep}
            </span>
          )}

          <span className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {incident.title}
          </span>
        </div>

        {incident.summary && (
          <p className="text-xs text-muted-foreground line-clamp-1">
            {incident.summary}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground pt-1">
          <span className="flex items-center gap-1 font-medium text-foreground">
            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
            {incident.serviceName || "Monitored Service"}
          </span>

          <span className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            {incident.assigneeName || "Auto-routing / On-Call"}
          </span>

          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatRelativeTime(incident.createdAt)}
          </span>

          {incident.alertCount > 1 && (
            <span className="rounded bg-secondary px-1.5 py-0.2 text-[10px] font-medium text-secondary-foreground">
              {incident.alertCount} deduplicated alerts
            </span>
          )}
        </div>
      </div>

      {/* 1-Click Action Buttons */}
      <div
        className="flex items-center gap-2 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {isTriggered && (
          <Button
            size="sm"
            variant="default"
            isLoading={isAckLoading}
            onClick={(e) => onAcknowledge(incident.id, e)}
          >
            Acknowledge
          </Button>
        )}

        {(isTriggered || isAck) && (
          <Button
            size="sm"
            variant="status-resolved"
            isLoading={isResolveLoading}
            onClick={(e) => onResolve(incident.id, e)}
          >
            Resolve
          </Button>
        )}

        {isResolved && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-1 bg-emerald-500/10 rounded-md border border-emerald-500/20">
            Resolved
          </span>
        )}

        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground group-hover:text-foreground"
          onClick={() => onSelect(incident)}
          title="View Details"
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
