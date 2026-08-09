"use client";

export const DASHBOARD_SETTINGS_VERSION = 2 as const;
export const DASHBOARD_MAX_WIDGETS = 15;
export const DASHBOARD_SETTINGS_EVENT = "msf:dashboard-settings";
export const DASHBOARD_SETTINGS_STORAGE_KEY = "msf.dashboard.settings.v2";
export const LEGACY_DASHBOARD_SETTINGS_STORAGE_KEY = "msf.dashboard.settings.v1";
export const DASHBOARD_CORRUPT_BACKUP_PREFIX = "msf.dashboard.settings.corrupt";
export const DASHBOARD_LAYOUT_COMMAND_EVENT = "msf:dashboard-layout-command";
export const DASHBOARD_LAYOUT_STATE_EVENT = "msf:dashboard-layout-state";
export type DashboardLayoutCommand = "edit" | "done" | "undo" | "reset";

export type DashboardWidgetCategory = "system" | "mosdns" | "mihomo";

export type DashboardWidgetType =
  | "system-info"
  | "system-resources"
  | "system-rate"
  | "singbox-service"
  | "mosdns-service"
  | "mosdns-query"
  | "mosdns-info"
  | "mosdns-cache-stats"
  | "mosdns-runtime"
  | "mosdns-resolution-policy"
  | "mosdns-cache-system"
  | "mihomo-service"
  | "mihomo-traffic"
  | "mihomo-latency"
  | "mihomo-globe"
  | "mihomo-topology"
  | "mihomo-provider-traffic"
  | "mihomo-connection-stats"
  | "mihomo-rule-hits"
  | "mihomo-proxy-group";

export interface DashboardWidgetInstance {
  id: string;
  type: DashboardWidgetType;
  settings?: Record<string, unknown>;
}

export interface DashboardLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type DashboardBreakpoint = "desktop" | "tablet" | "mobile";
export type DashboardLayouts = Record<DashboardBreakpoint, DashboardLayoutItem[]>;

export interface DashboardSettings {
  version: typeof DASHBOARD_SETTINGS_VERSION;
  compact: boolean;
  instances: DashboardWidgetInstance[];
  layouts: DashboardLayouts;
}

interface LegacyDashboardSettings {
  compact?: unknown;
  visible?: Record<string, unknown>;
}

export interface DashboardStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

const KNOWN_WIDGET_TYPES: ReadonlySet<string> = new Set<DashboardWidgetType>([
  "system-info", "system-resources", "system-rate", "singbox-service",
  "mosdns-service", "mosdns-query", "mosdns-info", "mosdns-cache-stats",
  "mosdns-runtime", "mosdns-resolution-policy", "mosdns-cache-system",
  "mihomo-service", "mihomo-traffic", "mihomo-latency", "mihomo-globe",
  "mihomo-topology", "mihomo-provider-traffic", "mihomo-connection-stats",
  "mihomo-rule-hits", "mihomo-proxy-group",
]);

const DEFAULT_INSTANCES: DashboardWidgetInstance[] = [
  { id: "system-info", type: "system-info", settings: { tab: "device" } },
  { id: "system-resources", type: "system-resources" },
  { id: "system-rate", type: "system-rate" },
  { id: "mosdns-service", type: "mosdns-service" },
  { id: "singbox-service", type: "singbox-service" },
  { id: "mihomo-service", type: "mihomo-service" },
];

function createDefaultLayouts(): DashboardLayouts {
  return {
    desktop: [
      { i: "system-info", x: 0, y: 0, w: 6, h: 5 },
      { i: "system-resources", x: 6, y: 0, w: 6, h: 5 },
      { i: "system-rate", x: 0, y: 5, w: 6, h: 6 },
      { i: "mosdns-service", x: 6, y: 5, w: 4, h: 5 },
      { i: "singbox-service", x: 0, y: 11, w: 4, h: 5 },
      { i: "mihomo-service", x: 4, y: 11, w: 4, h: 5 },
    ],
    tablet: DEFAULT_INSTANCES.map((item, index) => ({ i: item.id, x: (index % 2) * 3, y: Math.floor(index / 2) * 5, w: 3, h: 5 })),
    mobile: DEFAULT_INSTANCES.map((item, index) => ({ i: item.id, x: 0, y: index * 5, w: 1, h: 5 })),
  };
}

