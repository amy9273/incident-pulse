"use client";

import * as React from "react";
import {
  BarChart2,
  TrendingUp,
  Clock,
  ShieldCheck,
  Activity,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Incident Analytics & SLA Performance
        </h2>
        <p className="text-xs text-muted-foreground">
          Track Mean Time to Acknowledge (MTTA), Mean Time to Resolve (MTTR),
          and service incident frequency.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Mean Time to Acknowledge
            </CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">1.4 min</div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
              ↓ 38% vs 30-day avg
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Mean Time to Resolve
            </CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">18.2 min</div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
              ↓ 12% vs 30-day avg
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              SLA Compliance Rate
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">99.4%</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Target: &gt; 99.0%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Auto-Escalation Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">4.2%</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Escalated past Tier 1
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Incident Distribution Card */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-foreground mb-1">
          Incidents by Service (Last 30 Days)
        </h3>
        <p className="text-xs text-muted-foreground mb-6">
          Frequency breakdown of incoming webhook alerts by service component.
        </p>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-foreground">
                Checkout & Payment API
              </span>
              <span className="text-muted-foreground">28 incidents (58%)</span>
            </div>
            <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: "58%" }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-foreground">
                Platform Infrastructure
              </span>
              <span className="text-muted-foreground">14 incidents (29%)</span>
            </div>
            <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full"
                style={{ width: "29%" }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-foreground">
                Authentication & Gateway
              </span>
              <span className="text-muted-foreground">6 incidents (13%)</span>
            </div>
            <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: "13%" }}
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
