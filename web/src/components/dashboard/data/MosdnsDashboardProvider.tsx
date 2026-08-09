"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, apiData, apiList } from "@/lib/api";
import type { CacheDomainRow, CacheStats, CacheSystemData, ResolutionSettings, RunMode, ScheduledTask } from "@/lib/mosdns-system-data";
import { MosdnsDashboardDataContext, type MosdnsDataScope } from "./useMosdnsDashboardData";

type Raw = Record<string, any>;
const SWITCH = { runMode: "switch3", cache1: "switch4", ipv4: "switch8", ipv6: "switch10", cache2: "switch13" } as const;
const EMPTY_CACHE: CacheSystemData = {
  stats: { realIp: 0, fakeIp: 0, noV4: 0, noV6: 0, totalDomains: 0 },
  strategy: { expiredCache1: false, expiredCache2: false },
  scheduledTask: { enabled: false, firstRunTime: "-", intervalMinutes: 43200, refreshDays: 30 },
  taskStatus: { currentStatus: "-", lastRunTime: "-", lastRunRelative: "-", lastRunDuration: "-", records: [] },
};

function bool(value: unknown) {
  return value === true || value === 1 || value === "1" || value === "true" || value === "A";
}

function finite(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function normalizeMosdnsSwitches(...payloads: unknown[]) {
  const result: Record<string, boolean> = {};
  payloads.forEach((payload) => apiList<Raw>(payload, ["data", "switches", "items"]).forEach((item) => {
    const key = String(item.key || "");
    if (key) result[key] = bool(item.value ?? item.enable ?? item.enabled);
  }));
  return result;
}

function domainRows(value: unknown): CacheDomainRow[] {
  const rows = Array.isArray(value) ? value : apiList<any>(value, ["data", "items", "entries", "domains"]);
  return rows.flatMap((row, index) => {
    const raw = typeof row === "string" ? { domain: row } : row || {};
    const domain = String(raw.domain || raw.query_name || raw.name || raw.value || raw.pattern || "").replace(/^(domain|full|keyword):/i, "").replace(/\s+\d+$/, "").trim();
    return domain ? [{ id: String(raw.id || raw.index || index + 1).padStart(10, "0"), domain, ...(raw.date ? { date: String(raw.date) } : {}), ...(raw.source || raw.cache || raw.tag ? { source: String(raw.source || raw.cache || raw.tag) } : {}) }] : [];
  });
}

function directCacheStats(cache: Raw, detailed: Raw): CacheStats {
  const source = cache.stats || cache.domain_stats || cache.domainStats || {};
  const buckets = detailed.domains || detailed.domain_lists || detailed.domainLists || {};
  const realIp = finite(source.realIp ?? source.realip ?? source.real_ip) || domainRows(buckets.realIp || buckets.realip || buckets.real).length;
  const fakeIp = finite(source.fakeIp ?? source.fakeip ?? source.fake_ip) || domainRows(buckets.fakeIp || buckets.fakeip || buckets.fake).length;
  const noV4 = finite(source.noV4 ?? source.nov4 ?? source.no_v4) || domainRows(buckets.noV4 || buckets.nov4 || buckets.no_v4).length;
  const noV6 = finite(source.noV6 ?? source.nov6 ?? source.no_v6) || domainRows(buckets.noV6 || buckets.nov6 || buckets.no_v6).length;
  return { realIp, fakeIp, noV4, noV6, totalDomains: finite(source.totalDomains ?? source.total_domains ?? source.total ?? cache.entries ?? cache.total) || realIp + fakeIp + noV4 + noV6 };
}

export function normalizeMosdnsControl(featurePayload: unknown, switchPayload: unknown, cachePayload: unknown, routingPayload: unknown, detailedPayload: unknown) {
  const switches = normalizeMosdnsSwitches(featurePayload, switchPayload);
  const cache = apiData<Raw>(cachePayload, cachePayload as Raw) || {};
  const routing = apiData<Raw>(routingPayload, routingPayload as Raw) || {};
  const detailed = apiData<Raw>(detailedPayload, detailedPayload as Raw) || {};
  const scheduler = routing.scheduler || {};
  const records = apiList<any>(routing.records || routing.history || routing.logs, ["records", "history", "logs", "items"]).slice(-8).map((row) => typeof row === "string" ? row : [row.time || row.created_at, row.action || row.message || row.status].filter(Boolean).join(" "));
  const buckets = detailed.domains || detailed.domain_lists || detailed.domainLists || {};
  const entries = apiList<Raw>(detailed.entries || detailed.items, ["entries", "items"]);
  const fake = entries.filter((item) => String(item.domain_set || item.rule || "").toLowerCase().includes("fake"));
  const real = entries.filter((item) => !fake.includes(item));
  return {
    runMode: (switches[SWITCH.runMode] === false ? "safe" : "compatible") as RunMode,
    resolutionSettings: { ipv4First: switches[SWITCH.ipv4] === true, ipv6First: switches[SWITCH.ipv6] === true } satisfies ResolutionSettings,
    cacheData: {
      stats: directCacheStats(cache, detailed),
      strategy: { expiredCache1: switches[SWITCH.cache1] === true, expiredCache2: switches[SWITCH.cache2] === true },
      scheduledTask: { enabled: bool(scheduler.enabled), firstRunTime: String(scheduler.start_datetime || "-").replace("T", " "), intervalMinutes: finite(scheduler.interval_minutes) || finite(scheduler.interval) / 60 || 43200, refreshDays: finite(scheduler.date_range_days ?? scheduler.execution_settings?.date_range_days ?? routing.execution_settings?.date_range_days) || 30 },
      taskStatus: { currentStatus: routing.running ? "运行中" : String(routing.status || "空闲"), lastRunTime: String(routing.last_run_at || "-"), lastRunRelative: routing.progress !== undefined ? `进度 ${routing.progress}%` : "-", lastRunDuration: "-", records },
    } satisfies CacheSystemData,
    cacheDomains: {
      realIp: domainRows(buckets.realIp || buckets.realip || buckets.real || real),
      fakeIp: domainRows(buckets.fakeIp || buckets.fakeip || buckets.fake || fake),
      noV4: domainRows(buckets.noV4 || buckets.nov4 || buckets.no_v4),
      noV6: domainRows(buckets.noV6 || buckets.nov6 || buckets.no_v6),
    },
  };
}

export function MosdnsDashboardProvider({ children }: { children: ReactNode }) {
  const [counts, setCounts] = useState<Record<MosdnsDataScope, number>>({ overview: 0, query: 0, control: 0 });
  const [overview, setOverview] = useState<Raw>({});
  const [queryEntries, setQueryEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [runMode, setRunMode] = useState<RunMode>("compatible");
  const [resolutionSettings, setResolutionSettings] = useState<ResolutionSettings>({ ipv4First: false, ipv6First: false });
  const [prioritySaving, setPrioritySaving] = useState(false);
  const [cacheData, setCacheData] = useState<CacheSystemData>(EMPTY_CACHE);
  const [cacheDomains, setCacheDomains] = useState<Partial<Record<"realIp" | "fakeIp" | "noV4" | "noV6", CacheDomainRow[]>>>({});
  const [actionSaving, setActionSaving] = useState(false);
  const mounted = useRef(true);
  const request = useRef({ overview: false, query: false, control: false });

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const fail = (reason: unknown, fallback: string) => setError(reason instanceof Error ? reason.message : fallback);
  const refreshOverview = useCallback(async () => {
    if (request.current.overview) return;
    request.current.overview = true;
    try { const payload = await api("/api/v1/mosdns/overview"); if (mounted.current) { setOverview(apiData<Raw>(payload, {})); setError(""); } } catch (reason) { if (mounted.current) fail(reason, "MosDNS 概览加载失败"); } finally { request.current.overview = false; }
  }, []);
  const refreshQuery = useCallback(async () => {
    if (request.current.query) return;
    request.current.query = true;
    try { const payload = await api("/api/v1/mosdns/query-log?limit=250"); if (mounted.current) setQueryEntries(apiList(apiData(payload, payload), ["logs", "items", "data"])); } catch (reason) { if (mounted.current) fail(reason, "MosDNS 查询日志加载失败"); } finally { request.current.query = false; }
  }, []);
  const refreshControl = useCallback(async () => {
    if (request.current.control) return;
    request.current.control = true;
    setLoading(true);
    try {
      const payloads = await Promise.all([api("/api/v1/mosdns/system/feature-switches"), api("/api/v1/mosdns/system/switches"), api("/api/v1/mosdns/system/cache"), api("/api/v1/mosdns/system/routing"), api("/api/v1/mosdns/cache/detailed")]);
      const next = normalizeMosdnsControl(...payloads);
      if (mounted.current) { setRunMode(next.runMode); setResolutionSettings(next.resolutionSettings); setCacheData(next.cacheData); setCacheDomains(next.cacheDomains); setError(""); }
    } catch (reason) { if (mounted.current) fail(reason, "MosDNS 控制数据加载失败"); } finally { request.current.control = false; if (mounted.current) setLoading(false); }
  }, []);

  useEffect(() => { if (!counts.overview) return; void refreshOverview(); const timer = window.setInterval(() => void refreshOverview(), 5000); return () => window.clearInterval(timer); }, [counts.overview, refreshOverview]);
  useEffect(() => { if (!counts.query) return; void refreshQuery(); const timer = window.setInterval(() => void refreshQuery(), 1000); return () => window.clearInterval(timer); }, [counts.query, refreshQuery]);
  useEffect(() => { if (!counts.control) return; void refreshControl(); }, [counts.control, refreshControl]);
  const registerScope = useCallback((scope: MosdnsDataScope, delta: 1 | -1) => setCounts((current) => ({ ...current, [scope]: Math.max(0, current[scope] + delta) })), []);
  const postSwitch = (key: string, value: boolean) => api("/api/v1/mosdns/system/switches", { method: "POST", body: JSON.stringify({ key, value, enable: value }) });
  const changeRunMode = useCallback(async (next: RunMode) => { if (actionSaving) return; const previous = runMode; setRunMode(next); setActionSaving(true); try { await postSwitch(SWITCH.runMode, next === "compatible"); setMessage("运行模式已保存"); } catch (reason) { setRunMode(previous); fail(reason, "运行模式保存失败"); } finally { setActionSaving(false); } }, [actionSaving, runMode]);
  const changePriority = useCallback(async (priority: "auto" | "ipv4" | "ipv6") => { if (prioritySaving) return; const previous = resolutionSettings; setResolutionSettings({ ipv4First: priority === "ipv4", ipv6First: priority === "ipv6" }); setPrioritySaving(true); try { await api("/api/v1/mosdns/system/priority", { method: "PUT", body: JSON.stringify({ priority }) }); setMessage("解析策略已保存"); } catch (reason) { setResolutionSettings(previous); fail(reason, "解析策略保存失败"); } finally { setPrioritySaving(false); } }, [prioritySaving, resolutionSettings]);
  const toggleCacheStrategy = useCallback(async (key: "expiredCache1" | "expiredCache2") => { const previous = cacheData.strategy[key]; const next = !previous; setCacheData((data) => ({ ...data, strategy: { ...data.strategy, [key]: next } })); try { await postSwitch(key === "expiredCache1" ? SWITCH.cache1 : SWITCH.cache2, next); setMessage("缓存策略已保存"); } catch (reason) { setCacheData((data) => ({ ...data, strategy: { ...data.strategy, [key]: previous } })); fail(reason, "缓存策略保存失败"); } }, [cacheData.strategy]);
  const changeScheduledTask = useCallback((task: ScheduledTask) => setCacheData((data) => ({ ...data, scheduledTask: task })), []);
  const saveScheduledTask = useCallback(async () => { const task = cacheData.scheduledTask; setActionSaving(true); try { await api("/api/v1/mosdns/system/routing/scheduler", { method: "POST", body: JSON.stringify({ enabled: task.enabled, start_datetime: task.firstRunTime === "-" ? "" : task.firstRunTime, interval_minutes: task.intervalMinutes, interval: task.intervalMinutes * 60, date_range_days: task.refreshDays, execution_settings: { date_range_days: task.refreshDays } }) }); setMessage("定时任务已保存"); await refreshControl(); } catch (reason) { fail(reason, "定时任务保存失败"); } finally { setActionSaving(false); } }, [cacheData.scheduledTask, refreshControl]);
  const runCacheAction = useCallback(async (action: "start" | "save" | "clear") => { setActionSaving(true); try { await api(`/api/v1/mosdns/system/routing/${action}`, { method: "POST" }); setMessage(action === "start" ? "缓存已热更新" : action === "save" ? "缓存规则已保存" : "缓存备份已清空"); await refreshControl(); } catch (reason) { fail(reason, "缓存操作失败"); } finally { setActionSaving(false); } }, [refreshControl]);

  const value = useMemo(() => ({ overview, queryEntries, loading, error, message, runMode, resolutionSettings, prioritySaving, cacheData, cacheDomains, actionSaving, refreshOverview, refreshControl, changeRunMode, changePriority, toggleCacheStrategy, changeScheduledTask, saveScheduledTask, runCacheAction, registerScope }), [overview, queryEntries, loading, error, message, runMode, resolutionSettings, prioritySaving, cacheData, cacheDomains, actionSaving, refreshOverview, refreshControl, changeRunMode, changePriority, toggleCacheStrategy, changeScheduledTask, saveScheduledTask, runCacheAction, registerScope]);
  return <MosdnsDashboardDataContext.Provider value={value}>{children}</MosdnsDashboardDataContext.Provider>;
}
