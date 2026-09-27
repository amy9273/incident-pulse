"use client";

import * as React from "react";
import {
  Layers,
  Key,
  Copy,
  Check,
  Plus,
  Terminal,
  Play,
  Search,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  ShieldAlert,
  AlertCircle,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { useServices, useDeleteService } from "@/hooks/useServices";
import { CreateServiceModal } from "@/components/services/CreateServiceModal";
import { RotateKeyModal } from "@/components/services/RotateKeyModal";
import { ServiceIntegrationDrawer } from "@/components/services/ServiceIntegrationDrawer";
import { ServiceListItem } from "@incident-pulse/shared";

export default function ServicesPage() {
  const { data: services, isLoading, isError, error, refetch } = useServices();
  const deleteServiceMutation = useDeleteService();

  // Search filter
  const [searchQuery, setSearchQuery] = React.useState("");

  // Key Visibility Map (serviceId -> boolean)
  const [visibleKeys, setVisibleKeys] = React.useState<Record<string, boolean>>(
    {},
  );
  const [copiedKeyId, setCopiedKeyId] = React.useState<string | null>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [rotateKeyService, setRotateKeyService] =
    React.useState<ServiceListItem | null>(null);
  const [selectedDrawerService, setSelectedDrawerService] =
    React.useState<ServiceListItem | null>(null);

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(text);
      setCopiedKeyId(id);
      setTimeout(() => setCopiedKeyId(null), 2000);
    }
  };

  const handleDeleteService = async (service: ServiceListItem) => {
    if (service.activeIncidents > 0) {
      alert(
        `Cannot delete ${service.name} because it has ${service.activeIncidents} active incidents. Resolve all open incidents first.`,
      );
      return;
    }

    if (
      confirm(
        `Are you sure you want to delete "${service.name}"? This action cannot be undone.`,
      )
    ) {
      try {
        await deleteServiceMutation.mutateAsync(service.id);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Failed to delete service";
        alert(msg);
      }
    }
  };

  const filteredServices = React.useMemo(() => {
    if (!services) return [];
    if (!searchQuery.trim()) return services;
    const q = searchQuery.toLowerCase();
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q)),
    );
  }, [services, searchQuery]);

  // 1. Loading State (Skeleton)
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-10 w-full" />
              <div className="flex justify-between pt-3 border-t border-border">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // 2. Error State
  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Monitored Services & Integration Keys
          </h2>
          <p className="text-xs text-muted-foreground">
            Manage webhook endpoints, integration tokens, and linked escalation
            policies.
          </p>
        </div>
        <ErrorState
          title="Failed to load monitored services"
          message={
            error?.message ||
            "An unexpected error occurred while fetching services"
          }
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  // 3. Empty State
  if (!services || services.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Monitored Services & Integration Keys
            </h2>
            <p className="text-xs text-muted-foreground">
              Manage webhook endpoints, integration tokens, and linked
              escalation policies.
            </p>
          </div>
          <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Service
          </Button>
        </div>

        <EmptyState
          icon={Layers}
          title="No monitored services found"
          description="Create your first monitored service to generate webhook API keys and attach automated escalation policies."
          actionLabel="Add Monitored Service"
          onAction={() => setIsCreateModalOpen(true)}
        />

        <CreateServiceModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      </div>
    );
  }

  // 4. Populated State
  const totalActiveIncidents = services.reduce(
    (acc, s) => acc + s.activeIncidents,
    0,
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Monitored Services & Integration Keys
            </h2>
            <Badge variant="outline" className="text-xs font-semibold">
              {services.length} Service{services.length > 1 ? "s" : ""}
            </Badge>
            {totalActiveIncidents > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400 animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                {totalActiveIncidents} Active Incident
                {totalActiveIncidents > 1 ? "s" : ""}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                All Healthy
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage webhook endpoints, integration tokens, and linked multi-tier
            escalation policies.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Service
          </Button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by service name or slug..."
            className="w-full rounded-md border border-input bg-card pl-9 pr-3 py-1.5 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* Services Grid */}
      {filteredServices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
          No services matching &quot;{searchQuery}&quot;. Clear search to see
          all services.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredServices.map((srv) => {
            const isKeyVisible = !!visibleKeys[srv.id];
            const isHealthy = srv.status === "HEALTHY";

            return (
              <Card
                key={srv.id}
                className="p-5 flex flex-col justify-between hover:border-primary/40 transition-colors shadow-xs"
              >
                <div className="space-y-3.5">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground">
                          {srv.name}
                        </span>
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px]"
                        >
                          {srv.slug}
                        </Badge>
                      </div>
                      {srv.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {srv.description}
                        </p>
                      )}
                    </div>

                    {/* Status Pill */}
                    {isHealthy ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                        <CheckCircle2 className="h-3 w-3" />
                        HEALTHY
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-red-600 dark:text-red-400 shrink-0 animate-pulse">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        {srv.activeIncidents} ACTIVE
                      </span>
                    )}
                  </div>

                  {/* Escalation Policy Badge & Tiers */}
                  <div className="rounded-lg border border-border bg-secondary/30 p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <ShieldAlert className="h-3.5 w-3.5 text-primary" />
                        <span>{srv.escalationPolicy.name}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {srv.escalationPolicy.rules?.length || 0} tier
                        {(srv.escalationPolicy.rules?.length || 0) > 1
                          ? "s"
                          : ""}
                      </span>
                    </div>

                    {srv.escalationPolicy.rules &&
                      srv.escalationPolicy.rules.length > 0 && (
                        <div className="text-[11px] text-muted-foreground space-y-0.5">
                          {srv.escalationPolicy.rules.map((r) => (
                            <div
                              key={r.id}
                              className="flex items-center justify-between text-[10px]"
                            >
                              <span>
                                T{r.stepNumber}:{" "}
                                <span className="text-foreground font-medium">
                                  {r.targetType === "SCHEDULE"
                                    ? r.targetSchedule?.name || "Schedule"
                                    : r.targetUser?.name || "Responder"}
                                </span>
                              </span>
                              <span className="font-mono text-muted-foreground">
                                +{r.delayMinutes}m
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>

                  {/* Service Integration Key Box */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1 font-medium">
                        <Key className="h-3 w-3" /> Ingestion API Key
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleKeyVisibility(srv.id)}
                        className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5"
                      >
                        {isKeyVisible ? (
                          <>
                            <EyeOff className="h-3 w-3" /> Hide
                          </>
                        ) : (
                          <>
                            <Eye className="h-3 w-3" /> Reveal
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 bg-secondary/50 px-2.5 py-1.5 rounded-md border border-border">
                      <code className="text-[11px] font-mono text-foreground flex-1 truncate select-all">
                        {isKeyVisible
                          ? srv.serviceKey
                          : `${srv.serviceKey.slice(0, 12)}••••••••••••••••••••`}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-muted-foreground shrink-0 hover:text-foreground"
                        onClick={() => copyToClipboard(srv.serviceKey, srv.id)}
                        title="Copy API Key"
                      >
                        {copiedKeyId === srv.id ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      <strong>{srv.totalIncidents}</strong> total alerts
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setRotateKeyService(srv)}
                      title="Rotate integration key"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => handleDeleteService(srv)}
                      title="Delete service"
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setSelectedDrawerService(srv)}
                    >
                      <Terminal className="mr-1 h-3 w-3" /> Integration
                    </Button>

                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setSelectedDrawerService(srv)}
                    >
                      <Play className="mr-1 h-3 w-3" /> Test Alert
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modals & Drawers */}
      <CreateServiceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <RotateKeyModal
        isOpen={!!rotateKeyService}
        onClose={() => setRotateKeyService(null)}
        service={rotateKeyService}
      />

      <ServiceIntegrationDrawer
        isOpen={!!selectedDrawerService}
        onClose={() => setSelectedDrawerService(null)}
        service={selectedDrawerService}
      />
    </div>
  );
}
