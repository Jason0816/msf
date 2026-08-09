"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Puzzle } from "lucide-react";
import {
  DASHBOARD_LAYOUT_COMMAND_EVENT,
  DASHBOARD_LAYOUT_STATE_EVENT,
  DASHBOARD_SETTINGS_EVENT,
  loadDashboardSettings,
  saveDashboardSettings,
  type DashboardLayoutCommand,
  type DashboardSettings,
  type DashboardWidgetInstance,
} from "@/lib/dashboard-settings";
import { DashboardDataProvider } from "./data";
import {
  MihomoServiceWidget,
  MosdnsServiceWidget,
  SingboxServiceWidget,
  SystemInfoCollectionWidget,
  SystemRateWidget,
  SystemResourcesWidget,
  type SystemInfoPage,
} from "./widgets/system";
import { DashboardGrid, type DashboardRenderSize } from "./DashboardGrid";
import { resetDashboardLayouts } from "./layout/dashboardLayout";

function MissingWidget({ type }: { type: string }) {
  return (
    <div className="flex h-full min-h-28 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
      <Puzzle className="h-6 w-6 opacity-60" />
      <p className="text-xs">{type} 组件正在接入</p>
    </div>
  );
}

function cloneSettings(settings: DashboardSettings) {
  return JSON.parse(JSON.stringify(settings)) as DashboardSettings;
}

export function Dashboard() {
  const [settings, setSettings] = useState<DashboardSettings>(() => loadDashboardSettings());
  const [editing, setEditing] = useState(false);
  const settingsRef = useRef(settings);
  const editSnapshotRef = useRef<DashboardSettings["layouts"] | null>(null);

  const applySettings = useCallback((next: DashboardSettings, persist = true) => {
    settingsRef.current = next;
    setSettings(next);
    if (persist) saveDashboardSettings(next);
  }, []);

  useEffect(() => {
    const syncSettings = () => {
      const next = loadDashboardSettings();
      settingsRef.current = next;
      setSettings(next);
    };
    window.addEventListener(DASHBOARD_SETTINGS_EVENT, syncSettings);
    window.addEventListener("storage", syncSettings);
    return () => {
      window.removeEventListener(DASHBOARD_SETTINGS_EVENT, syncSettings);
      window.removeEventListener("storage", syncSettings);
    };
  }, []);

  useEffect(() => {
    const publishEditing = (value: boolean) => window.dispatchEvent(new CustomEvent(DASHBOARD_LAYOUT_STATE_EVENT, { detail: { editing: value } }));
    const onCommand = (event: Event) => {
      const command = (event as CustomEvent<{ command?: DashboardLayoutCommand }>).detail?.command;
      if (command === "edit") {
        editSnapshotRef.current = cloneSettings(settingsRef.current).layouts;
        setEditing(true);
        publishEditing(true);
      } else if (command === "done") {
        editSnapshotRef.current = null;
        setEditing(false);
        publishEditing(false);
      } else if (command === "undo") {
        if (editSnapshotRef.current) {
          const current = settingsRef.current;
          const currentIds = new Set(current.instances.map((instance) => instance.id));
          const mergeBreakpoint = (key: keyof DashboardSettings["layouts"]) => {
            const snapshotItems = editSnapshotRef.current![key].filter((item) => currentIds.has(item.i));
            const snapshotIds = new Set(snapshotItems.map((item) => item.i));
            return [...snapshotItems, ...current.layouts[key].filter((item) => !snapshotIds.has(item.i))];
          };
          applySettings({ ...current, layouts: { desktop: mergeBreakpoint("desktop"), tablet: mergeBreakpoint("tablet"), mobile: mergeBreakpoint("mobile") } });
        }
      } else if (command === "reset") {
        applySettings(resetDashboardLayouts(settingsRef.current));
      }
    };
    window.addEventListener(DASHBOARD_LAYOUT_COMMAND_EVENT, onCommand);
    publishEditing(false);
    return () => window.removeEventListener(DASHBOARD_LAYOUT_COMMAND_EVENT, onCommand);
  }, [applySettings]);

  const updateInstanceSettings = (instance: DashboardWidgetInstance, patch: Record<string, unknown>) => {
    applySettings({
      ...settingsRef.current,
      instances: settingsRef.current.instances.map((item) => item.id === instance.id ? { ...item, settings: { ...item.settings, ...patch } } : item),
    });
  };

  const renderWidget = (instance: DashboardWidgetInstance, size: DashboardRenderSize) => {
    switch (instance.type) {
      case "system-info": {
        const page = (["device", "hardware", "stats"] as const).includes(instance.settings?.tab as SystemInfoPage) ? instance.settings?.tab as SystemInfoPage : "device";
        return <SystemInfoCollectionWidget activePage={page} onActivePageChange={(tab) => updateInstanceSettings(instance, { tab })} size={size} />;
      }
      case "system-resources": return <SystemResourcesWidget size={size} />;
      case "system-rate": return <SystemRateWidget size={size} />;
      case "singbox-service": return <SingboxServiceWidget />;
      case "mosdns-service": return <MosdnsServiceWidget />;
      case "mihomo-service": return <MihomoServiceWidget />;
      default: return <MissingWidget type={instance.type} />;
    }
  };

  return (
    <DashboardDataProvider>
      <DashboardGrid settings={settings} editing={editing} onChange={applySettings} renderWidget={renderWidget} />
    </DashboardDataProvider>
  );
}
