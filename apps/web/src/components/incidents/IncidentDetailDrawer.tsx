"use client";

import * as React from "react";
import {
  IncidentDetail,
  IncidentLogAction,
  IncidentStatus,
  IncidentUrgency,
} from "@incident-pulse/shared";
import { StatusBadge } from "../ui/StatusBadge";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { JsonViewer } from "../ui/JsonViewer";
import {
  X,
  Layers,
  User,
  Clock,
  Key,
  FileCode,
  History,
  ShieldAlert,
} from "lucide-react";

interface IncidentDetailDrawerProps {
  incident: IncidentDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  isAckLoading?: boolean;
  isResolveLoading?: boolean;
}

export function IncidentDetailDrawer({
  incident,
  isOpen,
  onClose,
  onAcknowledge,
  onResolve,
  isAckLoading = false,
  isResolveLoading = false,
}: IncidentDetailDrawerProps) {
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !incident) {
    return null;
  }

  const isTriggered = incident.status === IncidentStatus.TRIGGERED;
  const isAck = incident.status === IncidentStatus.ACKNOWLEDGED;
  const isResolved = incident.status === IncidentStatus.RESOLVED;

  const getLogDotColor = (action: IncidentLogAction | string) => {
    switch (action) {
      case IncidentLogAction.TRIGGERED:
        return "bg-red-500 ring-2 ring-red-500/20";
      case IncidentLogAction.ACKNOWLEDGED:
        return "bg-amber-500 ring-2 ring-amber-500/20";
      case IncidentLogAction.RESOLVED:
        return "bg-emerald-500 ring-2 ring-emerald-500/20";
      case IncidentLogAction.ESCALATED:
        return "bg-purple-500 ring-2 ring-purple-500/20";
      default:
        return "bg-primary ring-2 ring-primary/20";
    }
  };

  const getLogActionBadge = (action: IncidentLogAction | string) => {
    switch (action) {
      case IncidentLogAction.TRIGGERED:
        return (
          <span className="rounded bg-red-500/10 text-red-600 dark:text-red-400 px-1.5 py-0.5 text-[10px] font-semibold uppercase">
            Triggered
          </span>
        );
      case IncidentLogAction.ACKNOWLEDGED:
        return (
          <span className="rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 text-[10px] font-semibold uppercase">
            Acknowledged
          </span>
        );
      case IncidentLogAction.RESOLVED:
        return (
          <span className="rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 text-[10px] font-semibold uppercase">
            Resolved
          </span>
        );
      case IncidentLogAction.ESCALATED:
        return (
          <span className="rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 text-[10px] font-semibold uppercase">
            Escalated
          </span>
        );
      default:
        return (
          <span className="rounded bg-secondary text-secondary-foreground px-1.5 py-0.5 text-[10px] font-medium uppercase">
            {action}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-2xl bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div className="flex items-center gap-2">
              <StatusBadge status={incident.status} />
              <Badge
                variant={
                  incident.urgency === IncidentUrgency.HIGH
                    ? "urgency-high"
                    : "urgency-low"
                }
              >
                {incident.urgency} Urgency
              </Badge>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onClose}
              title="Close drawer (Esc)"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Title & Summary */}
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-foreground leading-tight">
                {incident.title}
              </h2>
              {incident.summary && (
                <p className="text-sm text-muted-foreground bg-secondary/30 p-3 rounded-md border border-border/50">
                  {incident.summary}
                </p>
              )}
            </div>

            {/* Quick Metadata Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-border p-3 space-y-1">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5" /> Monitored Service
                </span>
                <p className="font-semibold text-foreground">
                  {incident.serviceName || "Payment API"}
                </p>
              </div>

              <div className="rounded-lg border border-border p-3 space-y-1">
                <span className="text-muted-foreground flex items-center gap-1">
                  <User className="h-3.5 w-3.5" /> Assigned Responder
                </span>
                <p className="font-semibold text-foreground">
                  {incident.assigneeName || "Auto-routed via Schedule"}
                </p>
              </div>

              <div className="rounded-lg border border-border p-3 space-y-1">
                <span className="text-muted-foreground flex items-center gap-1">
                  <ShieldAlert className="h-3.5 w-3.5" /> Escalation Tier
                </span>
                <p className="font-semibold text-foreground">
                  Tier {incident.escalationStep || 1}
                </p>
              </div>

              <div className="rounded-lg border border-border p-3 space-y-1">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Ingested Timestamp
                </span>
                <p className="font-semibold text-foreground">
                  {new Date(incident.createdAt).toLocaleTimeString()} (
                  {new Date(incident.createdAt).toLocaleDateString()})
                </p>
              </div>
            </div>

            {/* Deduplication Fingerprint */}
            <div className="rounded-lg border border-border p-3 bg-secondary/20 space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1 font-medium">
                  <Key className="h-3.5 w-3.5" /> Deduplication Fingerprint
                </span>
                <span>{incident.alertCount} alert(s) grouped</span>
              </div>
              <code className="text-[11px] font-mono text-muted-foreground break-all select-all block">
                {incident.fingerprint}
              </code>
            </div>

            {/* Raw Webhook Payload */}
            {incident.payload && (
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileCode className="h-4 w-4" /> Raw Webhook Payload
                </span>
                <JsonViewer data={incident.payload} maxHeight="max-h-56" />
              </div>
            )}

            {/* Immutable Audit Log Timeline */}
            <div className="space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <History className="h-4 w-4" /> Incident Audit Timeline
              </span>

              <div className="space-y-4 border-l-2 border-dashed border-border/80 ml-2.5 pl-4">
                {incident.logs && incident.logs.length > 0 ? (
                  incident.logs.map((log) => (
                    <div key={log.id} className="relative space-y-1">
                      <div
                        className={`absolute -left-[23px] top-1 h-3 w-3 rounded-full border-2 border-card ${getLogDotColor(
                          log.action,
                        )}`}
                      />
                      <div className="flex items-center gap-2">
                        {getLogActionBadge(log.action)}
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-xs text-foreground font-medium">
                        {log.message}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    No timeline logs recorded yet.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="border-t border-border bg-card p-4 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Incident ID:{" "}
              <code className="font-mono">{incident.id.slice(0, 8)}</code>
            </div>

            <div className="flex items-center gap-2">
              {isTriggered && (
                <Button
                  variant="default"
                  isLoading={isAckLoading}
                  onClick={() => onAcknowledge(incident.id)}
                >
                  Acknowledge Incident
                </Button>
              )}

              {(isTriggered || isAck) && (
                <Button
                  variant="status-resolved"
                  isLoading={isResolveLoading}
                  onClick={() => onResolve(incident.id)}
                >
                  Mark Resolved
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
