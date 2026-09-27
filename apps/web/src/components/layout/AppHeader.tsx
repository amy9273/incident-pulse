"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { LiveStatusIndicator } from "../ui/LiveStatusIndicator";
import { AudioAlertToggle } from "../ui/AudioAlertToggle";
import { ThemeToggle } from "../ui/ThemeToggle";
import { UserDropdown } from "./UserDropdown";
import { Button } from "../ui/Button";
import { useSocket } from "@/context/SocketContext";

interface AppHeaderProps {
  onMenuClick?: () => void;
}

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  const pathname = usePathname();
  const { isConnected } = useSocket();

  const getPageTitle = (path: string) => {
    if (path.startsWith("/incidents") || path === "/")
      return "Live Incident Board";
    if (path.startsWith("/schedules")) return "On-Call Schedules";
    if (path.startsWith("/services")) return "Monitored Services & Keys";
    if (path.startsWith("/analytics")) return "Incident Analytics & MTTA/MTTR";
    if (path.startsWith("/settings")) return "Platform Settings";
    return "Dashboard";
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card/80 px-4 md:px-6 backdrop-blur-md">
      {/* Left section: mobile hamburger & title */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuClick}
          title="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div>
          <h1 className="text-sm md:text-base font-semibold text-foreground tracking-tight">
            {getPageTitle(pathname)}
          </h1>
        </div>
      </div>

      {/* Right section: Live status, Theme, User */}
      <div className="flex items-center gap-2.5">
        <LiveStatusIndicator isConnected={isConnected} />
        <AudioAlertToggle />

        <div className="h-4 w-[1px] bg-border mx-1" />

        <ThemeToggle />

        <UserDropdown />
      </div>
    </header>
  );
}
