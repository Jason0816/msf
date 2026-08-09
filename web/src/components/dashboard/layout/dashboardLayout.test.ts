import { describe, expect, it } from "vitest";
import { createDefaultDashboardSettings } from "@/lib/dashboard-settings";
import { addDashboardWidget, buildDefaultLayout, closestAllowedWidth, removeDashboardWidget, snapDashboardItem } from "./dashboardLayout";

describe("dashboard layout", () => {
  it("snaps desktop widths to the four registered sizes", () => {
    expect(closestAllowedWidth(5, [3, 4, 6, 12])).toBe(4);
    const cache = { id: "cache", type: "mosdns-cache-stats" as const };
    expect(snapDashboardItem({ i: "cache", x: 11, y: -2, w: 3, h: 1 }, cache, "desktop")).toEqual({ i: "cache", x: 9, y: 0, w: 3, h: 4 });
  });

  it("never grants XS to widgets whose registry minimum is S", () => {
    const info = { id: "info", type: "system-info" as const };
    expect(snapDashboardItem({ i: "info", x: 0, y: 0, w: 3, h: 5 }, info, "desktop").w).toBe(4);
  });

  it("uses one column on mobile and adds/removes instances atomically", () => {
    const settings = createDefaultDashboardSettings();
    const added = addDashboardWidget(settings, "mihomo-proxy-group");
    expect(added?.instances).toHaveLength(settings.instances.length + 1);
    expect(added?.layouts.mobile.at(-1)?.w).toBe(1);
    const id = added!.instances.at(-1)!.id;
    expect(removeDashboardWidget(added!, id).layouts.desktop.some((item) => item.i === id)).toBe(false);
    expect(buildDefaultLayout(settings.instances, "mobile").every((item) => item.x === 0 && item.w === 1)).toBe(true);
  });

  it("counts every multi-instance widget toward the fifteen item cap", () => {
    let settings = createDefaultDashboardSettings();
    while (settings.instances.length < 15) settings = addDashboardWidget(settings, "mihomo-proxy-group")!;
    expect(settings.instances).toHaveLength(15);
    expect(addDashboardWidget(settings, "mihomo-proxy-group")).toBeNull();
  });
});
