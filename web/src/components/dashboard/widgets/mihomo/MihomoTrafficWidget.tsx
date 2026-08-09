"use client";

import { useMemo, useState } from "react";
import { TimeWindowSelector } from "@/components/charts/TimeWindowSelector";
import { withinTimeWindow, type TimeWindowSeconds } from "@/components/charts/timeSeries";
import { formatBytes } from "@/lib/api";
import { RateChart, SYSTEM_CHART_COLORS } from "../../charts";
import { useMihomoDashboardData } from "../../data";

export type MihomoWidgetSize = "s" | "m" | "l";
export type MihomoTrafficWidgetProps = { size?: MihomoWidgetSize };

function Legend({ color, children }: { color: string; children: string }) {
  return <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><i className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />{children}</span>;
}

export function MihomoTrafficWidget({ size = "m" }: MihomoTrafficWidgetProps) {
  const { trafficHistory, overview, trafficConnected } = useMihomoDashboardData();
  const [range, setRange] = useState<TimeWindowSeconds>(60);
  const points = useMemo(() => withinTimeWindow(trafficHistory, range), [range, trafficHistory]);
  const latest = points.at(-1);
  const stats = overview.stats ?? overview;
  const download = latest?.downloadSpeed ?? Number(overview.downloadSpeed ?? overview.download_speed ?? stats.downloadSpeed ?? stats.download_speed ?? 0);
  const upload = latest?.uploadSpeed ?? Number(overview.uploadSpeed ?? overview.upload_speed ?? stats.uploadSpeed ?? stats.upload_speed ?? 0);
  const connections = latest?.connections ?? Number(overview.activeConnections ?? overview.active_connections ?? stats.activeConnections ?? stats.active_connections ?? 0);
  const height = size === "s" ? "min-h-[150px]" : size === "l" ? "min-h-[270px]" : "min-h-[205px]";
  return <div className="@container flex h-full min-h-0 flex-col">
    <div className="mb-2 grid grid-cols-3 gap-2 text-[10px] @min-[520px]:text-xs">
      <span className="truncate text-muted-foreground">上传 <b className="tabular-nums text-foreground">{formatBytes(upload)}/s</b></span>
      <span className="truncate text-muted-foreground">下载 <b className="tabular-nums text-foreground">{formatBytes(download)}/s</b></span>
      <span className="truncate text-right text-muted-foreground">连接 <b className="tabular-nums text-foreground">{connections}</b></span>
    </div>
    <div className={`min-w-0 flex-1 ${height}`}><RateChart points={points} downloadSpeed={download} uploadSpeed={upload} connections={connections} windowSeconds={range} /></div>
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap gap-3"><Legend color={SYSTEM_CHART_COLORS.upload}>上传</Legend><Legend color={SYSTEM_CHART_COLORS.download}>下载</Legend><Legend color={SYSTEM_CHART_COLORS.connections}>连接数</Legend><span className="text-[10px] text-muted-foreground">{trafficConnected ? "WebSocket 实时" : "概览采样兜底"}</span></div><TimeWindowSelector value={range} onChange={setRange} /></div>
  </div>;
}
