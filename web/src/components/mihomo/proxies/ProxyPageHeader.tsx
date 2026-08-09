import { Loader2, PanelTop, RefreshCw } from "lucide-react";
import { GlassButton } from "@/components/liquid-glass/GlassButton";
import { cn } from "@/lib/utils";
import { ProxyConfigStatus } from "./ProxyConfigStatus";
import type { ProxyConfigStatusView, ProxyRuntimeStatsView } from "./types";

export function ProxyPageHeader({
  stats,
  configStatus,
  loading,
  autoRefresh,
  onRefresh,
  onToggleAutoRefresh,
  onCollapseAll,
  allCollapsed,
}: {
  stats: ProxyRuntimeStatsView;
  configStatus: ProxyConfigStatusView;
  loading?: boolean;
  autoRefresh: boolean;
  onRefresh: () => void;
  onToggleAutoRefresh: () => void;
  onCollapseAll: () => void;
  allCollapsed: boolean;
}) {
  return (
    <header className="flex flex-wrap items-end gap-x-4 gap-y-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">代理</h1>
          <ProxyConfigStatus status={configStatus} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground md:text-sm">
          <span><b className="font-semibold tabular-nums text-foreground">{stats.connections}</b> 条连接</span>
          <span className="hidden text-border sm:inline">•</span>
          <span>↑ <b className="font-semibold tabular-nums text-foreground">{stats.uploadSpeed}</b>/s</span>
          <span className="hidden text-border sm:inline">•</span>
          <span>↓ <b className="font-semibold tabular-nums text-foreground">{stats.downloadSpeed}</b>/s</span>
          <span className="hidden text-border lg:inline">•</span>
          <span className="hidden lg:inline">累计 ↑ <b className="font-semibold tabular-nums text-foreground">{stats.uploadTotal}</b></span>
          <span className="hidden lg:inline">累计 ↓ <b className="font-semibold tabular-nums text-foreground">{stats.downloadTotal}</b></span>
          <span className="rounded-full bg-background/40 px-2 py-0.5">模式 {stats.mode || "-"}</span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <GlassButton
          type="button"
          variant="tool"
          onClick={onToggleAutoRefresh}
          aria-pressed={autoRefresh}
          title="每 30 秒静默刷新，不覆盖编辑草稿"
          className={cn("h-9 px-3 text-xs", !autoRefresh && "text-muted-foreground")}
        >
          <PanelTop className="h-4 w-4" />
          自动刷新 {autoRefresh ? "开" : "关"}
        </GlassButton>
        <GlassButton
          type="button"
          variant="tool"
          className="h-9 bg-primary/10 px-3 text-xs font-medium text-primary hover:bg-primary/15"
          onClick={onCollapseAll}
          title={allCollapsed ? "展开当前列表" : "收起当前列表"}
        >
          {allCollapsed ? "全部展开" : "全部收起"}
        </GlassButton>
        <GlassButton type="button" variant="tool" className="h-9 w-9 p-0" onClick={onRefresh} disabled={loading} title="刷新运行态">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </GlassButton>
      </div>
    </header>
  );
}
