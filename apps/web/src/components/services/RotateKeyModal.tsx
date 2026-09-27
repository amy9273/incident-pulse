"use client";

import * as React from "react";
import { X, AlertTriangle, Key, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useRotateServiceKey } from "@/hooks/useServices";

interface RotateKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: {
    id: string;
    name: string;
    serviceKey: string;
  } | null;
}

export function RotateKeyModal({
  isOpen,
  onClose,
  service,
}: RotateKeyModalProps) {
  const rotateKeyMutation = useRotateServiceKey();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  if (!isOpen || !service) return null;

  const handleRotate = async () => {
    setErrorMessage(null);
    try {
      await rotateKeyMutation.mutateAsync(service.id);
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to rotate service key";
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
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Rotate Integration Key
              </h3>
              <p className="text-xs text-muted-foreground">{service.name}</p>
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

        <div className="mt-4 space-y-4">
          {errorMessage && (
            <div className="rounded-md bg-destructive/10 border border-destructive/30 p-2.5 text-xs text-destructive font-medium">
              {errorMessage}
            </div>
          )}

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 flex gap-3 text-xs text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div className="space-y-1">
              <p className="font-semibold">Warning: Destructive Key Action</p>
              <p className="text-[11px] leading-relaxed opacity-90">
                Rotating this service key will immediately invalidate the
                current token. Any monitoring tools, Prometheus alertmanagers,
                or scripts sending alerts using the old token will be rejected
                with HTTP 401.
              </p>
            </div>
          </div>

          <div className="space-y-1.5 text-xs">
            <span className="text-muted-foreground">Current Active Key:</span>
            <div className="rounded-md border border-border bg-secondary/50 p-2 font-mono text-[11px] text-foreground">
              {service.serviceKey.slice(0, 16)}•••••••••••••••••
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRotate}
              isLoading={rotateKeyMutation.isPending}
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Rotate Key Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
