"use client";

import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { Fab } from "@/components/Fab";
import { GlassFilterDefs } from "@/components/liquid-glass/GlassFilterDefs";
import { SceneBackdrop } from "@/components/liquid-glass/SceneBackdrop";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  fillViewport?: boolean;
  contentUnderHeader?: boolean;
}

/** Shared authenticated layout: fixed header + sidebar, mobile bottom nav, FAB. */
export function AppShell({
  children,
  fillViewport = false,
  contentUnderHeader = false,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={cn("gary-app-shell", collapsed && "gary-app-shell--sidebar-collapsed")}>
      <SceneBackdrop />
      <GlassFilterDefs />
      <a
        href="#main-content"
        className="fixed left-4 top-3 z-[80] -translate-y-24 rounded-xl bg-background px-4 py-2 text-sm font-medium text-foreground shadow-lg transition-transform focus:translate-y-0"
      >
        跳到主内容
      </a>
      <AppHeader sidebarCollapsed={collapsed} onToggleSidebar={() => setCollapsed((v) => !v)} />
      <Sidebar collapsed={collapsed} />
      <main
        id="main-content"
        className={cn(
          "transition-[padding-left] duration-250 ease-out",
          fillViewport
            ? contentUnderHeader
              ? "min-h-dvh pb-[calc(5rem+env(safe-area-inset-bottom))] pt-0 md:pb-0"
              : "h-dvh overflow-hidden pb-[calc(5rem+env(safe-area-inset-bottom))] pt-16 md:pb-3 md:pt-[85px]"
            : "min-h-screen pb-24 pt-20 md:pb-8 md:pt-[85px]",
          collapsed ? "md:pl-[5.75rem]" : "md:pl-[15rem]"
        )}
      >
        <div
          className={cn(
            "gary-page-enter w-full px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12",
            fillViewport && !contentUnderHeader
              ? "h-full min-h-0 overflow-hidden"
              : !contentUnderHeader && "py-4 md:pb-6 md:pt-0"
          )}
        >
          {children}
        </div>
      </main>
      <MobileNav />
      <Fab />
    </div>
  );
}