export function createDefaultDashboardSettings(): DashboardSettings {
  return {
    version: DASHBOARD_SETTINGS_VERSION,
    compact: false,
    instances: DEFAULT_INSTANCES.map((instance) => ({ ...instance, settings: instance.settings ? { ...instance.settings } : undefined })),
    layouts: createDefaultLayouts(),
  };
}

export const defaultDashboardSettings = createDefaultDashboardSettings();

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function finiteInteger(value: unknown, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : fallback;
}

function sanitizeInstance(value: unknown): DashboardWidgetInstance | null {
  if (!isRecord(value) || typeof value.id !== "string" || !value.id.trim()) return null;
  if (typeof value.type !== "string" || !KNOWN_WIDGET_TYPES.has(value.type)) return null;
  return {
    id: value.id.slice(0, 128),
    type: value.type as DashboardWidgetType,
    ...(isRecord(value.settings) ? { settings: value.settings } : {}),
  };
}

function sanitizeLayout(value: unknown, instanceIds: Set<string>, columns: number): DashboardLayoutItem[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: DashboardLayoutItem[] = [];
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.i !== "string" || !instanceIds.has(entry.i) || seen.has(entry.i)) continue;
    const width = Math.max(1, Math.min(columns, finiteInteger(entry.w, columns)));
    result.push({
      i: entry.i,
      x: Math.min(Math.max(0, finiteInteger(entry.x, 0)), columns - width),
      y: finiteInteger(entry.y, 0),
      w: width,
      h: Math.max(2, finiteInteger(entry.h, 5)),
    });
    seen.add(entry.i);
  }
  return result;
}

function fillMissingLayout(items: DashboardLayoutItem[], instances: DashboardWidgetInstance[], columns: number) {
  const result = [...items];
  const present = new Set(result.map((item) => item.i));
  let y = result.reduce((max, item) => Math.max(max, item.y + item.h), 0);
  for (const instance of instances) {
    if (present.has(instance.id)) continue;
    result.push({ i: instance.id, x: 0, y, w: columns, h: 5 });
    y += 5;
  }
  return result;
}

export function normalizeDashboardSettings(value: unknown): DashboardSettings | null {
  if (!isRecord(value) || value.version !== DASHBOARD_SETTINGS_VERSION || !Array.isArray(value.instances)) return null;
  const instances: DashboardWidgetInstance[] = [];
  const ids = new Set<string>();
  for (const candidate of value.instances) {
    const instance = sanitizeInstance(candidate);
    if (!instance || ids.has(instance.id) || instances.length >= DASHBOARD_MAX_WIDGETS) continue;
    instances.push(instance);
    ids.add(instance.id);
  }
  if (!isRecord(value.layouts)) return null;
  return {
    version: DASHBOARD_SETTINGS_VERSION,
    compact: Boolean(value.compact),
    instances,
    layouts: {
      desktop: fillMissingLayout(sanitizeLayout(value.layouts.desktop, ids, 12), instances, 12),
      tablet: fillMissingLayout(sanitizeLayout(value.layouts.tablet, ids, 6), instances, 6),
      mobile: fillMissingLayout(sanitizeLayout(value.layouts.mobile, ids, 1), instances, 1),
    },
  };
}

