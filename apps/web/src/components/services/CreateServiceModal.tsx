"use client";

import * as React from "react";
import { X, Layers, Plus, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useCreateService } from "@/hooks/useServices";
import { useEscalationPolicies } from "@/hooks/useEscalationPolicies";

interface CreateServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onServiceCreated?: (id: string) => void;
}

export function CreateServiceModal({
  isOpen,
  onClose,
  onServiceCreated,
}: CreateServiceModalProps) {
  const createServiceMutation = useCreateService();
  const { data: policies, isLoading: loadingPolicies } =
    useEscalationPolicies();

  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [escalationPolicyId, setEscalationPolicyId] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Auto-generate slug as user types name if slug hasn't been manually edited
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setName("");
      setSlug("");
      setDescription("");
      setEscalationPolicyId(policies?.[0]?.id || "");
      setIsSlugManuallyEdited(false);
      setErrorMessage(null);
    }
  }, [isOpen, policies]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isSlugManuallyEdited) {
      setSlug(
        val
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, ""),
      );
    }
  };

  const handleSlugChange = (val: string) => {
    setIsSlugManuallyEdited(true);
    setSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-"),
    );
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!escalationPolicyId) {
      setErrorMessage("Please select an escalation policy for this service");
      return;
    }

    try {
      const service = await createServiceMutation.mutateAsync({
        name,
        slug: slug || undefined,
        description: description || undefined,
        escalationPolicyId,
      });

      if (onServiceCreated) {
        onServiceCreated(service.id);
      }
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to create service";
      setErrorMessage(msg);
    }
  };

  const selectedPolicy = policies?.find((p) => p.id === escalationPolicyId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl z-50 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Add Monitored Service
              </h3>
              <p className="text-xs text-muted-foreground">
                Configure webhook ingestion and attach an escalation policy
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

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Service Name
            </label>
            <Input
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Checkout & Payment API"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Service Slug / Identifier
            </label>
            <div className="relative">
              <Input
                required
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="checkout-payment-api"
                className="font-mono text-xs"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Unique URL-safe identifier for telemetry routing.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Description (Optional)
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Handles payment gateway webhooks and stripe charges"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Linked Escalation Policy
            </label>
            {loadingPolicies ? (
              <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
            ) : (
              <select
                required
                value={escalationPolicyId}
                onChange={(e) => setEscalationPolicyId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="" disabled>
                  Select an escalation policy...
                </option>
                {policies?.map((policy) => (
                  <option key={policy.id} value={policy.id}>
                    {policy.name} ({policy.rules.length} tier
                    {policy.rules.length > 1 ? "s" : ""})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Policy Preview Summary */}
          {selectedPolicy && (
            <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <ShieldAlert className="h-3.5 w-3.5 text-primary" />
                <span>Escalation Route Preview</span>
              </div>
              <div className="space-y-1 text-[11px] text-muted-foreground">
                {selectedPolicy.rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between py-0.5"
                  >
                    <span>
                      Tier {rule.stepNumber}:{" "}
                      <span className="font-medium text-foreground">
                        {rule.targetType === "SCHEDULE"
                          ? `Schedule (${rule.targetSchedule?.name || "Active Rotation"})`
                          : `User (${rule.targetUser?.name || "Assigned Engineer"})`}
                      </span>
                    </span>
                    <span className="font-mono text-[10px]">
                      +{rule.delayMinutes}m delay
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={createServiceMutation.isPending}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Service
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
