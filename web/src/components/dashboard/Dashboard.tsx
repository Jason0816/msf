"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { DashboardDataProvider, DashboardProxyRuntimeProvider, MihomoDashboardProvider, MosdnsDashboardProvider, mihomoDashboardScopesForWidgetTypes, useMihomoDashboardData } from "./data";
import {
  MosdnsCacheStatsWidget,
  MosdnsCacheSystemWidget,
  MosdnsInfoWidget,
  MosdnsQueryWidget,
  MosdnsResolutionPolicyWidget,
  MosdnsRuntimeWidget,
  type MosdnsCachePage,
  type MosdnsCacheSystemPage,
  type MosdnsInfoPage,
  type MosdnsRuntimePage,
} from "./widgets/mosdns";
import {
  MihomoConnectionStatsWidget,
  MihomoGlobeWidget,
  MihomoLatencyWidget,
  MihomoProviderTrafficWidget,
  MihomoProxyGroupWidget,
  MihomoRuleHitsWidget,
  MihomoTopologyWidget,
  MihomoTrafficWidget,
} from "./widgets/mihomo";
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

function storedPage<T extends string>(instance: DashboardWidgetInstance, allowed: readonly T[], fallback: T): T {
  const page = instance.settings?.activePage;
  return typeof page === "string" && allowed.includes(page as T) ? page as T : fallback;
}

function ConnectedGlobeWidget({ size, editing }: { size: "m" | "l"; editing: boolean }) {
  const { connections } = useMihomoDashboardData();
  return <MihomoGlobeWidget connections={connections} size={size} editing={editing} />;
}

function ConnectedTopologyWidget({ size, editing }: { size: "m" | "l"; editing: boolean }) {
  const { connections } = useMihomoDashboardData();
  return <MihomoTopologyWidget connections={connections} size={size} editing={editing} />;
}

export function Dashboard() {
  const [settings, setSettings] = useState<DashboardSettings>(() => loadDashboardSettings());
  const [editing, setEditing] = useState(false);
  const settingsRef = useRef(settings);
  const editSnapshotRef = useRef<DashboardSettings["layouts"] | null>(null);
  const mihomoScopes = useMemo(() => mihomoDashboardScopesForWidgetTypes(settings.instances.map((instance) => instance.type)), [settings.instances]);
  const connectionHistoryRequested = settings.instances.some((instance) => instance.type === "mihomo-connection-stats");

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
    const standardSize = size === "xs" ? "s" : size;
    switch (instance.type) {
      case "system-info": {
        const page = (["device", "hardware", "stats"] as const).includes(instance.settings?.tab as SystemInfoPage) ? instance.settings?.tab as SystemInfoPage : "device";
        return <SystemInfoCollectionWidget activePage={page} onActivePageChange={(tab) => updateInstanceSettings(instance, { tab })} size={standardSize} />;
      }
      case "system-resources": return <SystemResourcesWidget size={standardSize} />;
      case "system-rate": return <SystemRateWidget size={standardSize} />;
      case "singbox-service": return <SingboxServiceWidget />;
      case "mosdns-service": return <MosdnsServiceWidget />;
      case "mosdns-query": return <MosdnsQueryWidget size={size} />;
      case "mosdns-info": {
        const activePage = storedPage<MosdnsInfoPage>(instance, ["split", "domains", "slowest", "clients"], "split");
        return <MosdnsInfoWidget size={size} activePage={activePage} onActivePageChange={(next) => updateInstanceSettings(instance, { activePage: next })} />;
      }
      case "mosdns-cache-stats": {
        const activePage = storedPage<MosdnsCachePage>(instance, ["all", "domestic", "foreign", "node"], "all");
        return <MosdnsCacheStatsWidget size={size} activePage={activePage} onActivePageChange={(next) => updateInstanceSettings(instance, { activePage: next })} />;
      }
      case "mosdns-runtime": {
        const activePage = storedPage<MosdnsRuntimePage>(instance, ["overview", "memory", "system"], "overview");
        return <MosdnsRuntimeWidget size={size} activePage={activePage} onActivePageChange={(next) => updateInstanceSettings(instance, { activePage: next })} />;
      }
      case "mosdns-resolution-policy": return <MosdnsResolutionPolicyWidget size={size} />;
      case "mosdns-cache-system": {
        const activePage = storedPage<MosdnsCacheSystemPage>(instance, ["stats", "strategy", "task", "operations"], "stats");
        return <MosdnsCacheSystemWidget size={size} activePage={activePage} onActivePageChange={(next) => updateInstanceSettings(instance, { activePage: next })} />;
      }
      case "mihomo-service": return <MihomoServiceWidget />;
      case "mihomo-traffic": return <MihomoTrafficWidget size={standardSize} />;
      case "mihomo-latency": return <MihomoLatencyWidget size={standardSize} />;
      case "mihomo-provider-traffic": return <MihomoProviderTrafficWidget size={standardSize} />;
      case "mihomo-connection-stats": return <MihomoConnectionStatsWidget size={standardSize} />;
      case "mihomo-rule-hits": return <MihomoRuleHitsWidget size={standardSize} />;
      case "mihomo-globe": return <ConnectedGlobeWidget size={size === "l" ? "l" : "m"} editing={editing} />;
      case "mihomo-topology": return <ConnectedTopologyWidget size={size === "l" ? "l" : "m"} editing={editing} />;
      case "mihomo-proxy-group": {
        const groupKey = typeof instance.settings?.groupKey === "string" ? instance.settings.groupKey : undefined;
        return <MihomoProxyGroupWidget groupKey={groupKey} onGroupKeyChange={(next) => updateInstanceSettings(instance, { groupKey: next })} size={standardSize} />;
      }
      default: return <MissingWidget type={instance.type} />;
    }
  };

  const grid = <DashboardGrid settings={settings} editing={editing} onChange={applySettings} renderWidget={renderWidget} />;
  const content = settings.instances.some((instance) => instance.type === "mihomo-proxy-group")
    ? <DashboardProxyRuntimeProvider>{grid}</DashboardProxyRuntimeProvider>
    : grid;

  return (
    <DashboardDataProvider>
      <MosdnsDashboardProvider>
        <MihomoDashboardProvider enabledScopes={mihomoScopes} connectionHistoryRequested={connectionHistoryRequested}>
          {content}
        </MihomoDashboardProvider>
      </MosdnsDashboardProvider>
    </DashboardDataProvider>
  );
}
