import { describe, expect, it } from "vitest";
import {
  DASHBOARD_CORRUPT_BACKUP_PREFIX,
  DASHBOARD_MAX_WIDGETS,
  DASHBOARD_SETTINGS_STORAGE_KEY,
  LEGACY_DASHBOARD_SETTINGS_STORAGE_KEY,
  loadDashboardSettingsFromStorage,
  normalizeDashboardSettings,
} from "./dashboard-settings";

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe("dashboard settings v2", () => {
  it("migrates V1 and consolidates the three legacy info cards", () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_DASHBOARD_SETTINGS_STORAGE_KEY, JSON.stringify({ compact: true, visible: { device: false, hardware: true, stats: true, rate: false } }));
    const result = loadDashboardSettingsFromStorage(storage);
    expect(result.version).toBe(2);
    expect(result.compact).toBe(true);
    expect(result.instances.filter((item) => item.type === "system-info")).toHaveLength(1);
    expect(result.instances.find((item) => item.type === "system-info")?.settings?.tab).toBe("hardware");
    expect(result.instances.some((item) => item.type === "system-rate")).toBe(false);
    expect(storage.getItem(DASHBOARD_SETTINGS_STORAGE_KEY)).not.toBeNull();
  });

  it("backs up malformed JSON and returns defaults", () => {
    const storage = new MemoryStorage();
    storage.setItem(DASHBOARD_SETTINGS_STORAGE_KEY, "{broken");
    const result = loadDashboardSettingsFromStorage(storage);
    expect(result.instances.length).toBeGreaterThan(0);
    expect([...storage.values.keys()].some((key) => key.startsWith(DASHBOARD_CORRUPT_BACKUP_PREFIX))).toBe(true);
  });

  it("deduplicates, clamps layout bounds and enforces fifteen instances", () => {
    const instances = Array.from({ length: 18 }, (_, index) => ({ id: `proxy-${index}`, type: "mihomo-proxy-group" }));
    const result = normalizeDashboardSettings({ version: 2, compact: false, instances, layouts: { desktop: [{ i: "proxy-0", x: 20, y: -1, w: 30, h: 1 }], tablet: [], mobile: [] } });
    expect(result?.instances).toHaveLength(DASHBOARD_MAX_WIDGETS);
    expect(result?.layouts.desktop[0]).toMatchObject({ x: 0, y: 0, w: 12, h: 2 });
  });
});
