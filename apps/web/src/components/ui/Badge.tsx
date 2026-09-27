import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "urgency-high"
    | "urgency-low";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variantStyles: Record<string, string> = {
    default: "border-transparent bg-primary text-primary-foreground shadow",
    secondary: "border-transparent bg-secondary text-secondary-foreground",
    destructive:
      "border-transparent bg-destructive text-destructive-foreground shadow",
    outline: "text-foreground border-border",
    "urgency-high":
      "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 font-semibold",
    "urgency-low":
      "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400 font-medium",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variantStyles[variant] || variantStyles.default,
        className,
      )}
      {...props}
    />
  );
}