export function migrateLegacyDashboardSettings(value: unknown): DashboardSettings | null {
  if (!isRecord(value)) return null;
  const legacy = value as LegacyDashboardSettings;
  const visible = isRecord(legacy.visible) ? legacy.visible : {};
  const instances: DashboardWidgetInstance[] = [];
  const add = (id: string, type: DashboardWidgetType, settings?: Record<string, unknown>) => instances.push({ id, type, ...(settings ? { settings } : {}) });
  const legacyInfoVisible = ["device", "hardware", "stats"].some((key) => visible[key] !== false);
  if (legacyInfoVisible) {
    const tab = visible.device !== false ? "device" : visible.hardware !== false ? "hardware" : "stats";
    add("system-info", "system-info", { tab });
  }
  if (visible.resources !== false) add("system-resources", "system-resources");
  if (visible.rate !== false) add("system-rate", "system-rate");
  if (visible.mosdns !== false) add("mosdns-service", "mosdns-service");
  if (visible.singbox !== false) add("singbox-service", "singbox-service");
  if (visible.mihomo !== false) add("mihomo-service", "mihomo-service");
  const defaults = createDefaultDashboardSettings();
  const ids = new Set(instances.map((instance) => instance.id));
  return {
    ...defaults,
    compact: Boolean(legacy.compact),
    instances,
    layouts: {
      desktop: defaults.layouts.desktop.filter((item) => ids.has(item.i)),
      tablet: defaults.layouts.tablet.filter((item) => ids.has(item.i)),
      mobile: defaults.layouts.mobile.filter((item) => ids.has(item.i)),
    },
  };
}

function backupCorruptValue(storage: DashboardStorage, key: string, raw: string) {
  try {
    storage.setItem(`${DASHBOARD_CORRUPT_BACKUP_PREFIX}.${Date.now()}.${key.endsWith("v1") ? "v1" : "v2"}`, raw);
  } catch {
    // A full or restricted storage must not prevent the dashboard from opening.
  }
}

export function loadDashboardSettingsFromStorage(storage: DashboardStorage): DashboardSettings {
  const v2Raw = storage.getItem(DASHBOARD_SETTINGS_STORAGE_KEY);
  if (v2Raw !== null) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(v2Raw);
    } catch {
      backupCorruptValue(storage, DASHBOARD_SETTINGS_STORAGE_KEY, v2Raw);
      parsed = null;
    }
    const normalized = normalizeDashboardSettings(parsed);
    if (normalized) return normalized;
    if (parsed !== null) backupCorruptValue(storage, DASHBOARD_SETTINGS_STORAGE_KEY, v2Raw);
  }
  const legacyRaw = storage.getItem(LEGACY_DASHBOARD_SETTINGS_STORAGE_KEY);
  if (legacyRaw !== null) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(legacyRaw);
    } catch {
      backupCorruptValue(storage, LEGACY_DASHBOARD_SETTINGS_STORAGE_KEY, legacyRaw);
      parsed = null;
    }
    const migrated = migrateLegacyDashboardSettings(parsed);
    if (migrated) {
      storage.setItem(DASHBOARD_SETTINGS_STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
    if (parsed !== null) backupCorruptValue(storage, LEGACY_DASHBOARD_SETTINGS_STORAGE_KEY, legacyRaw);
  }
  return createDefaultDashboardSettings();
}

export function loadDashboardSettings(): DashboardSettings {
  if (typeof window === "undefined") return createDefaultDashboardSettings();
  return loadDashboardSettingsFromStorage(window.localStorage);
}

export function saveDashboardSettings(settings: DashboardSettings) {
  if (typeof window === "undefined") return;
  const normalized = normalizeDashboardSettings(settings) ?? createDefaultDashboardSettings();
  window.localStorage.setItem(DASHBOARD_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent(DASHBOARD_SETTINGS_EVENT, { detail: normalized }));
}

export function createWidgetInstance(type: DashboardWidgetType, existing: DashboardWidgetInstance[]): DashboardWidgetInstance | null {
  if (existing.length >= DASHBOARD_MAX_WIDGETS) return null;
  const used = new Set(existing.map((instance) => instance.id));
  let suffix = 1;
  let id: string = type;
  while (used.has(id)) id = `${type}-${++suffix}`;
  return { id, type };
}
