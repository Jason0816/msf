"use client";

import { useMemo, useState } from "react";
import { TimeWindowSelector } from "@/components/charts/TimeWindowSelector";
import { withinTimeWindow, type TimeWindowSeconds } from "@/components/charts/timeSeries";
import { formatBytes } from "@/lib/api";
import { RateChart, SYSTEM_CHART_COLORS } from "../../charts";
import { useSystemDashboardData } from "../../data";
import type { SystemWidgetSize } from "./SystemInfoCollectionWidget";

export type SystemRateWidgetProps = { size?: SystemWidgetSize };

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-1.5 whitespace-nowrap text-[11px] text-muted-foreground"><i className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />{label}</span>;
}

export function SystemRateWidget({ size = "m" }: SystemRateWidgetProps) {
  const { network, history, streamConnected } = useSystemDashboardData();
  const [range, setRange] = useState<TimeWindowSeconds>(60);
  const points = useMemo(() => withinTimeWindow(history, range), [history, range]);
  const download = Number(network.download_speed ?? 0);
  const upload = Number(network.upload_speed ?? 0);
  const connections = Number(network.connections ?? network.connection_count ?? 0);
  const chartHeight = size === "s" ? "min-h-[150px]" : size === "l" ? "min-h-[270px]" : "min-h-[205px]";
  return (
    <div className="@container flex h-full min-h-0 flex-col">
      <div className="mb-2 grid grid-cols-3 gap-2 text-[10px] @min-[520px]:text-xs">
        <span className="truncate text-muted-foreground">上传 <b className="tabular-nums text-foreground">{formatBytes(upload)}/s</b></span>
        <span className="truncate text-muted-foreground">下载 <b className="tabular-nums text-foreground">{formatBytes(download)}/s</b></span>
        <span className="truncate text-right text-muted-foreground">连接 <b className="tabular-nums text-foreground">{connections}</b></span>
      </div>
      <div className={`min-w-0 flex-1 ${chartHeight}`}><RateChart points={points} downloadSpeed={download} uploadSpeed={upload} connections={connections} windowSeconds={range} /></div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <Legend color={SYSTEM_CHART_COLORS.upload} label="上传" />
          <Legend color={SYSTEM_CHART_COLORS.download} label="下载" />
          <Legend color={SYSTEM_CHART_COLORS.connections} label="连接数" />
          <span className="text-[10px] text-muted-foreground">{streamConnected ? "实时" : "历史补齐"}</span>
        </div>
        <TimeWindowSelector value={range} onChange={setRange} />
      </div>
    </div>
  );
}
