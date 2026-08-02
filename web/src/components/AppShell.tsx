"use client";

import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { Fab } from "@/components/Fab";
import { GlassFilterDefs } from "@/components/liquid-glass/GlassFilterDefs";
import { SceneBackdrop } from "@/components/liquid-glass/SceneBackdrop";
import { cn } from "@/lib/utils";

/** Shared authenticated layout: fixed header + sidebar, mobile bottom nav, FAB. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="gary-app-shell">
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
          "min-h-screen pb-24 pt-20 transition-[padding-left] duration-250 ease-out md:pb-8 md:pt-24",
          collapsed ? "md:pl-[5.75rem]" : "md:pl-[15rem]"
        )}
      >
        <div className="gary-page-enter w-full px-4 py-4 md:px-6 md:py-6 lg:px-8 xl:px-10 2xl:px-12">
          {children}
        </div>
      </main>
      <MobileNav />
      <Fab />
    </div>
  );
}
