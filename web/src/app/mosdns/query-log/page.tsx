"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Search, Pause, Play, ChevronDown, ChevronUp, ListFilter, Sparkles, Check, Copy, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { cn } from "@/lib/utils";
import { ToastStack, type ToastItem } from "@/components/rules/RuleDialogs";
import { api, apiData, apiList } from "@/lib/api";

interface QueryRow {
  id: string;
  seq: number;
  time: string;
  domain: string;
  client: string;
  type: string;
  rule: string;
  status: string;
  answer?: string;
  ms: string;
}

type ColKey = "domain" | "client" | "type" | "rule" | "status";

const columns: { label: string; key?: ColKey; sort?: boolean; align?: string; className?: string }[] = [
  { label: "时间", sort: true, className: "w-[150px]" },
  { label: "域名", key: "domain", className: "w-[220px] max-w-[260px]" },
  { label: "查询结果", className: "min-w-[190px] max-w-[320px]" },
  { label: "客户端", key: "client" },
  { label: "类型", key: "type" },
  { label: "分流规则", key: "rule" },
  { label: "响应状态", key: "status" },
  { label: "耗时 (ms)", align: "right" },
];

const ruleColor: Record<string, string> = {
  unmatched_rule: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  my_nov6rule: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  cuscn: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  BANHTTPS: "bg-red-500/10 text-red-600 dark:text-red-400",
  my_fakeiprule: "bg-cyan-600/10 text-cyan-700 dark:text-cyan-500",
};

function textValue(item: Record<string, unknown>, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = item[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }
  return fallback;
}

function formatTime(value: string) {
  if (!value) return "-";
  const ts = Date.parse(value);
  if (!Number.isFinite(ts)) return value;
  return new Date(ts).toLocaleString();
}

function formatMs(value: unknown) {
  const ms = Number(value);
  if (!Number.isFinite(ms)) return "-";
  return ms.toFixed(2);
}

function formatAnswerItem(value: unknown) {
  if (!value || typeof value !== "object") return value ? String(value) : "";
  const answer = value as Record<string, unknown>;
  const type = textValue(answer, ["type", "record_type", "qtype"]);
  const data = textValue(answer, ["data", "value", "answer", "ip", "target"]);
  const ttl = textValue(answer, ["ttl"]);
  if (!data) return JSON.stringify(value);
  return `${type ? `${type}: ` : ""}${data}${ttl ? ` (TTL ${ttl}s)` : ""}`;
}

function formatAnswer(value: unknown) {
  if (Array.isArray(value)) {
    const answers = value.map(formatAnswerItem).filter(Boolean);
    return answers.length ? answers.join(" · ") : undefined;
  }
  const answer = formatAnswerItem(value);
  return answer || undefined;
}

function emptyAnswerLabel(status: string) {
  const normalized = status.toUpperCase();
  if (["NXDOMAIN", "SERVFAIL", "REFUSED", "FORMERR", "NOTIMP"].includes(normalized)) return "无结果";
  return "未记录应答";
}

function normalizeQueryRow(item: unknown, index: number): QueryRow {
  const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
  const rawTime = textValue(row, ["query_time", "time", "timestamp", "created_at"]);
  const parsed = Date.parse(rawTime);
  return {
    id: textValue(row, ["trace_id", "id"], `query-${index}`),
    seq: Number.isFinite(parsed) ? parsed : Date.now() - index,
    time: formatTime(rawTime),
    domain: textValue(row, ["query_name", "domain", "host"], "-"),
    client: textValue(row, ["client_ip", "client", "src"], "-"),
    type: textValue(row, ["query_type", "type", "qtype"], "-"),
    rule: textValue(row, ["domain_set", "rule", "matched_rule"], "-"),
    status: textValue(row, ["response_code", "response", "status"], "-"),
    answer: formatAnswer(row.answers ?? row.answer),
    ms: formatMs(row.duration_ms ?? row.elapsed_ms ?? row.cost_ms ?? row.duration ?? row.elapsed ?? row.cost),
  };
}

