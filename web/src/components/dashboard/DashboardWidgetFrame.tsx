import type { ReactNode } from "react";
import type { DashboardWidgetInstance } from "@/lib/dashboard-settings";
import { DashboardCard } from "./DashboardCard";
import { DashboardWidgetErrorBoundary } from "./DashboardWidgetErrorBoundary";
import { getWidgetDefinition } from "./widgetRegistry";

export function DashboardWidgetFrame({ instance, editing, compact, children }: { instance: DashboardWidgetInstance; editing: boolean; compact: boolean; children: ReactNode }) {
  const definition = getWidgetDefinition(instance.type);
  return (
    <DashboardCard title={definition.label} icon={definition.icon} editing={editing} compact={compact} className={editing ? "ring-1 ring-sky-400/35" : undefined}>
      <DashboardWidgetErrorBoundary title={definition.label}>{children}</DashboardWidgetErrorBoundary>
    </DashboardCard>
  );
}
