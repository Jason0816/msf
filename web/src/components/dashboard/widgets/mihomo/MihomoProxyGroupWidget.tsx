"use client";

import { useMemo, useState } from "react";
import { Gauge, Loader2, RefreshCw, Waypoints } from "lucide-react";
import { cn } from "@/lib/utils";
import { SolidPlate } from "@/components/liquid-glass/SolidPlate";
import { groupDelay, selectGroups, selectGroupNodes } from "@/features/mihomo-proxies/selectors";
import type { ProxyEntity, ProxyKey, ProxyStore } from "@/features/mihomo-proxies/types";
import type { ProxyRuntimeTestJob } from "@/features/mihomo-proxies/useProxyRuntime";
import { useDashboardProxyRuntime } from "../../data/useDashboardProxyRuntime";

export type MihomoProxyGroupWidgetProps = {
  groupKey?: string;
  onGroupKeyChange?: (groupKey: string) => void;
  size?: "s" | "m" | "l";
};

export function resolveDashboardProxyGroup(store: ProxyStore, groupKey?: string): ProxyEntity | undefined {
  if (!groupKey) return undefined;
  const entity = store.entities[groupKey as ProxyKey];
  return entity?.kind === "group" ? entity : undefined;
}

export function activeProxyTestJob(jobs: Record<string, ProxyRuntimeTestJob>, key: string | undefined) {
  if (!key) return undefined;
  return Object.values(jobs).find((job) =>
    (job.status === "queued" || job.status === "running") &&
    (job.scopeKey === key || job.physicalKeys?.includes(key as ProxyKey) || job.displayKeys?.includes(key as ProxyKey)),
  );
}

function delayTone(delay: number) {
  if (delay <= 0) return "text-muted-foreground";
  if (delay < 400) return "text-emerald-600 dark:text-emerald-300";
  if (delay < 800) return "text-amber-600 dark:text-amber-300";
  return "text-rose-600 dark:text-rose-300";
}