export default function QueryLogPage() {
  const [allRows, setAllRows] = useState<QueryRow[]>([]);
  const [query, setQuery] = useState("");
  const [exact, setExact] = useState(false);
  const [sortDesc, setSortDesc] = useState(true);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openFilter, setOpenFilter] = useState<ColKey | null>(null);
  const [filters, setFilters] = useState<Record<ColKey, Set<string>>>({
    domain: new Set(),
    client: new Set(),
    type: new Set(),
    rule: new Set(),
    status: new Set(),
  });
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2000);
  }, []);

  const load = useCallback(async () => {
    try {
      const payload = await api("/api/v1/mosdns/query-log?limit=500");
      const data = apiData<any>(payload, payload);
      const rows = apiList<any>(data, ["logs", "items", "data"]).map(normalizeQueryRow);
      setAllRows(rows);
      setError("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "查询日志加载失败";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => void load(), 4000);
    return () => window.clearInterval(id);
  }, [load, paused]);

  const distinct = (key: ColKey) => [...new Set(allRows.map((r) => r[key]).filter(Boolean))];
  const toggleFilterValue = (key: ColKey, val: string) =>
    setFilters((f) => {
      const next = new Set(f[key]);
      if (next.has(val)) next.delete(val);
      else next.add(val);
      return { ...f, [key]: next };
    });

  const copy = (val: string) => {
    navigator.clipboard?.writeText(val);
    showToast("已复制");
  };

  const visible = useMemo(() => {
    let out = allRows.filter((r) => {
      if (query) {
        const match = exact
          ? r.domain === query || r.client === query || r.answer === query
          : `${r.domain}${r.client}${r.answer || ""}`.toLowerCase().includes(query.toLowerCase());
        if (!match) return false;
      }
      for (const key of ["domain", "client", "type", "rule", "status"] as ColKey[]) {
        if (filters[key].size && !filters[key].has(r[key])) return false;
      }
      return true;
    });
    out = [...out].sort((a, b) => (sortDesc ? b.seq - a.seq : a.seq - b.seq));
    return out;
  }, [allRows, query, exact, filters, sortDesc]);

  return (
    <AppShell>
      <div className="space-y-4 animate-fade-in" onClick={() => setOpenFilter(null)}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground flex-shrink-0">查询日志</h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full sm:flex-1 sm:justify-end">
            <button
              onClick={() => setPaused((v) => !v)}
              className={cn(
                "w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors flex-shrink-0",
                paused
                  ? "bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                  : "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400 hover:bg-green-500/20"
              )}
            >
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              {paused ? "开始刷新" : "暂停刷新"}
            </button>
            <button
              onClick={() => void load()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm font-medium hover:bg-accent"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              刷新
            </button>
            <div className="relative w-full sm:max-w-2xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="全局搜索..."
                className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <button
              onClick={() => setExact((v) => !v)}
              className={cn(
                "w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all flex-shrink-0 text-sm font-medium",
                exact ? "bg-primary/10 border-primary text-primary hover:bg-primary/20" : "bg-background border-border text-foreground hover:bg-accent"
              )}
            >
              <Sparkles className="h-4 w-4" />
              {exact ? "精准匹配" : "模糊搜索"}
            </button>
          </div>
        </div>

        {error && <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

        <div className="border border-border rounded-lg bg-background overflow-hidden">
          <div className="overflow-x-auto max-h-[calc(100vh-220px)] overflow-y-auto">
            <table className="w-full min-w-[1120px] table-fixed text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-border bg-muted/30 backdrop-blur">
                  {columns.map((c) => {
                    const active = c.key ? filters[c.key].size > 0 : false;
                    return (
                      <th
                        key={c.label}
                        className={cn("text-left font-medium text-muted-foreground px-3 py-2 whitespace-nowrap relative bg-muted/30", c.className, c.align === "right" && "text-right")}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          {c.label}
                          {c.sort && (
                            <button onClick={(e) => { e.stopPropagation(); setSortDesc((v) => !v); }} className="hover:text-foreground transition-colors">
                              {sortDesc ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                            </button>
                          )}
                          {c.key && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setOpenFilter(openFilter === c.key ? null : c.key!); }}
                              className={cn("transition-colors", active ? "text-primary" : "text-muted-foreground/60 hover:text-foreground")}
                            >
                              <ListFilter className="h-3 w-3" />
                            </button>
                          )}
                        </span>
                        {c.key && openFilter === c.key && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute left-0 top-full mt-1 z-20 w-52 max-h-64 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg p-1.5 font-normal"
                          >
                            {distinct(c.key).map((v) => {
                              const sel = filters[c.key!].has(v);
                              return (
                                <button
                                  key={v}
                                  onClick={() => toggleFilterValue(c.key!, v)}
                                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-foreground hover:bg-accent text-left"
                                >
                                  <span className={cn("flex h-4 w-4 items-center justify-center rounded border", sel ? "bg-primary border-primary text-primary-foreground" : "border-border")}>
                                    {sel && <Check className="h-3 w-3" />}
                                  </span>
                                  <span className="truncate">{v}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={columns.length} className="px-3 py-12 text-center text-sm text-muted-foreground">
                      {loading ? "正在加载查询日志..." : "暂无查询日志"}
                    </td>
                  </tr>
                )}
                {visible.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-3 py-2 whitespace-nowrap font-mono text-xs text-muted-foreground">{r.time}</td>
                    <td className="px-3 py-2 max-w-[260px]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium truncate" title={r.domain}>{r.domain}</span>
                        <button onClick={() => copy(r.domain)} className="text-muted-foreground hover:text-foreground">
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2 max-w-[320px]">
                      {r.answer ? (
                        <div className="font-mono text-xs leading-5 break-all line-clamp-2" title={r.answer}>{r.answer}</div>
                      ) : (
                        <span className="text-xs text-muted-foreground">{emptyAnswerLabel(r.status)}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{r.client}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.type}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={cn("px-2 py-1 rounded-md text-xs font-medium", ruleColor[r.rule] || "bg-muted text-muted-foreground")}>{r.rule}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.status}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-right font-mono text-xs">{r.ms}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <ToastStack toasts={toasts} />
    </AppShell>
  );
}
