"use client";

import { useMemo, useState } from "react";
import { Copy, Database, ExternalLink, Search, X } from "lucide-react";
import type {
  CacheDomainRow,
  CacheSystemData,
  CacheStats,
  CacheStrategy,
  ScheduledTask,
  TaskStatus,
} from "@/lib/mosdns-system-data";
import { ModalViewport } from "@/components/liquid-glass/ModalViewport";
import { cn } from "@/lib/utils";

type CacheStatKey = Exclude<keyof CacheStats, "totalDomains">;

/* ─── Switch toggle with visible border ─── */
function SwitchToggle({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        checked ? "bg-emerald-500" : "bg-muted"
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

/* ─── Cache stat cards ─── */
const statCards: { key: CacheStatKey; label: string; icon: string; borderClass: string; bgClass: string }[] = [
  {
    key: "realIp", label: "RealIP", icon: "📦",
    borderClass: "border-blue-200 dark:border-blue-800",
    bgClass: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20",
  },
  {
    key: "fakeIp", label: "FakeIP", icon: "🎭",
    borderClass: "border-emerald-200 dark:border-emerald-800",
    bgClass: "bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20",
  },
  {
    key: "noV4", label: "无 V4", icon: "🚫",
    borderClass: "border-orange-200 dark:border-orange-800",
    bgClass: "bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20",
  },
  {
    key: "noV6", label: "无 V6", icon: "🔮",
    borderClass: "border-purple-200 dark:border-purple-800",
    bgClass: "bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20",
  },
];

function CacheStatCards({ stats, onOpen }: { stats: CacheStats; onOpen: (key: CacheStatKey) => void }) {
  return (
    <div>
      <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
        {statCards.map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={() => onOpen(card.key)}
            className={cn(
              "p-2.5 rounded-lg border text-left transition-all hover:shadow-sm cursor-pointer",
              card.borderClass,
              card.bgClass
            )}
          >
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
              <span>{card.icon}</span>
              <span>{card.label}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/60">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </div>
            <div className="text-xl font-bold text-foreground">{stats[card.key]}</div>
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground text-center">
        总计: {stats.totalDomains.toLocaleString()} 个域名
      </p>
    </div>
  );
}

function normalizeDomainForOpen(value: string) {
  return value.replace(/^\d{4}[-/]\d{2}[-/]\d{2}\s+/, "").replace(/^\*\./, "").trim();
}

function CacheDomainModal({
  title,
  rows,
  onClose,
}: {
  title: string;
  rows: CacheDomainRow[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => `${row.id} ${row.date || ""} ${row.domain} ${row.source || ""}`.toLowerCase().includes(q));
  }, [query, rows]);

  const copyDomain = async (domain: string) => {
    try {
      await navigator.clipboard.writeText(normalizeDomainForOpen(domain));
    } catch {
      window.prompt("复制域名", normalizeDomainForOpen(domain));
    }
  };

  const openDomain = (domain: string) => {
    const clean = normalizeDomainForOpen(domain);
    if (!clean) return;
    window.open(`https://${clean}`, "_blank", "noopener,noreferrer");
  };

  return (
    <ModalViewport onClose={onClose}>
      <div role="dialog" aria-modal="true" className="relative flex h-[min(78dvh,780px)] w-full max-w-[680px] flex-col rounded-xl border border-border/40 bg-card text-card-foreground shadow-apple-xl">
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-primary/10 p-2 text-primary">
              <Database className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-semibold">{title} 域名列表</h3>
              <p className="text-xs text-muted-foreground">共 {rows.length.toLocaleString()} 个域名</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="关闭域名列表"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-border/50 px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="输入关键词搜索域名..."
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
            />
          </div>
        </div>

        <div className="grid grid-cols-[96px_1fr_96px] border-b border-border/50 bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground">
          <span>ID</span>
          <span>域名</span>
          <span className="text-right">操作</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {filteredRows.map((row, index) => {
            const displayDomain = row.date ? `${row.date} ${row.domain}` : row.domain;
            return (
              <div
                key={`${row.id || index}:${row.domain}`}
                className="grid grid-cols-[96px_1fr_96px] items-center border-b border-border/50 px-4 py-3 text-sm last:border-0 hover:bg-muted/30"
              >
                <span className="font-mono text-xs text-muted-foreground">{row.id || String(index + 1).padStart(10, "0")}</span>
                <span className="min-w-0 truncate font-mono text-foreground" title={displayDomain}>
                  {displayDomain}
                </span>
                <span className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    aria-label={`复制 ${row.domain}`}
                    onClick={() => void copyDomain(row.domain)}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`打开 ${row.domain}`}
                    onClick={() => openDomain(row.domain)}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </span>
              </div>
            );
          })}
          {filteredRows.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">暂无匹配域名</div>
          )}
        </div>

        <div className="flex justify-end border-t border-border/50 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            关闭
          </button>
        </div>
      </div>
    </ModalViewport>
  );
}

