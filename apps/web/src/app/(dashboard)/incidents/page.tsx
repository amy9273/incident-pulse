"use client";

import * as React from "react";
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  Filter,
  Plus,
  Radio,
  Search,
  Zap,
  RefreshCw,
} from "lucide-react";
import { IncidentDetail, IncidentStatus } from "@incident-pulse/shared";
import {
  useIncidents,
  useIncident,
  useAcknowledgeIncident,
  useResolveIncident,
} from "@/hooks/useIncidents";
import { useSocket } from "@/context/SocketContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { IncidentStatsCards } from "@/components/incidents/IncidentStatsCards";
import { IncidentRow } from "@/components/incidents/IncidentRow";
import { IncidentDetailDrawer } from "@/components/incidents/IncidentDetailDrawer";
import { TriggerAlertModal } from "@/components/incidents/TriggerAlertModal";

export default function IncidentsDashboardPage() {
  const [filter, setFilter] = React.useState<string>("ALL");
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [selectedIncidentId, setSelectedIncidentId] = React.useState<
    string | null
  >(null);
  const [isTriggerModalOpen, setIsTriggerModalOpen] =
    React.useState<boolean>(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const { isConnected } = useSocket();

  // Fetch real incidents
  const {
    data: incidentsData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useIncidents({
    status: filter === "ALL" ? undefined : (filter as IncidentStatus),
  });

  // Fetch detailed incident for drawer
  const { data: selectedIncidentDetail } = useIncident(selectedIncidentId);

  // Mutation hooks
  const acknowledgeMutation = useAcknowledgeIncident();
  const resolveMutation = useResolveIncident();

  const incidents = React.useMemo(
    () => incidentsData?.incidents || [],
    [incidentsData],
  );

  // Filter by search term on client
  const filteredIncidents = React.useMemo(() => {
    if (!searchTerm.trim()) return incidents;
    const term = searchTerm.toLowerCase();
    return incidents.filter(
      (inc) =>
        inc.title.toLowerCase().includes(term) ||
        (inc.summary && inc.summary.toLowerCase().includes(term)) ||
        (inc.serviceName && inc.serviceName.toLowerCase().includes(term)) ||
        (inc.assigneeName && inc.assigneeName.toLowerCase().includes(term)),
    );
  }, [incidents, searchTerm]);

  // Keyboard Shortcuts (A: Ack, R: Resolve, /: Search, Esc: Close)
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      if (e.key === "a" || e.key === "A") {
        const firstTriggered = incidents.find(
          (i) => i.status === IncidentStatus.TRIGGERED,
        );
        if (firstTriggered) {
          acknowledgeMutation.mutate(firstTriggered.id);
        }
      }

      if (e.key === "r" || e.key === "R") {
        if (selectedIncidentId) {
          resolveMutation.mutate(selectedIncidentId);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [incidents, selectedIncidentId, acknowledgeMutation, resolveMutation]);

  const handleAcknowledge = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    acknowledgeMutation.mutate(id);
  };

  const handleResolve = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    resolveMutation.mutate(id);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Live Incident Feed
            {isFetching && !isLoading && (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
          </h2>
          <p className="text-xs text-muted-foreground">
            Real-time multi-tier dispatch and automated escalation triage board.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => refetch()}
            title="Refresh feed"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>

          <Button
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setIsTriggerModalOpen(true)}
          >
            <Zap className="h-3.5 w-3.5" />
            Send Test Alert
          </Button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <IncidentStatsCards incidents={incidents} />

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
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
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {statusKey === "ALL" ? "All Incidents" : statusKey}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder="Filter incidents... (Press /)"
            className="h-8 pl-8 text-xs bg-card"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* 4-State UI Content Rendering */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
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

      {isError && (
        <ErrorState
          title="Failed to load live incident feed"
          message={
            error instanceof Error
              ? error.message
              : "Could not connect to the Express API. Please verify the backend server is running."
          }
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && filteredIncidents.length === 0 && (
        <EmptyState
          title={
            searchTerm
              ? "No matching incidents found"
              : filter === "ALL"
                ? "All systems operational"
                : `No ${filter.toLowerCase()} incidents`
          }
          description={
            searchTerm
              ? `No incidents matched the search term "${searchTerm}".`
              : "There are currently zero open incident alerts in queue."
          }
          actionLabel="Send Test Webhook Alert"
          onAction={() => setIsTriggerModalOpen(true)}
        />
      )}

      {!isLoading && !isError && filteredIncidents.length > 0 && (
        <div className="space-y-3">
          {filteredIncidents.map((incident) => (
            <IncidentRow
              key={incident.id}
              incident={incident}
              onSelect={(inc) => setSelectedIncidentId(inc.id)}
              onAcknowledge={handleAcknowledge}
              onResolve={handleResolve}
              isAckLoading={
                acknowledgeMutation.isPending &&
                acknowledgeMutation.variables === incident.id
              }
              isResolveLoading={
                resolveMutation.isPending &&
                resolveMutation.variables === incident.id
              }
            />
          ))}
        </div>
      )}

      {/* Incident Detail Slide-Over Drawer */}
      <IncidentDetailDrawer
        incident={
          selectedIncidentDetail ||
          incidents.find((i) => i.id === selectedIncidentId) ||
          null
        }
        isOpen={!!selectedIncidentId}
        onClose={() => setSelectedIncidentId(null)}
        onAcknowledge={handleAcknowledge}
        onResolve={handleResolve}
        isAckLoading={
          acknowledgeMutation.isPending &&
          acknowledgeMutation.variables === selectedIncidentId
        }
        isResolveLoading={
          resolveMutation.isPending &&
          resolveMutation.variables === selectedIncidentId
        }
      />

      {/* Quick Trigger Modal */}
      <TriggerAlertModal
        isOpen={isTriggerModalOpen}
        onClose={() => setIsTriggerModalOpen(false)}
      />
    </div>
  );
}
