"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Calendar,
  Layers,
  BarChart2,
  Settings,
  ShieldAlert,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  {
    name: "Incidents",
    href: "/incidents",
    icon: AlertTriangle,
    matchExact: false,
  },
  {
    name: "On-Call Schedules",
    href: "/schedules",
    icon: Calendar,
    matchExact: false,
  },
  {
    name: "Services & Keys",
    href: "/services",
    icon: Layers,
    matchExact: false,
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: BarChart2,
    matchExact: false,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    matchExact: false,
  },
];

interface AppSidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function AppSidebar({ className, onNavigate }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-full w-64 flex-col border-r border-border bg-card text-card-foreground",
        className,
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow">
          <Flame className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-base leading-tight tracking-tight text-foreground flex items-center gap-1.5">
            IncidentPulse
            <span className="rounded bg-primary/10 px-1 py-0.2 text-[10px] font-semibold text-primary">
              v1.0
            </span>
          </span>
          <span className="text-[11px] text-muted-foreground">
            On-Call & Incident Ops
          </span>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
        <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Platform
        </div>
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === "/incidents" && pathname === "/") ||
            (item.href !== "/" && pathname.startsWith(item.href));

          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform group-hover:scale-105",
                  isActive
                    ? "text-primary-foreground"
                    : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer System Status */}
      <div className="border-t border-border p-3">
        <div className="rounded-md bg-secondary/50 p-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs font-medium text-foreground">
              Escalation Engine
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            BullMQ delayed queue is active and healthy.
          </p>
        </div>
      </div>
    </aside>
  );
}
