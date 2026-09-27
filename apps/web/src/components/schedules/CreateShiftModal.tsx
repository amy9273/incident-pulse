"use client";

import * as React from "react";
import { X, Calendar, Clock, User, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useUsers } from "@/hooks/useUsers";
import { useCreateShift } from "@/hooks/useSchedules";

interface CreateShiftModalProps {
  scheduleId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CreateShiftModal({
  scheduleId,
  isOpen,
  onClose,
}: CreateShiftModalProps) {
  const { data: users, isLoading: isUsersLoading } = useUsers();
  const createShiftMutation = useCreateShift();

  const [userId, setUserId] = React.useState<string>("");
  const [startTime, setStartTime] = React.useState<string>("");
  const [endTime, setEndTime] = React.useState<string>("");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Initialize dates
  React.useEffect(() => {
    if (isOpen) {
      const now = new Date();
      now.setMinutes(0, 0, 0);

      const oneWeekLater = new Date(now);
      oneWeekLater.setDate(now.getDate() + 7);

      const toLocalISO = (d: Date) => {
        const pad = (n: number) => n.toString().padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
          d.getDate(),
        )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      };

      setStartTime(toLocalISO(now));
      setEndTime(toLocalISO(oneWeekLater));
      setErrorMessage(null);

      if (users && users.length > 0 && !userId) {
        setUserId(users[0]!.id);
      }
    }
  }, [isOpen, users, userId]);

  if (!isOpen) return null;

  const applyPreset = (days: number) => {
    if (!startTime) return;
    const start = new Date(startTime);
    const end = new Date(start);
    end.setDate(start.getDate() + days);

    const pad = (n: number) => n.toString().padStart(2, "0");
    setEndTime(
      `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(
        end.getDate(),
      )}T${pad(end.getHours())}:${pad(end.getMinutes())}`,
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!userId) {
      setErrorMessage("Please select an on-call engineer");
      return;
    }

    try {
      await createShiftMutation.mutateAsync({
        scheduleId,
        data: {
          userId,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
        },
      });

      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to create schedule shift";
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

      <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl z-50 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Assign On-Call Shift
              </h3>
              <p className="text-xs text-muted-foreground">
                Add an engineer rotation coverage block
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {errorMessage && (
            <div className="rounded-md bg-destructive/10 border border-destructive/30 p-2.5 text-xs text-destructive font-medium">
              {errorMessage}
            </div>
          )}

          {/* Engineer Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Select On-Call Responder
            </label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={isUsersLoading}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {users?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email}) — {u.role}
                </option>
              ))}
            </select>
          </div>

          {/* Start Time */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Shift Start Time
            </label>
            <Input
              type="datetime-local"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          {/* End Time */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Shift End Time
            </label>
            <Input
              type="datetime-local"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>

          {/* Presets */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">
              Duration Presets
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={() => applyPreset(1)}
              >
                +24 Hours
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={() => applyPreset(3)}
              >
                +3 Days
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={() => applyPreset(7)}
              >
                +7 Days (1 Wk)
              </Button>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={createShiftMutation.isPending}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Save Shift
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
