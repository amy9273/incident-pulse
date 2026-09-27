"use client";

import * as React from "react";
import {
  X,
  Terminal,
  Copy,
  Check,
  Send,
  Code,
  FileCode2,
  CheckCircle2,
  AlertTriangle,
  Play,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { ServiceListItem } from "@incident-pulse/shared";
import { apiClient } from "@/lib/api";

interface ServiceIntegrationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  service: ServiceListItem | null;
}

type TabType = "test" | "curl" | "prometheus" | "datadog" | "node";

export function ServiceIntegrationDrawer({
  isOpen,
  onClose,
  service,
}: ServiceIntegrationDrawerProps) {
  const [activeTab, setActiveTab] = React.useState<TabType>("test");
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  // Test Alert State
  const [urgency, setUrgency] = React.useState<"HIGH" | "LOW">("HIGH");
  const [title, setTitle] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [customPayload, setCustomPayload] = React.useState(
    JSON.stringify(
      { latency_ms: 1850, threshold_ms: 1000, region: "ap-southeast-1" },
      null,
      2,
    ),
  );
  const [isSending, setIsSending] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{
    success: boolean;
    statusCode: number;
    statusText: string;
    incidentId?: string;
    alertCount?: number;
    error?: string;
  } | null>(null);

  React.useEffect(() => {
    if (service) {
      setTitle(`High Error Rate on ${service.name}`);
      setSummary(`HTTP 5xx rate exceeded 5% across edge pods`);
      setTestResult(null);
    }
  }, [service]);

  if (!isOpen || !service) return null;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const webhookUrl = `${apiUrl}/api/v1/webhooks/services/${service.serviceKey}`;

  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(text);
      setCopiedKey(label);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handleSendTestAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setTestResult(null);

    try {
      let parsedPayload: Record<string, unknown> = {};
      if (customPayload.trim()) {
        try {
          parsedPayload = JSON.parse(customPayload);
        } catch {
          throw new Error("Invalid JSON in custom payload field");
        }
      }

      const res = await apiClient<{
        status: string;
        incidentId: string;
        alertCount: number;
      }>(`/api/v1/webhooks/services/${service.serviceKey}`, {
        method: "POST",
        body: JSON.stringify({
          title,
          summary: summary || undefined,
          urgency,
          payload: parsedPayload,
        }),
      });

      setTestResult({
        success: true,
        statusCode: 201,
        statusText:
          res.status === "deduplicated"
            ? "Deduplicated Alert"
            : "Incident Triggered",
        incidentId: res.incidentId,
        alertCount: res.alertCount,
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to send test alert";
      setTestResult({
        success: false,
        statusCode: 400,
        statusText: "Alert Failed",
        error: msg,
      });
    } finally {
      setIsSending(false);
    }
  };

  const curlSnippet = `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Database Connection Pool Exhaustion",
    "summary": "Active connections reached 98% capacity",
    "urgency": "HIGH",
    "payload": {
      "metric": "db_pool_usage",
      "threshold": 95,
      "current_value": 98.4
    }
  }'`;

  const prometheusSnippet = `# Prometheus Alertmanager Webhook Receiver Config
receivers:
  - name: 'incident-pulse-${service.slug}'
    webhook_configs:
      - url: '${webhookUrl}'
        send_resolved: true
        http_config:
          follow_redirects: true`;

  const datadogSnippet = `{
  "title": "$EVENT_TITLE",
  "summary": "$EVENT_MSG",
  "urgency": "HIGH",
  "payload": {
    "alert_id": "$ALERT_ID",
    "hostname": "$HOSTNAME",
    "metric": "$ALERT_METRIC",
    "tags": "$TAGS"
  }
}`;

  const nodeSnippet = `// Node.js Webhook Dispatcher
const response = await fetch("${webhookUrl}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title: "Critical Job Queue Lag",
    summary: "BullMQ queue latency exceeded 60s SLA",
    urgency: "HIGH",
    payload: { queueSize: 1420, workersActive: 2 }
  })
});

const data = await response.json();
console.log("Incident triggered:", data.incidentId);`;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in"
        onClick={onClose}
      />

      {/* Slide-Over Drawer */}
      <div className="relative w-full max-w-xl h-full bg-card border-l border-border shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-5 border-b border-border flex items-center justify-between shrink-0 bg-secondary/30">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">
                {service.name}
              </h3>
              <Badge variant="outline" className="text-[10px] font-mono">
                {service.slug}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Webhook Integration & Live Alert Testing Console
            </p>
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

        {/* Webhook Endpoint Banner */}
        <div className="p-4 bg-background border-b border-border shrink-0">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
            Service Webhook Endpoint (POST)
          </label>
          <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-2 border border-border">
            <code className="text-[11px] font-mono text-foreground flex-1 truncate select-all">
              {webhookUrl}
            </code>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs shrink-0"
              onClick={() => copyToClipboard(webhookUrl, "endpoint")}
            >
              {copiedKey === "endpoint" ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border bg-muted/30 px-4 shrink-0 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab("test")}
            className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 font-medium transition-colors ${
              activeTab === "test"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Play className="h-3.5 w-3.5" /> Send Test Alert
          </button>
          <button
            onClick={() => setActiveTab("curl")}
            className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 font-medium transition-colors ${
              activeTab === "curl"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Terminal className="h-3.5 w-3.5" /> cURL
          </button>
          <button
            onClick={() => setActiveTab("prometheus")}
            className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 font-medium transition-colors ${
              activeTab === "prometheus"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileCode2 className="h-3.5 w-3.5" /> Prometheus
          </button>
          <button
            onClick={() => setActiveTab("datadog")}
            className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 font-medium transition-colors ${
              activeTab === "datadog"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Code className="h-3.5 w-3.5" /> Datadog
          </button>
          <button
            onClick={() => setActiveTab("node")}
            className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 font-medium transition-colors ${
              activeTab === "node"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Code className="h-3.5 w-3.5" /> Node.js
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === "test" && (
            <form onSubmit={handleSendTestAlert} className="space-y-4">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground leading-relaxed">
                Trigger a live simulated alert directly to this service&apos;s
                ingestion pipeline to verify deduplication, real-time WebSocket
                dispatch, and escalation timers.
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Incident Urgency
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setUrgency("HIGH")}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md border transition-all ${
                      urgency === "HIGH"
                        ? "bg-red-500/10 text-red-600 border-red-500/40 dark:text-red-400 shadow-xs"
                        : "bg-background border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    HIGH (Critical / Escalates)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUrgency("LOW")}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md border transition-all ${
                      urgency === "LOW"
                        ? "bg-secondary text-foreground border-border shadow-xs"
                        : "bg-background border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    LOW (Informational)
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Alert Title
                </label>
                <Input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. CPU Utilization Exceeded 90%"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Alert Summary
                </label>
                <Input
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="e.g. Sustained for 5 consecutive check cycles"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Custom JSON Payload
                </label>
                <textarea
                  rows={4}
                  value={customPayload}
                  onChange={(e) => setCustomPayload(e.target.value)}
                  className="w-full rounded-md border border-input bg-background p-2.5 font-mono text-[11px] shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <Button
                type="submit"
                size="sm"
                className="w-full"
                isLoading={isSending}
              >
                <Send className="mr-1.5 h-3.5 w-3.5" /> Send Test Alert Now
              </Button>

              {/* Test Response View */}
              {testResult && (
                <div
                  className={`rounded-lg border p-4 space-y-2 animate-in fade-in duration-200 ${
                    testResult.success
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                      : "bg-destructive/10 border-destructive/30 text-destructive"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold text-xs">
                      {testResult.success ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <AlertTriangle className="h-4 w-4" />
                      )}
                      <span>
                        HTTP {testResult.statusCode} {testResult.statusText}
                      </span>
                    </div>

                    {testResult.alertCount && (
                      <Badge variant="outline" className="text-[10px]">
                        Occurrence #{testResult.alertCount}
                      </Badge>
                    )}
                  </div>

                  {testResult.incidentId && (
                    <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-mono text-[10px]">
                        ID: {testResult.incidentId}
                      </span>
                      <Link
                        href="/incidents"
                        className="inline-flex items-center gap-1 font-semibold text-primary hover:underline text-xs"
                      >
                        View in Live Feed <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  )}

                  {testResult.error && (
                    <p className="text-xs font-mono">{testResult.error}</p>
                  )}
                </div>
              )}
            </form>
          )}

          {activeTab === "curl" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  Ready-to-run cURL Command
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => copyToClipboard(curlSnippet, "curl")}
                >
                  {copiedKey === "curl" ? (
                    <Check className="mr-1 h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="mr-1 h-3.5 w-3.5" />
                  )}
                  Copy Command
                </Button>
              </div>
              <pre className="rounded-lg bg-secondary/80 p-3.5 font-mono text-[11px] text-foreground overflow-x-auto border border-border">
                {curlSnippet}
              </pre>
            </div>
          )}

          {activeTab === "prometheus" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  alertmanager.yml Configuration
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => copyToClipboard(prometheusSnippet, "prom")}
                >
                  {copiedKey === "prom" ? (
                    <Check className="mr-1 h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="mr-1 h-3.5 w-3.5" />
                  )}
                  Copy Config
                </Button>
              </div>
              <pre className="rounded-lg bg-secondary/80 p-3.5 font-mono text-[11px] text-foreground overflow-x-auto border border-border">
                {prometheusSnippet}
              </pre>
            </div>
          )}

          {activeTab === "datadog" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  Datadog Webhook Payload Template
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => copyToClipboard(datadogSnippet, "dd")}
                >
                  {copiedKey === "dd" ? (
                    <Check className="mr-1 h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="mr-1 h-3.5 w-3.5" />
                  )}
                  Copy JSON
                </Button>
              </div>
              <pre className="rounded-lg bg-secondary/80 p-3.5 font-mono text-[11px] text-foreground overflow-x-auto border border-border">
                {datadogSnippet}
              </pre>
            </div>
          )}

          {activeTab === "node" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  Node.js / TypeScript Dispatcher
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => copyToClipboard(nodeSnippet, "node")}
                >
                  {copiedKey === "node" ? (
                    <Check className="mr-1 h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="mr-1 h-3.5 w-3.5" />
                  )}
                  Copy Script
                </Button>
              </div>
              <pre className="rounded-lg bg-secondary/80 p-3.5 font-mono text-[11px] text-foreground overflow-x-auto border border-border">
                {nodeSnippet}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
