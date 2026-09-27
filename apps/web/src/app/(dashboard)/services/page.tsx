"use client";

import * as React from "react";
import { Layers, Key, Copy, Check, Plus, Terminal } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

const SAMPLE_SERVICES = [
  {
    id: "srv_001",
    name: "Checkout & Payment API",
    slug: "checkout-payment-api",
    serviceKey: "inc_live_9f830a7d2b4e819c56fa71390d2e8412",
    escalationPolicy: "Core Payments Escalation (3 Tiers)",
    incidentsCount: 14,
    status: "HEALTHY",
  },
  {
    id: "srv_002",
    name: "Authentication & Token Gateway",
    slug: "auth-token-gateway",
    serviceKey: "inc_live_41c0e8293d8b746a5ef928174620abcd",
    escalationPolicy: "Platform Default Policy (2 Tiers)",
    incidentsCount: 3,
    status: "HEALTHY",
  },
];

export default function ServicesPage() {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  const copyToClipboard = (key: string) => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(key);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Monitored Services & Integration Keys
          </h2>
          <p className="text-xs text-muted-foreground">
            Manage webhook endpoints, integration tokens, and linked escalation
            policies.
          </p>
        </div>

        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> Add Service
        </Button>
      </div>

      {/* Services List */}
      <div className="grid grid-cols-1 gap-4">
        {SAMPLE_SERVICES.map((srv) => (
          <Card key={srv.id} className="p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground">
                    {srv.name}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {srv.slug}
                  </Badge>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.2 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="h-1 w-1 rounded-full bg-emerald-500" />
                    {srv.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Linked Policy:{" "}
                  <span className="font-medium text-foreground">
                    {srv.escalationPolicy}
                  </span>
                </p>
              </div>

              {/* Service Key & Webhook Copy */}
              <div className="flex items-center gap-2 bg-secondary/50 p-2 rounded-md border border-border">
                <Key className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <code className="text-xs font-mono text-muted-foreground select-all">
                  {srv.serviceKey.slice(0, 16)}...
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => copyToClipboard(srv.serviceKey)}
                  title="Copy full Service Key"
                >
                  {copiedKey === srv.serviceKey ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>

            {/* Quick Webhook Snippet */}
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5" />
                <span>
                  POST endpoint:{" "}
                  <code className="text-[11px] font-mono text-foreground">
                    /api/v1/webhooks/services/{srv.serviceKey.slice(0, 12)}...
                  </code>
                </span>
              </div>
              <span>{srv.incidentsCount} total incidents ingested</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
