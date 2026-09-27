"use client";

import * as React from "react";
import {
  Calendar,
  Clock,
  Plus,
  RefreshCw,
  Users,
  Shield,
  Layers,
} from "lucide-react";
import {
  useSchedules,
  useSchedule,
  useDeleteShift,
} from "@/hooks/useSchedules";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ActiveOnCallSummary } from "@/components/schedules/ActiveOnCallSummary";
import { ScheduleTimeline } from "@/components/schedules/ScheduleTimeline";
import { CreateShiftModal } from "@/components/schedules/CreateShiftModal";
import { CreateScheduleModal } from "@/components/schedules/CreateScheduleModal";

export default function SchedulesPage() {
  const {
    data: schedules,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useSchedules();

  const [selectedScheduleId, setSelectedScheduleId] = React.useState<
    string | null
  >(null);
  const [isShiftModalOpen, setIsShiftModalOpen] = React.useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = React.useState(false);

  const deleteShiftMutation = useDeleteShift();

  // Set default selected schedule once loaded
  React.useEffect(() => {
    if (schedules && schedules.length > 0 && !selectedScheduleId) {
      setSelectedScheduleId(schedules[0]!.id);
    }
  }, [schedules, selectedScheduleId]);

  const { data: activeScheduleData } = useSchedule(selectedScheduleId);

  const activeSchedule =
    activeScheduleData ||
    schedules?.find((s) => s.id === selectedScheduleId) ||
    null;

  const handleDeleteShift = (shiftId: string) => {
    if (selectedScheduleId) {
      deleteShiftMutation.mutate({
        scheduleId: selectedScheduleId,
        shiftId,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            On-Call Rotations & Schedules
            {isFetching && !isLoading && (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
          </h2>
          <p className="text-xs text-muted-foreground">
            Manage weekly shift rotations, coverage timelines, and active
            incident responders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => setIsScheduleModalOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            New Schedule
          </Button>

          {activeSchedule && (
            <Button
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setIsShiftModalOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Shift
            </Button>
          )}
        </div>
      </div>

      {/* 4-State UI Handling */}
      {isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-5 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-16 w-full rounded-md" />
                <Skeleton className="h-4 w-1/2" />
              </Card>
            ))}
          </div>
          <Card className="p-6">
            <Skeleton className="h-64 w-full rounded-lg" />
          </Card>
        </div>
      )}

      {isError && (
        <ErrorState
          title="Failed to load on-call schedules"
          message={
            error instanceof Error
              ? error.message
              : "Could not connect to the backend API. Please ensure the Express server is running."
          }
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && (!schedules || schedules.length === 0) && (
        <EmptyState
          icon={Calendar}
          title="No on-call schedules configured"
          description="Create your first team on-call rotation to start automatically assigning triggered incident alerts."
          actionLabel="Create First Schedule"
          onAction={() => setIsScheduleModalOpen(true)}
        />
      )}

      {!isLoading && !isError && schedules && schedules.length > 0 && (
        <div className="space-y-6">
          {/* Active On-Call Summary Banner */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Current Active On-Call Coverage
            </h3>
            <ActiveOnCallSummary schedules={schedules} />
          </div>

          {/* Schedule Selector Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
            <span className="text-xs font-semibold text-muted-foreground pr-2">
              Select Rotation:
            </span>
            {schedules.map((sch) => {
              const isSelected = sch.id === selectedScheduleId;
              return (
                <button
                  key={sch.id}
                  onClick={() => setSelectedScheduleId(sch.id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {sch.name}
                </button>
              );
            })}
          </div>

          {/* Visual Timeline for Active Schedule */}
          {activeSchedule && (
            <Card className="p-6 shadow-sm">
              <ScheduleTimeline
                schedule={activeSchedule}
                onAddShiftClick={() => setIsShiftModalOpen(true)}
                onDeleteShift={handleDeleteShift}
                isDeletingShift={deleteShiftMutation.isPending}
              />
            </Card>
          )}
        </div>
      )}

      {/* Modals */}
      {selectedScheduleId && (
        <CreateShiftModal
          scheduleId={selectedScheduleId}
          isOpen={isShiftModalOpen}
          onClose={() => setIsShiftModalOpen(false)}
        />
      )}

      <CreateScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onScheduleCreated={(newId) => setSelectedScheduleId(newId)}
      />
    </div>
  );
}
