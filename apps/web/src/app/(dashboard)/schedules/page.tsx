"use client";

import * as React from "react";
import { Calendar, Users, Clock, Plus } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function SchedulesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            On-Call Rotations & Schedules
          </h2>
          <p className="text-xs text-muted-foreground">
            Visual calendar shift scheduler and escalation tier assignees.
          </p>
        </div>

        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> Create Schedule
        </Button>
      </div>

      {/* Active On-Call Summary */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                Core Payments Rotation
              </CardTitle>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Active Shift
              </span>
            </div>
            <CardDescription className="text-xs">
              Weekly primary on-call rotation for checkout and payment
              microservices.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="flex items-center justify-between rounded-md bg-secondary/50 p-3 text-xs">
              <div className="space-y-0.5">
                <span className="font-semibold text-foreground">
                  Current Primary (Tier 1)
                </span>
                <p className="text-muted-foreground">
                  Sarah Chen (sarah.chen@incidentpulse.io)
                </p>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">
                Ends Sun 23:59 UTC
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                Platform Infrastructure
              </CardTitle>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Active Shift
              </span>
            </div>
            <CardDescription className="text-xs">
              Infrastructure, Kubernetes clusters, and database cluster
              rotations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="flex items-center justify-between rounded-md bg-secondary/50 p-3 text-xs">
              <div className="space-y-0.5">
                <span className="font-semibold text-foreground">
                  Current Primary (Tier 1)
                </span>
                <p className="text-muted-foreground">
                  Alex Kumar (alex.kumar@incidentpulse.io)
                </p>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">
                Ends Wed 12:00 UTC
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Area */}
      <Card className="p-6">
        <EmptyState
          icon={Calendar}
          title="Interactive Schedule Calendar (Unit 09)"
          description="Drag-and-drop rotation builder with multi-tier overrides and shift coverage timelines will be implemented in Unit 09."
          actionLabel="View Active Shifts"
          onAction={() =>
            alert("Scheduled for Unit 09: Visual On-Call Schedule Builder")
          }
        />
      </Card>
    </div>
  );
}
