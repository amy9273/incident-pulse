"use client";

import * as React from "react";
import { ScheduleDetail, ScheduleShift } from "@incident-pulse/shared";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Trash2,
  User,
  Plus,
} from "lucide-react";

interface ScheduleTimelineProps {
  schedule: ScheduleDetail;
  onAddShiftClick: () => void;
  onDeleteShift: (shiftId: string) => void;
  isDeletingShift?: boolean;
}

export function ScheduleTimeline({
  schedule,
  onAddShiftClick,
  onDeleteShift,
  isDeletingShift = false,
}: ScheduleTimelineProps) {
  const [weekOffset, setWeekOffset] = React.useState<number>(0);

  // Calculate 7-day window based on week offset
  const days = React.useMemo(() => {
    const list: Date[] = [];
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + weekOffset * 7);

    // Start at Monday of current week
    const currentDay = baseDate.getDay();
    const distanceToMonday = (currentDay + 6) % 7;
    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() - distanceToMonday);
    monday.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      list.push(d);
    }
    return list;
  }, [weekOffset]);

  const shifts = schedule.shifts || [];
  const now = new Date();

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const getShiftsForDay = (day: Date) => {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    return shifts.filter((s) => {
      const sStart = new Date(s.startTime);
      const sEnd = new Date(s.endTime);
      return sStart <= dayEnd && sEnd >= dayStart;
    });
  };

  return (
    <div className="space-y-4">
      {/* Navigation Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Weekly Shift Timeline
          </h3>
          <span className="text-xs text-muted-foreground">
            (
            {days[0]!.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}{" "}
            -{" "}
            {days[6]!.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
            )
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => setWeekOffset(0)}
          >
            Today
          </Button>

          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8"
              onClick={() => setWeekOffset((prev) => prev - 1)}
              title="Previous Week"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8"
              onClick={() => setWeekOffset((prev) => prev + 1)}
              title="Next Week"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={onAddShiftClick}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Shift
          </Button>
        </div>
      </div>

      {/* 7-Day Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {days.map((day, idx) => {
          const isToday = isSameDay(day, now);
          const dayShifts = getShiftsForDay(day);

          return (
            <div
              key={idx}
              className={`rounded-lg border p-3 flex flex-col min-h-[220px] transition-colors ${
                isToday
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border bg-card"
              }`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {day.toLocaleDateString("en-US", { weekday: "short" })}
                  </p>
                  <p
                    className={`text-sm font-bold ${
                      isToday ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {day.getDate()}
                  </p>
                </div>

                {isToday && (
                  <span className="rounded bg-primary px-1.5 py-0.2 text-[9px] font-bold text-primary-foreground uppercase">
                    Today
                  </span>
                )}
              </div>

              {/* Day Shift Blocks */}
              <div className="flex-1 space-y-2 overflow-y-auto">
                {dayShifts.length > 0 ? (
                  dayShifts.map((shift) => {
                    const isShiftActive =
                      new Date(shift.startTime) <= now &&
                      new Date(shift.endTime) >= now;

                    return (
                      <div
                        key={shift.id}
                        className={`rounded-md p-2 text-xs border space-y-1 transition-all ${
                          isShiftActive
                            ? "border-emerald-500/40 bg-emerald-500/10 text-foreground"
                            : "border-border bg-secondary/50 text-foreground"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 truncate">
                            <User className="h-3 w-3 text-primary shrink-0" />
                            <span className="font-semibold text-[11px] truncate">
                              {shift.userName || "Engineer"}
                            </span>
                          </div>

                          <button
                            onClick={() => onDeleteShift(shift.id)}
                            disabled={isDeletingShift}
                            className="text-muted-foreground hover:text-destructive p-0.5 rounded transition-colors"
                            title="Delete shift"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" />
                          <span>
                            {new Date(shift.startTime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            -{" "}
                            {new Date(shift.endTime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        {isShiftActive && (
                          <div className="pt-0.5">
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                              <span className="h-1 w-1 rounded-full bg-emerald-500 animate-ping" />
                              Active Shift
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-center p-2 rounded border border-dashed border-border/60">
                    <p className="text-[10px] text-muted-foreground italic">
                      No shift scheduled
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
