import { describe, expect, it } from "vitest";
import { activeProxyTestingKeys, activeProxyTestJob, dashboardProxyGroupView, resolveDashboardProxyGroup } from "@/components/dashboard/widgets/mihomo/MihomoProxyGroupWidget";
import { proxyGroupManagementActionsVisible } from "@/components/mihomo/proxies/ProxyGroupCard";
import { createEmptyProxyStore, patchProxySelection } from "./proxyStore";
import type { ProxyEntity, ProxyKey, ProxyStore } from "./types";
import type { ProxyRuntimeTestJob } from "./useProxyRuntime";

const groupKey = "global:GLOBAL" as ProxyKey;
const firstKey = "global:Node A" as ProxyKey;
const secondKey = "global:Node B" as ProxyKey;

function entity(key: ProxyKey, kind: "group" | "node", members: ProxyKey[] = []): ProxyEntity {
  return { key, name: key.slice(key.indexOf(":") + 1), type: kind === "group" ? "Selector" : "Trojan", kind, memberKeys: members, history: [], alive: true, udp: true, xudp: false, hidden: false };
}

function store(): ProxyStore {
  return {
    ...createEmptyProxyStore(),
    groupKeys: [groupKey],
    entities: {
      [groupKey]: { ...entity(groupKey, "group", [firstKey, secondKey]), selectedKey: firstKey },
      [firstKey]: entity(firstKey, "node"),
      [secondKey]: entity(secondKey, "node"),
    },
  };
}

describe("dashboard proxy runtime view model", () => {
  it("resolves only a currently existing group", () => {
    expect(resolveDashboardProxyGroup(store(), groupKey)?.name).toBe("GLOBAL");
    expect(resolveDashboardProxyGroup(store(), "global:deleted")).toBeUndefined();
    expect(resolveDashboardProxyGroup(store(), firstKey)).toBeUndefined();
  });

  it("keeps optimistic selection immutable so failure can restore the exact snapshot", () => {
    const before = store();
    const optimistic = patchProxySelection(before, groupKey, secondKey);
    expect(optimistic.entities[groupKey].selectedKey).toBe(secondKey);
    expect(before.entities[groupKey].selectedKey).toBe(firstKey);
  });

  it("attributes shared testing progress to group and node widgets", () => {
    const groupJob: ProxyRuntimeTestJob = { id: "g", scope: "group", scopeKey: groupKey, status: "running", completed: 2, total: 4, succeeded: 2, failed: 0 };
    const nodeJob: ProxyRuntimeTestJob = { id: "n", scope: "node", scopeKey: firstKey, status: "running", completed: 0, total: 1, succeeded: 0, failed: 0, displayKeys: [firstKey] };
    expect(activeProxyTestJob({ g: groupJob }, groupKey)?.completed).toBe(2);
    expect(activeProxyTestJob({ n: nodeJob }, firstKey)?.id).toBe("n");
    expect(activeProxyTestJob({ g: { ...groupJob, status: "done" } }, groupKey)).toBeUndefined();
    expect(activeProxyTestingKeys({ g: groupJob, n: nodeJob })).toEqual(new Set([groupKey, firstKey]));
  });

  it("adapts runtime state to the same card model as the proxy page", () => {
    const current = store();
    current.entities[firstKey] = { ...current.entities[firstKey], delay: 28, icon: "/node-a.svg", providerName: "Airport A" };
    const view = dashboardProxyGroupView(current, current.entities[groupKey], { pendingSelection: secondKey, trafficSpeed: 2048 });

    expect(view).toMatchObject({
      key: groupKey,
      selectedKey: secondKey,
      selectedName: "Node B",
      trafficSpeed: 2048,
      readOnly: true,
    });
    expect(view.nodes).toEqual([
      expect.objectContaining({ key: firstKey, delay: 28, icon: "/node-a.svg", providerName: "Airport A" }),
      expect.objectContaining({ key: secondKey, name: "Node B" }),
    ]);
  });

  it("suppresses the proxy page's three management actions in embedded dashboard cards", () => {
    expect(proxyGroupManagementActionsVisible(false)).toBe(true);
    expect(proxyGroupManagementActionsVisible(true)).toBe(false);
  });
});
