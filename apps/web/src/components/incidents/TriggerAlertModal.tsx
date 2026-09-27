"use client";

import * as React from "react";
import { X, Zap, Send } from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { IncidentUrgency } from "@incident-pulse/shared";
import { useTriggerTestAlert } from "@/hooks/useIncidents";

interface TriggerAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TEMPLATES = [
  {
    title: "High Error Rate on POST /v1/checkout (HTTP 500 Spike)",
    summary:
      "Payment Gateway returned > 15% error rate across Singapore AWS region.",
    urgency: IncidentUrgency.HIGH,
    serviceKey: "inc_live_9f830a7d2b4e819c56fa71390d2e8412",
  },
  {
    title: "PostgreSQL Replica Replication Lag > 3200ms",
    summary: "High I/O wait times on analytics replica database nodes.",
    urgency: IncidentUrgency.HIGH,
    serviceKey: "inc_live_9f830a7d2b4e819c56fa71390d2e8412",
  },
  {
    title: "Token Invalidation Cache Eviction Failure",
    summary: "Redis memory fragmentation exceeded warning thresholds.",
    urgency: IncidentUrgency.LOW,
    serviceKey: "inc_live_41c0e8293d8b746a5ef928174620abcd",
  },
];

export function TriggerAlertModal({ isOpen, onClose }: TriggerAlertModalProps) {
  const triggerAlertMutation = useTriggerTestAlert();

  const [title, setTitle] = React.useState(TEMPLATES[0]!.title);
  const [summary, setSummary] = React.useState(TEMPLATES[0]!.summary);
  const [urgency, setUrgency] = React.useState<IncidentUrgency>(
    IncidentUrgency.HIGH,
  );
  const [serviceKey, setServiceKey] = React.useState(TEMPLATES[0]!.serviceKey);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectTemplate = (template: (typeof TEMPLATES)[0]) => {
    setTitle(template.title);
    setSummary(template.summary);
    setUrgency(template.urgency);
    setServiceKey(template.serviceKey);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await triggerAlertMutation.mutateAsync({
        serviceKey,
        payload: {
          title,
          summary,
          urgency,
          payload: {
            source: "Web Dashboard Alert Simulator",
            region: "ap-southeast-1",
            simulatedAt: new Date().toISOString(),
          },
        },
      });

      setSuccessMessage(
        result.isDuplicate
          ? `Alert deduplicated! Grouped into existing incident #${result.incident.id.slice(0, 8)}.`
          : `New incident #${result.incident.id.slice(0, 8)} triggered live!`,
      );

      setTimeout(() => {
        onClose();
        setSuccessMessage(null);
      }, 1200);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to trigger alert via webhook.";
      setErrorMessage(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl z-50 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Trigger Test Webhook Alert
              </h3>
              <p className="text-xs text-muted-foreground">
                Simulate external monitoring alerts over WebSockets
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Templates */}
        <div className="mt-4 space-y-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Quick Scenario Templates
          </span>
          <div className="grid grid-cols-1 gap-1.5">
            {TEMPLATES.map((t, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectTemplate(t)}
                className={`text-left p-2.5 rounded-lg border text-xs transition-colors ${
                  title === t.title
                    ? "border-primary bg-primary/5 text-primary font-medium"
                    : "border-border bg-secondary/30 hover:bg-secondary text-foreground"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold truncate">{t.title}</span>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    {t.urgency}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {successMessage && (
            <div className="rounded-md bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="rounded-md bg-destructive/10 border border-destructive/30 p-2.5 text-xs text-destructive font-medium">
              {errorMessage}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              Alert Title
            </label>
            <Input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Memory pressure on worker-03"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              Summary Details
            </label>
            <Input
              required
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief summary describing the trigger condition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                Urgency
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as IncidentUrgency)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value={IncidentUrgency.HIGH}>
                  HIGH (Critical / Pager)
                </option>
                <option value={IncidentUrgency.LOW}>LOW (Informational)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                Target Service Key
              </label>
              <Input
                required
                value={serviceKey}
                onChange={(e) => setServiceKey(e.target.value)}
                placeholder="inc_live_..."
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={triggerAlertMutation.isPending}
            >
              <Send className="mr-1.5 h-3.5 w-3.5" /> Dispatch Alert
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