export function MihomoProxyGroupWidget({ groupKey, onGroupKeyChange, size = "m" }: MihomoProxyGroupWidgetProps) {
  const runtime = useDashboardProxyRuntime();
  const { store, loading, refreshing, testingJobs, pendingSelections } = runtime;
  const [internalKey, setInternalKey] = useState("");
  const [message, setMessage] = useState("");
  const selectedKey = groupKey ?? internalKey;
  const groups = useMemo(() => selectGroups(store), [store]);
  const group = resolveDashboardProxyGroup(store, selectedKey);
  const missing = Boolean(selectedKey && !group && !loading);
  const choose = (value: string) => {
    if (groupKey === undefined) setInternalKey(value);
    onGroupKeyChange?.(value);
    setMessage("");
  };

  if (!selectedKey || !group) {
    return <div className="flex h-full min-h-36 flex-col items-center justify-center gap-3 text-center">
      <SolidPlate tone="subtle" className="flex h-11 w-11 items-center justify-center rounded-full"><Waypoints className="h-5 w-5 text-muted-foreground" /></SolidPlate>
      <div><p className="text-sm font-medium">{missing ? "原策略组已删除或改名" : "选择要控制的策略组"}</p><p className="mt-1 text-xs text-muted-foreground">{missing ? "请重新选择，组件不会自动绑定到其他组" : "多个组件可以选择相同或不同策略组"}</p></div>
      <select aria-label="选择策略组" value={missing ? "" : selectedKey} onChange={(event) => choose(event.target.value)} disabled={loading || !groups.length} className="gary-field h-9 w-full max-w-64 rounded-xl px-3 text-xs"><option value="">{loading ? "正在加载…" : groups.length ? "请选择策略组" : "暂无可用策略组"}</option>{groups.map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}</select>
    </div>;
  }

  const members = selectGroupNodes(store, group.key, true);
  const selected = group.selectedKey ? store.entities[group.selectedKey] : undefined;
  const chain = runtime.resolveChain(group.key);
  const finalNode = chain.finalKey ? store.entities[chain.finalKey] : selected;
  const testTarget = finalNode ?? selected;
  const delay = finalNode?.delay ?? selected?.delay ?? groupDelay(store, group);
  const selectionPending = pendingSelections[group.key];
  const groupJob = activeProxyTestJob(testingJobs, group.key);
  const nodeJob = activeProxyTestJob(testingJobs, testTarget?.key);
  const testing = groupJob ?? nodeJob;
  const progress = testing ? `${testing.completed}/${testing.total}` : "";
  const busy = Boolean(selectionPending || groupJob || nodeJob);

  const select = async (targetKey: string) => {
    if (!targetKey || targetKey === group.selectedKey || busy) return;
    setMessage("");
    try {
      await runtime.selectProxy(group.key, targetKey as ProxyKey);
      setMessage(`已切换到 ${store.entities[targetKey as ProxyKey]?.name || targetKey}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "切换失败，已恢复原节点"); }
  };
  const testCurrent = async () => {
    if (!testTarget || nodeJob || groupJob) return;
    setMessage("");
    try { const job = await runtime.testNode(testTarget.key, { groupKey: group.key }); setMessage(job.failed ? "当前节点测速失败" : "当前节点测速完成"); }
    catch (error) { setMessage(error instanceof Error ? error.message : "测速失败"); }
  };
  const testGroup = async () => {
    if (groupJob || selectionPending) return;
    setMessage("");
    try { const job = await runtime.testGroup(group.key); setMessage(`整组测速完成：成功 ${job.succeeded}，失败 ${job.failed}`); }
    catch (error) { setMessage(error instanceof Error ? error.message : "整组测速失败"); }
  };

  return <div className="@container flex h-full min-h-0 flex-col gap-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><div className="min-w-0"><div className="flex items-center gap-2"><h3 className="truncate text-sm font-semibold" title={group.name}>{group.name}</h3><span className="rounded-full bg-background/35 px-2 py-0.5 text-[10px] text-muted-foreground">{group.type || "Selector"}</span></div><p className="mt-1 text-[10px] text-muted-foreground">{members.length} 个可选节点</p></div><select aria-label="更换策略组" value={group.key} onChange={(event) => choose(event.target.value)} className="gary-field h-8 max-w-44 rounded-lg px-2 text-[10px]">{groups.map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}</select></div>
    <SolidPlate tone="regular" className="flex items-center justify-between gap-3 p-3"><div className="min-w-0"><div className="text-[10px] text-muted-foreground">当前节点</div><div className="mt-1 truncate text-sm font-medium" title={selected?.name}>{selectionPending ? store.entities[selectionPending]?.name : selected?.name || "未选择"}</div></div><div className={cn("shrink-0 text-sm font-semibold tabular-nums", delayTone(Number(delay) || 0))}>{nodeJob ? <Loader2 className="h-4 w-4 animate-spin" /> : delay ? `${delay} ms` : "--"}</div></SolidPlate>
    <select aria-label="切换当前节点" value={selectionPending ?? group.selectedKey ?? ""} onChange={(event) => void select(event.target.value)} disabled={busy} className="gary-field h-10 w-full rounded-xl px-3 text-xs disabled:opacity-60"><option value="">请选择节点</option>{members.map((node) => <option key={node.key} value={node.key}>{node.name} · {node.delay ? `${node.delay}ms` : "未测速"}</option>)}</select>
    {size === "l" ? <div className="grid min-h-0 flex-1 grid-cols-2 gap-1.5 overflow-y-auto pr-1 @min-[760px]:grid-cols-3">{members.map((node) => <button key={node.key} type="button" disabled={busy} onClick={() => void select(node.key)} className={cn("gary-solid-plate gary-solid-plate--regular min-w-0 rounded-lg px-2.5 py-2 text-left text-[11px]", node.key === (selectionPending ?? group.selectedKey) && "ring-1 ring-primary/45")}><span className="block truncate">{node.name}</span><span className={cn("mt-0.5 block tabular-nums", delayTone(node.delay ?? 0))}>{node.delay ? `${node.delay} ms` : "--"}</span></button>)}</div> : null}
    <div className="mt-auto grid grid-cols-2 gap-2"><button type="button" disabled={!testTarget || Boolean(nodeJob || groupJob)} onClick={() => void testCurrent()} className="gary-glass-button gap-1.5 rounded-xl px-3 py-2 text-xs disabled:opacity-50"><Gauge className="h-3.5 w-3.5" />{nodeJob ? `当前测速 ${progress}` : "测试当前"}</button><button type="button" disabled={busy} onClick={() => void testGroup()} className="gary-glass-button gap-1.5 rounded-xl px-3 py-2 text-xs disabled:opacity-50">{groupJob ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}{groupJob ? `整组 ${progress}` : "测试整组"}</button></div>
    {message || runtime.error ? <p aria-live="polite" className="truncate text-[10px] text-muted-foreground" title={message || runtime.error}>{message || runtime.error}</p> : refreshing ? <p className="text-[10px] text-muted-foreground">正在同步代理状态…</p> : null}
  </div>;
}
