"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Cable, RefreshCw, Pause, Play, SlidersHorizontal, Search, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useToaster, ToastStack } from "@/components/Toaster";
import { cn } from "@/lib/utils";
import { api, apiData, apiList, formatBytes } from "@/lib/api";

interface Conn {
  id: string;
  host: string;
  proto: "TCP" | "UDP" | string;
  src: string;
  dst: string;
  rule: string;
  match: string;
  chain: string;
  down: string;
  up: string;
  dlTotal: string;
  ulTotal: string;
  ago: string;
  dur: string;
  downloadSpeedValue: number;
  uploadSpeedValue: number;
  downloadTotalValue: number;
  uploadTotalValue: number;
  startTimeValue: number;
}

interface ConnStats {
  downloadTotal: number;
  uploadTotal: number;
  downloadSpeed: number;
  uploadSpeed: number;
  active: number;
}

const EMPTY_STATS: ConnStats = {
  downloadTotal: 0,
  uploadTotal: 0,
  downloadSpeed: 0,
  uploadSpeed: 0,
  active: 0,
};

type SortKey = "host" | "down" | "up" | "downloadTotal" | "uploadTotal" | "startTime";

const COLUMNS: { label: string; minWidth: number; align: "left" | "right" | "center"; sortKey?: SortKey }[] = [
  { label: "", minWidth: 44, align: "center" },
  { label: "host", minWidth: 240, align: "left", sortKey: "host" },
  { label: "主机", minWidth: 120, align: "left" },
  { label: "left", minWidth: 160, align: "left" },
  { label: "host", minWidth: 240, align: "left" },
  { label: "下载速度", minWidth: 120, align: "right", sortKey: "down" },
  { label: "type", minWidth: 120, align: "right", sortKey: "up" },
  { label: "类型", minWidth: 110, align: "right", sortKey: "downloadTotal" },
  { label: "left", minWidth: 110, align: "right", sortKey: "uploadTotal" },
  { label: "连接时间↓", minWidth: 120, align: "right", sortKey: "startTime" },
];

function stringValue(value: unknown) {
  return value == null ? "" : String(value);
}

