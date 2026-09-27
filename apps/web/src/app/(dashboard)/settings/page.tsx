"use client";

import * as React from "react";
import { useAuth } from "@/context/AuthContext";
import { User, Shield, Bell, Key, Moon, Sun, Smartphone } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Platform Settings & Profile
        </h2>
        <p className="text-xs text-muted-foreground">
          Manage responder notifications, API access, and preferences.
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">User Profile</CardTitle>
          <CardDescription className="text-xs">
            Your current logged-in identity and role permissions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Full Name
              </label>
              <Input readOnly value={user?.name || ""} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Email Address
              </label>
              <Input readOnly value={user?.email || ""} />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <span className="text-xs font-medium text-muted-foreground">
              Assigned Role:
            </span>
            <Badge variant="default" className="uppercase text-[10px]">
              <Shield className="mr-1 h-3 w-3" />
              {user?.role || "RESPONDER"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            Emergency Dispatch Channels
          </CardTitle>
          <CardDescription className="text-xs">
            Configure how you receive urgent on-call pages when incidents
            trigger.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Smartphone className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Mobile Push Notifications (FCM)
                </p>
                <p className="text-[11px] text-muted-foreground">
                  High-priority emergency wake alerts (Unit 13)
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="text-emerald-600 border-emerald-500/30"
            >
              Active
            </Badge>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  In-App Live Sound & Banner
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Real-time alerts on dashboard when in shift
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="text-emerald-600 border-emerald-500/30"
            >
              Active
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            Appearance & Theme
          </CardTitle>
          <CardDescription className="text-xs">
            Toggle between High-Contrast Dark Obsidian and Daylight modes.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-foreground">Theme Mode</p>
            <p className="text-[11px] text-muted-foreground">
              Switch color theme instantly
            </p>
          </div>
          <ThemeToggle />
        </CardContent>
      </Card>
    </div>
  );
}
