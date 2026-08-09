import {
  DASHBOARD_MAX_WIDGETS,
  createWidgetInstance,
  type DashboardBreakpoint,
  type DashboardLayoutItem,
  type DashboardSettings,
  type DashboardWidgetInstance,
  type DashboardWidgetType,
} from "@/lib/dashboard-settings";
import { getAllowedWidths, getWidgetDefinition, sizeColumns } from "../widgetRegistry";

const BREAKPOINT_COLUMNS: Record<DashboardBreakpoint, number> = { desktop: 12, tablet: 6, mobile: 1 };

export function closestAllowedWidth(width: number, allowed: number[]) {
  return allowed.reduce((best, candidate) => Math.abs(candidate - width) < Math.abs(best - width) ? candidate : best, allowed[0]);
}

export function snapDashboardItem(item: DashboardLayoutItem, instance: DashboardWidgetInstance, breakpoint: DashboardBreakpoint): DashboardLayoutItem {
  const definition = getWidgetDefinition(instance.type);
  const columns = BREAKPOINT_COLUMNS[breakpoint];
  const allowed = breakpoint === "desktop" ? getAllowedWidths(definition) : breakpoint === "tablet" ? [3, 6] : [1];
  const width = Math.min(columns, closestAllowedWidth(item.w, allowed));
  return {
    ...item,
    w: width,
    x: Math.min(Math.max(0, item.x), columns - width),
    y: Math.max(0, item.y),
    h: Math.max(definition.minHeight, item.h),
  };
}

function defaultWidth(instance: DashboardWidgetInstance, breakpoint: DashboardBreakpoint) {
  if (breakpoint === "mobile") return 1;
  const definition = getWidgetDefinition(instance.type);
  if (breakpoint === "tablet") return definition.minSize === "m" || definition.minSize === "l" || definition.defaultSize === "l" ? 6 : 3;
  return sizeColumns[definition.defaultSize];
}

export function buildDefaultLayout(instances: DashboardWidgetInstance[], breakpoint: DashboardBreakpoint): DashboardLayoutItem[] {
  const columns = BREAKPOINT_COLUMNS[breakpoint];
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  return instances.map((instance) => {
    const definition = getWidgetDefinition(instance.type);
    const width = defaultWidth(instance, breakpoint);
    if (x + width > columns) {
      y += rowHeight;
      x = 0;
      rowHeight = 0;
    }
    const item = { i: instance.id, x, y, w: width, h: definition.defaultHeight };
    x += width;
    rowHeight = Math.max(rowHeight, item.h);
    return item;
  });
}

export function resetDashboardLayouts(settings: DashboardSettings): DashboardSettings {
  return {
    ...settings,
    layouts: {
      desktop: buildDefaultLayout(settings.instances, "desktop"),
      tablet: buildDefaultLayout(settings.instances, "tablet"),
      mobile: buildDefaultLayout(settings.instances, "mobile"),
    },
  };
}

export function addDashboardWidget(settings: DashboardSettings, type: DashboardWidgetType): DashboardSettings | null {
  if (settings.instances.length >= DASHBOARD_MAX_WIDGETS) return null;
  const definition = getWidgetDefinition(type);
  if (!definition.allowMultiple && settings.instances.some((instance) => instance.type === type)) return settings;
  const instance = createWidgetInstance(type, settings.instances);
  if (!instance) return null;
  const instances = [...settings.instances, instance];
  return {
    ...settings,
    instances,
    layouts: {
      desktop: [...settings.layouts.desktop, ...buildDefaultLayout([instance], "desktop").map((item) => ({ ...item, y: bottom(settings.layouts.desktop) }))],
      tablet: [...settings.layouts.tablet, ...buildDefaultLayout([instance], "tablet").map((item) => ({ ...item, y: bottom(settings.layouts.tablet) }))],
      mobile: [...settings.layouts.mobile, ...buildDefaultLayout([instance], "mobile").map((item) => ({ ...item, y: bottom(settings.layouts.mobile) }))],
    },
  };
}

export function removeDashboardWidget(settings: DashboardSettings, instanceId: string): DashboardSettings {
  return {
    ...settings,
    instances: settings.instances.filter((instance) => instance.id !== instanceId),
    layouts: {
      desktop: settings.layouts.desktop.filter((item) => item.i !== instanceId),
      tablet: settings.layouts.tablet.filter((item) => item.i !== instanceId),
      mobile: settings.layouts.mobile.filter((item) => item.i !== instanceId),
    },
  };
}

function bottom(layout: DashboardLayoutItem[]) {
  return layout.reduce((value, item) => Math.max(value, item.y + item.h), 0);
}