function numberValue(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function endpoint(host: unknown, port: unknown) {
  const left = stringValue(host);
  const right = stringValue(port);
  if (!left && !right) return "-";
  return right ? `${left}:${right}` : left;
}

function formatDuration(ms: number) {
  if (!Number.isFinite(ms) || ms < 0) return "-";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function formatAgo(value: unknown) {
  const raw = stringValue(value);
  if (!raw) return "-";
  const time = Date.parse(raw);
  if (!Number.isFinite(time)) return raw;
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (seconds < 60) return `${seconds} 秒前`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

function normalizeConnection(row: any, index: number): Conn {
  const network = stringValue(row.network || row.protocol).toUpperCase();
  const proto = network === "UDP" ? "UDP" : network === "TCP" ? "TCP" : network || "-";
  const source = endpoint(row.source_ip || row.sourceIP, row.source_port || row.sourcePort);
  const destination = endpoint(row.destination_ip || row.destinationIP, row.destination_port || row.destinationPort);
  const host = stringValue(row.host || row.process || row.destination_ip || row.destinationIP || destination || "-");
  const inbound = stringValue(row.inbound || row.type);
  const rule = [inbound, network.toLowerCase()].filter(Boolean).join(" | ") || "-";
  const ruleName = stringValue(row.rule);
  const rulePayload = stringValue(row.rule_payload || row.rulePayload);
  const chains = Array.isArray(row.chains) ? row.chains.map(stringValue).filter(Boolean) : [];
  const chain = stringValue(row.chain) || chains.join(" › ") || "-";
  const start = stringValue(row.start);
  const startTime = Date.parse(start);
  const downloadSpeedValue = numberValue(row.download_speed || row.downloadSpeed);
  const uploadSpeedValue = numberValue(row.upload_speed || row.uploadSpeed);
  const downloadTotalValue = numberValue(row.download || row.download_total || row.downloadTotal);
  const uploadTotalValue = numberValue(row.upload || row.upload_total || row.uploadTotal);
  return {
    id: stringValue(row.id || `conn-${index + 1}`),
    host,
    proto,
    src: source,
    dst: destination,
    rule,
    match: ruleName ? (rulePayload ? `${ruleName}: ${rulePayload}` : ruleName) : "Match",
    chain,
    down: `${formatBytes(downloadSpeedValue)}/s`,
    up: `${formatBytes(uploadSpeedValue)}/s`,
    dlTotal: formatBytes(downloadTotalValue),
    ulTotal: formatBytes(uploadTotalValue),
    ago: formatAgo(start),
    dur: Number.isFinite(startTime) ? formatDuration(Date.now() - startTime) : "-",
    downloadSpeedValue,
    uploadSpeedValue,
    downloadTotalValue,
    uploadTotalValue,
    startTimeValue: Number.isFinite(startTime) ? startTime : 0,
  };
}

function normalizeStats(connectionsData: any, trafficData: any): ConnStats {
  return {
    downloadTotal: numberValue(connectionsData.download_total ?? connectionsData.downloadTotal),
    uploadTotal: numberValue(connectionsData.upload_total ?? connectionsData.uploadTotal),
    downloadSpeed: numberValue(trafficData.down ?? trafficData.download ?? trafficData.download_speed ?? trafficData.downloadSpeed),
    uploadSpeed: numberValue(trafficData.up ?? trafficData.upload ?? trafficData.upload_speed ?? trafficData.uploadSpeed),
    active: numberValue(connectionsData.active_count ?? connectionsData.total),
  };
}

function matchBadgeCls(match: string) {
  return match.startsWith("RuleSet")
    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/20"
    : "bg-slate-500/10 text-slate-700 dark:text-slate-200 ring-1 ring-slate-500/20";
}

export default function MihomoConnectionsPage() {
  const { toasts, showToast } = useToaster();
  const [conns, setConns] = useState<Conn[]>([]);
  const [stats, setStats] = useState<ConnStats>(EMPTY_STATS);
  const [closedCount, setClosedCount] = useState(0);
  const [tab, setTab] = useState<"active" | "closed">("active");
  const [proto, setProto] = useState("all");
  const [query, setQuery] = useState("");
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("startTime");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [connectionsPayload, trafficPayload] = await Promise.all([
        api<any>("/api/v1/mihomo/connections?limit=500"),
        api<any>("/api/v1/mihomo/traffic").catch(() => null),
      ]);
      const data = apiData<any>(connectionsPayload, connectionsPayload);
      const traffic = trafficPayload ? apiData<any>(trafficPayload, trafficPayload) : {};
      const rows = apiList<any>(data, ["connections", "items", "data"]).map(normalizeConnection);
      setConns(rows);
      setStats(normalizeStats(data, traffic));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "加载连接失败");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => void load(), 3000);
    return () => window.clearInterval(timer);
  }, [load, paused]);

  const filtered = useMemo(() => {
    let list = tab === "active" ? conns : [];
    if (proto !== "all") list = list.filter((c) => c.proto === proto);
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length) {
      list = list.filter((c) => terms.every((t) => (c.host + c.chain + c.match + c.dst + c.src).toLowerCase().includes(t)));
    }
    const sorted = [...list].sort((left, right) => {
      let a: string | number = 0;
      let b: string | number = 0;
      if (sortKey === "host") {
        a = left.host.toLowerCase();
        b = right.host.toLowerCase();
      } else if (sortKey === "down") {
        a = left.downloadSpeedValue;
        b = right.downloadSpeedValue;
      } else if (sortKey === "up") {
        a = left.uploadSpeedValue;
        b = right.uploadSpeedValue;
      } else if (sortKey === "downloadTotal") {
        a = left.downloadTotalValue;
        b = right.downloadTotalValue;
      } else if (sortKey === "uploadTotal") {
        a = left.uploadTotalValue;
        b = right.uploadTotalValue;
      } else {
        a = left.startTimeValue;
        b = right.startTimeValue;
      }
      const result = typeof a === "string" ? a.localeCompare(String(b)) : a - Number(b);
      return sortDir === "asc" ? result : -result;
    });
    return sorted;
  }, [conns, tab, proto, query, sortKey, sortDir]);

  const toggleSort = (nextKey: SortKey) => {
    if (sortKey === nextKey) {
      setSortDir((current) => current === "asc" ? "desc" : "asc");
      return;
    }
    setSortKey(nextKey);
    setSortDir(nextKey === "host" ? "asc" : "desc");
  };

  const closeOne = async (id: string) => {
    setBusy(id);
    try {
      await api(`/api/v1/mihomo/connections/${encodeURIComponent(id)}`, { method: "DELETE" });
      setClosedCount((n) => n + 1);
      showToast("连接已关闭");
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "关闭连接失败");
    } finally {
      setBusy("");
    }
  };

  const closeAll = async () => {
    setBusy("all");
    try {
      await api("/api/v1/mihomo/connections", { method: "DELETE" });
      setClosedCount((n) => n + conns.length);
      showToast("已关闭所有活跃连接");
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "关闭连接失败");
    } finally {
      setBusy("");
    }
  };

  const tiles = [
    ["下载总量", formatBytes(stats.downloadTotal)],
    ["上传总量", formatBytes(stats.uploadTotal)],
    ["下载速度", `${formatBytes(stats.downloadSpeed)}/s`],
    ["上传速度", `${formatBytes(stats.uploadSpeed)}/s`],
  ];

  return (
    <AppShell>
      <div className="space-y-4 animate-fade-in">
        <div className="relative rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
          <div className="h-px w-full bg-primary/35" />
          <div className="p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
                <Cable className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold text-foreground">连接</h1>
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{stats.active || conns.length}</span> 活跃 ·{" "}
                  <span className="font-semibold text-foreground">{closedCount}</span> 已关闭
                </p>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <button onClick={() => void load().then(() => showToast("已刷新"))} className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" aria-label="刷新">
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                </button>
                <button onClick={() => { setPaused((v) => !v); showToast(paused ? "已恢复刷新" : "已暂停刷新"); }} className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" aria-label={paused ? "继续" : "暂停"}>
                  {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                </button>
                <button onClick={() => searchInputRef.current?.focus()} className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" aria-label="过滤">
                  <SlidersHorizontal className="h-4 w-4" />
                </button>
                <button disabled={busy === "all" || conns.length === 0} onClick={() => void closeAll()} className="inline-flex h-9 items-center gap-1.5 px-3 rounded-[10px] bg-destructive text-white text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-60">
                  <X className="h-4 w-4" />
                  关闭所有活跃连接
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {tiles.map(([label, value]) => (
                <div key={label} className="rounded-lg border border-border/50 bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="text-base font-bold text-foreground">{value}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
                <button onClick={() => setTab("active")} className={cn("px-3 py-1.5 rounded-md text-sm font-medium transition-all", tab === "active" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                  活跃 ({conns.length})
                </button>
                <button onClick={() => setTab("closed")} className={cn("px-3 py-1.5 rounded-md text-sm font-medium transition-all", tab === "closed" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                  已关闭 ({closedCount})
                </button>
              </div>
              <select value={proto} onChange={(e) => setProto(e.target.value)} className="px-3 py-1.5 rounded-lg border border-border/60 bg-card text-sm focus:outline-none focus:border-primary/60">
                <option value="all">all</option>
                <option value="TCP">TCP</option>
                <option value="UDP">UDP</option>
              </select>
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input ref={searchInputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索｜多个关键词用空格分隔" className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-border/60 bg-background focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all" />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-card overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border/40">
                {COLUMNS.map((col, i) => (
                  <th
                    key={i}
                    style={{ minWidth: col.minWidth }}
                    className={cn(
                      "px-3 py-2 text-[11px] font-semibold text-muted-foreground select-none",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                      col.sortKey && "cursor-pointer hover:text-foreground"
                    )}
                    onClick={col.sortKey ? () => toggleSort(col.sortKey as SortKey) : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {col.sortKey === sortKey ? <span>{sortDir === "asc" ? "↑" : "↓"}</span> : null}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-3 py-12 text-center text-sm text-muted-foreground">
                    {loading ? "正在加载连接..." : "暂无连接"}
                  </td>
                </tr>
              )}
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2 text-center">
                    <button disabled={busy === c.id} onClick={() => void closeOne(c.id)} className="inline-flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-destructive/10 hover:text-destructive text-muted-foreground disabled:opacity-60" title="关闭连接">
                      <X className="h-4 w-4" />
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate font-medium text-sm">{c.host}</span>
                        <span className="inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-semibold bg-sky-500/15 text-sky-700 dark:text-sky-300 ring-1 ring-sky-500/20 shrink-0">
                          {c.proto}
                        </span>
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-muted-foreground truncate">{c.src} → {c.dst}</div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-[12px] text-muted-foreground whitespace-nowrap">{c.rule}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium truncate max-w-[260px]", matchBadgeCls(c.match))} title={c.match}>
                      {c.match}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="min-w-0">
                      <span className="block truncate text-[12px]">{c.chain}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right"><span className="tabular-nums text-[12px]">{c.down}</span></td>
                  <td className="px-3 py-2 text-right"><span className="tabular-nums text-[12px]">{c.up}</span></td>
                  <td className="px-3 py-2 text-right"><span className="tabular-nums text-[12px]">{c.dlTotal}</span></td>
                  <td className="px-3 py-2 text-right"><span className="tabular-nums text-[12px]">{c.ulTotal}</span></td>
                  <td className="px-3 py-2 text-right">
                    <div className="text-right">
                      <div className="tabular-nums text-[12px]">{c.ago}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">{c.dur}</div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ToastStack toasts={toasts} />
    </AppShell>
  );
}
