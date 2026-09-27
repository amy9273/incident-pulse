"use client";

import * as React from "react";
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  Filter,
  Plus,
  Radio,
  Flame,
  User,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { IncidentStatus, IncidentUrgency } from "@incident-pulse/shared";

type DemoViewState = "populated" | "loading" | "empty" | "error";

interface DemoIncident {
  id: string;
  title: string;
  summary: string;
  status: IncidentStatus;
  urgency: IncidentUrgency;
  service: string;
  assignee: string;
  timeAgo: string;
  alertCount: number;
}

const SAMPLE_INCIDENTS: DemoIncident[] = [
  {
    id: "inc_001",
    title: "High Error Rate on POST /v1/checkout (HTTP 500 Spike)",
    summary:
      "Payment Gateway returned > 15% error rate across Singapore AWS region.",
    status: IncidentStatus.TRIGGERED,
    urgency: IncidentUrgency.HIGH,
    service: "Checkout & Payment API",
    assignee: "Sarah Chen (Tier 1)",
    timeAgo: "2m ago",
    alertCount: 4,
  },
  {
    id: "inc_002",
    title: "Database Read Replica Latency > 2500ms",
    summary: "High I/O wait times on analytics replica database nodes.",
    status: IncidentStatus.ACKNOWLEDGED,
    urgency: IncidentUrgency.HIGH,
    service: "Platform Infrastructure",
    assignee: "Alex Kumar (Tier 2)",
    timeAgo: "14m ago",
    alertCount: 1,
  },
  {
    id: "inc_003",
    title: "Token Invalidation Cache Eviction Failure",
    summary: "Redis memory fragmentation exceeded warning thresholds.",
    status: IncidentStatus.RESOLVED,
    urgency: IncidentUrgency.LOW,
    service: "Authentication Gateway",
    assignee: "Auto-Resolved",
    timeAgo: "1h ago",
    alertCount: 1,
  },
];

export default function IncidentsDashboardPage() {
  const [viewState, setViewState] = React.useState<DemoViewState>("populated");
  const [incidents, setIncidents] =
    React.useState<DemoIncident[]>(SAMPLE_INCIDENTS);
  const [filter, setFilter] = React.useState<string>("ALL");

  const handleAcknowledge = (id: string) => {
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === id ? { ...inc, status: IncidentStatus.ACKNOWLEDGED } : inc,
      ),
    );
  };

  const handleResolve = (id: string) => {
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === id ? { ...inc, status: IncidentStatus.RESOLVED } : inc,
      ),
    );
  };

  const filteredIncidents = incidents.filter((inc) => {
    if (filter === "ALL") return true;
    return inc.status === filter;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & State Toggle Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Live Incident Feed
          </h2>
          <p className="text-xs text-muted-foreground">
            Real-time multi-tier dispatch and automated escalation triage board.
          </p>
        </div>

        {/* 4-State UI Interactive Preview Switcher */}
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card p-1 text-xs">
          <span className="px-2 py-1 text-[11px] font-semibold text-muted-foreground">
            UI State:
          </span>
          {(["populated", "loading", "empty", "error"] as DemoViewState[]).map(
            (state) => (
              <button
                key={state}
                onClick={() => setViewState(state)}
                className={`rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                  viewState === state
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {state}
              </button>
            ),
          )}
        </div>
      </div>

      {/* KPI Metric Cards */}
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
              {
                incidents.filter((i) => i.status === IncidentStatus.TRIGGERED)
                  .length
              }
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
              Auto-escalating on timer
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
              {
                incidents.filter(
                  (i) => i.status === IncidentStatus.ACKNOWLEDGED,
                ).length
              }
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Escalation timers halted
            </p>
          </CardContent>
        </Card>

        {/* Resolved */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Resolved Today
            </CardTitle>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {
                incidents.filter((i) => i.status === IncidentStatus.RESOLVED)
                  .length
              }
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              100% SLA compliance
            </p>
          </CardContent>
        </Card>

        {/* MTTA / MTTR */}
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
            <div className="text-2xl font-bold text-foreground">1.4m</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Down 38% vs last week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          {[
            "ALL",
            IncidentStatus.TRIGGERED,
            IncidentStatus.ACKNOWLEDGED,
            IncidentStatus.RESOLVED,
          ].map((statusKey) => (
            <button
              key={statusKey}
              onClick={() => setFilter(statusKey)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === statusKey
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {statusKey === "ALL" ? "All Incidents" : statusKey}
            </button>
          ))}
        </div>

        <span className="text-xs text-muted-foreground">
          Showing {filteredIncidents.length} incidents
        </span>
      </div>

      {/* 4-State UI Content Rendering */}
      {viewState === "loading" && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 w-3/4">
                  <Skeleton className="h-6 w-28 rounded-full" />
                  <Skeleton className="h-5 w-full" />
                </div>
                <Skeleton className="h-8 w-24 rounded-md" />
              </div>
              <div className="mt-3 flex gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-28" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {viewState === "empty" && (
        <EmptyState
          title="No open incidents found"
          description="All systems are operating normally with zero active alerts in queue."
          actionLabel="Send Test Webhook Alert"
          onAction={() => alert("Ready for Unit 08 Real-Time Triage Feed!")}
        />
      )}

      {viewState === "error" && (
        <ErrorState
          title="Failed to synchronize incidents"
          message="Could not connect to the backend event stream. Ensure the Express API is running."
          onRetry={() => setViewState("populated")}
        />
      )}

      {viewState === "populated" && (
        <div className="space-y-3">
          {filteredIncidents.length === 0 ? (
            <EmptyState
              title={`No ${filter.toLowerCase()} incidents`}
              description="No incidents currently match this filter criteria."
              actionLabel="View All Incidents"
              onAction={() => setFilter("ALL")}
            />
          ) : (
            filteredIncidents.map((incident) => {
              const isTriggered = incident.status === IncidentStatus.TRIGGERED;
              const isAck = incident.status === IncidentStatus.ACKNOWLEDGED;
              const isResolved = incident.status === IncidentStatus.RESOLVED;

              return (
                <div
                  key={incident.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border bg-card p-4 transition-all hover:border-primary/50 shadow-xs ${
                    isTriggered
                      ? "border-l-4 border-l-red-500"
                      : isAck
                        ? "border-l-4 border-l-amber-500"
                        : "border-l-4 border-l-emerald-500 opacity-80"
                  }`}
                >
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
                      <span className="text-xs font-semibold text-foreground truncate">
                        {incident.title}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {incident.summary}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground pt-1">
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                        {incident.service}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {incident.assignee}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {incident.timeAgo}
                      </span>
                      {incident.alertCount > 1 && (
                        <span className="rounded bg-secondary px-1.5 py-0.2 text-[10px] font-medium">
                          {incident.alertCount} deduplicated alerts
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isTriggered && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleAcknowledge(incident.id)}
                      >
                        Acknowledge
                      </Button>
                    )}
                    {(isTriggered || isAck) && (
                      <Button
                        size="sm"
                        variant="status-resolved"
                        onClick={() => handleResolve(incident.id)}
                      >
                        Resolve
                      </Button>
                    )}
                    {isResolved && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        Resolved
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