function toDateTimeLocal(value: string) {
  if (!value || value === "-") return "";
  const cleaned = value.replace(" ", "T");
  const match = cleaned.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  if (match) return `${match[1]}T${match[2]}`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDateTimeLocal(value: string) {
  return value ? value.replace("T", " ") : "-";
}

/* ─── Cache strategy (vertical layout: label on top) ─── */
function CacheStrategyPanel({
  strategy,
  onToggleCache1,
  onToggleCache2,
}: {
  strategy: CacheStrategy;
  onToggleCache1: () => void;
  onToggleCache2: () => void;
}) {
  return (
    <div className="flex flex-col">
      <div className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
        <span>⚙️</span> 缓存策略
      </div>
      <div className="flex flex-col justify-between space-y-2 flex-1 p-2.5 rounded-lg border border-foreground bg-muted/30">
        <div className="flex items-center justify-between gap-2 p-3 rounded-lg border border-foreground bg-muted/30">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-sm text-foreground">
              过期缓存1
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground shrink-0">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <path d="M12 17h.01" />
              </svg>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">国内/国外缓存(兼容/安全)</p>
          </div>
          <SwitchToggle checked={strategy.expiredCache1} onToggle={onToggleCache1} />
        </div>
        <div className="flex items-center justify-between gap-2 p-3 rounded-lg border border-foreground bg-muted/30">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-sm text-foreground">
              过期缓存2
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground shrink-0">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <path d="M12 17h.01" />
              </svg>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">启用全部缓存(兼容/安全)与 fakeip</p>
          </div>
          <SwitchToggle checked={strategy.expiredCache2} onToggle={onToggleCache2} />
        </div>
      </div>
    </div>
  );
}

/* ─── Scheduled task (vertical layout) ─── */
function ScheduledTaskPanel({
  task,
  onChangeTask,
  onSaveTask,
}: {
  task: ScheduledTask;
  onChangeTask: (t: ScheduledTask) => void;
  onSaveTask?: () => void;
}) {
  const changeInterval = (intervalMinutes: number) => {
    const minutes = Math.max(1, Number.isFinite(intervalMinutes) ? Math.round(intervalMinutes) : 1);
    onChangeTask({ ...task, intervalMinutes: minutes, refreshDays: Math.max(1, Math.round(minutes / 1440)) });
  };
  const changeRefreshDays = (refreshDays: number) => {
    const days = Math.max(1, Number.isFinite(refreshDays) ? Math.round(refreshDays) : 1);
    onChangeTask({ ...task, refreshDays: days, intervalMinutes: days * 1440 });
  };

  return (
    <div className="flex flex-col">
      <div className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
        <span>⏰</span> 定时任务
      </div>
      <div className="space-y-2 flex-1 p-2.5 rounded-lg border border-foreground bg-muted/30">
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground">启用定时任务</span>
          <SwitchToggle
            checked={task.enabled}
            onToggle={() => onChangeTask({ ...task, enabled: !task.enabled })}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">首次执行时间</label>
          <input
            type="datetime-local"
            value={toDateTimeLocal(task.firstRunTime)}
            onChange={(e) => onChangeTask({ ...task, firstRunTime: fromDateTimeLocal(e.target.value) })}
            className="w-full rounded border border-foreground bg-background px-2 py-1.5 text-sm hover:bg-muted/30 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">间隔 (分钟)</label>
          <input
            type="number"
            value={task.intervalMinutes}
            min={1}
            onChange={(e) => changeInterval(Number(e.target.value))}
            className="w-full rounded border border-foreground bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">域名刷新天数</label>
          <input
            type="number"
            value={task.refreshDays}
            min={1}
            onChange={(e) => changeRefreshDays(Number(e.target.value))}
            className="w-full rounded border border-foreground bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          onClick={onSaveTask}
          className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-xs font-medium"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
          </svg>
          保存配置
        </button>
      </div>
    </div>
  );
}

/* ─── Task status (vertical layout) ─── */
function TaskStatusPanel({ status }: { status: TaskStatus }) {
  return (
    <div className="flex flex-col">
      <div className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
        <span>📈</span> 任务状态
      </div>
      <div className="space-y-2 flex-1 p-2.5 rounded-lg border border-foreground bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">当前状态</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
            {status.currentStatus}
          </span>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">上次运行</span>
          <div className="text-sm text-foreground mt-0.5">{status.lastRunTime}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {status.lastRunRelative} <span className="mx-1">•</span> 耗时 {status.lastRunDuration}
          </div>
        </div>
        <div className="border-t border-border/50 pt-2">
          <span className="text-xs text-muted-foreground">执行记录</span>
          <div className="mt-1 max-h-20 space-y-1 overflow-y-auto pr-1">
            {(status.records || []).length > 0 ? (
              (status.records || []).slice(-4).reverse().map((record, index) => (
                <div key={`${record}:${index}`} className="truncate rounded bg-background/70 px-2 py-1 text-xs text-foreground" title={record}>
                  {record}
                </div>
              ))
            ) : (
              <div className="text-xs text-muted-foreground">暂无记录</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Operations bar ─── */
function OperationsBar({
  onHotReload,
  onSaveRules,
  onClearBackup,
}: {
  onHotReload: () => void;
  onSaveRules: () => void;
  onClearBackup: () => void;
}) {
  return (
    <div>
      <div className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
        <span>🔧</span> 操作
      </div>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onHotReload}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            开始热更新
          </button>
          <button
            onClick={onSaveRules}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted/30 text-sm font-medium transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
            </svg>
            保存规则
          </button>
          <button
            onClick={onClearBackup}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 text-sm font-medium transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            清空备份
          </button>
        </div>
        <div className="mt-2 flex items-start gap-1.5 p-2 rounded-lg bg-blue-50/50 dark:bg-blue-950/10 border border-blue-200/40 dark:border-blue-800/40">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500 mt-0.5 shrink-0">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" /><path d="M12 8h.01" />
          </svg>
          <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
            提示：热更新会重新分析所有域名的分流规则并更新缓存；保存规则将当前分流规则持久化保存；清空备份会删除全量备份数据以释放存储空间
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Main cache system section ─── */
interface CacheSystemSectionProps {
  data: CacheSystemData;
  onToggleCache1: () => void;
  onToggleCache2: () => void;
  onChangeTask: (t: ScheduledTask) => void;
  onHotReload: () => void;
  onSaveRules: () => void;
  onClearBackup: () => void;
  onSaveTask?: () => void;
  cacheDomains?: Partial<Record<CacheStatKey, CacheDomainRow[]>>;
}

export function CacheSystemSection({
  data,
  onToggleCache1,
  onToggleCache2,
  onChangeTask,
  onHotReload,
  onSaveRules,
  onClearBackup,
  onSaveTask,
  cacheDomains = {},
}: CacheSystemSectionProps) {
  const [activeCache, setActiveCache] = useState<CacheStatKey | null>(null);
  const activeCard = statCards.find((card) => card.key === activeCache);
  const activeRows = activeCache ? cacheDomains[activeCache] || [] : [];

  return (
    <div className="mb-6 rounded-[12px] border bg-card text-card-foreground !border-border/20 !shadow-none transition-shadow duration-300 hover:!shadow-sm border-cyan-200/40 shadow-sm">
      {/* Header */}
      <div className="flex flex-col space-y-1.5 p-6 pb-3">
        <h3 className="text-base font-semibold tracking-tight flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="oklch(0.55 0.18 280)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          </span>
          缓存系统
        </h3>
        <p className="text-xs text-muted-foreground">管理 DNS 解析结果的缓存</p>
      </div>

      {/* Body */}
      <div className="p-6 pt-0 space-y-6">
        {/* Stats block — vertical: label on top */}
        <div>
          <div className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            <span>📊</span> 缓存统计
          </div>
          <CacheStatCards stats={data.stats} onOpen={setActiveCache} />
        </div>

        {/* Strategy / Task / Status — 3-col grid, each column is vertical */}
        <div className="grid gap-3 lg:grid-cols-3">
          <CacheStrategyPanel
            strategy={data.strategy}
            onToggleCache1={onToggleCache1}
            onToggleCache2={onToggleCache2}
          />
          <ScheduledTaskPanel task={data.scheduledTask} onChangeTask={onChangeTask} onSaveTask={onSaveTask} />
          <TaskStatusPanel status={data.taskStatus} />
        </div>

        {/* Operations */}
        <OperationsBar
          onHotReload={onHotReload}
          onSaveRules={onSaveRules}
          onClearBackup={onClearBackup}
        />
      </div>
      {activeCache && activeCard && (
        <CacheDomainModal title={activeCard.label} rows={activeRows} onClose={() => setActiveCache(null)} />
      )}
    </div>
  );
}
