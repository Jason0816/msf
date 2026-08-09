"use client";

import { useState } from "react";
import { formatBytes, formatPercent } from "@/lib/api";
import { GlassSegmentedControl } from "@/components/liquid-glass/GlassSegmentedControl";
import { SolidPlate } from "@/components/liquid-glass/SolidPlate";
import { useSystemDashboardData } from "../../data";

export type SystemInfoPage = "device" | "hardware" | "stats";
export type SystemWidgetSize = "s" | "m" | "l";

export type SystemInfoCollectionWidgetProps = {
  activePage?: SystemInfoPage;
  onActivePageChange?: (page: SystemInfoPage) => void;
  size?: SystemWidgetSize;
};

function formatUptime(value: unknown) {
  if (typeof value === "string" && value) return value;
  const seconds = Number(value ?? 0);
  if (!Number.isFinite(seconds) || seconds <= 0) return "-";
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  if (days) return `${days} 天 ${hours} 小时`;
  if (hours) return `${hours} 小时 ${minutes} 分钟`;
  return `${minutes} 分钟`;
}

function display(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function InfoRows({ rows }: { rows: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid gap-2 @min-[620px]:grid-cols-2">
      {rows.map((row) => (
        <SolidPlate key={row.label} tone="regular" className="flex min-h-10 items-center justify-between gap-3 px-3 py-2.5">
          <span className="shrink-0 text-xs text-muted-foreground">{row.label}</span>
          <span className="min-w-0 break-words text-right text-sm font-medium tabular-nums">{row.value}</span>
        </SolidPlate>
      ))}
    </div>
  );
}

export function SystemInfoCollectionWidget({
  activePage,
  onActivePageChange,
  size = "m",
}: SystemInfoCollectionWidgetProps) {
  const { system, resources, network } = useSystemDashboardData();
  const [internalPage, setInternalPage] = useState<SystemInfoPage>("device");
  const page = activePage ?? internalPage;
  const setPage = (next: SystemInfoPage) => {
    if (activePage === undefined) setInternalPage(next);
    onActivePageChange?.(next);
  };
  const rows: Record<SystemInfoPage, Array<{ label: string; value: string }>> = {
    device: [
      { label: "主机名", value: display(system.hostname) },
      { label: "系统平台", value: display(system.platform ?? `${system.os || "-"} / ${system.arch || "-"}`) },
      { label: "运行时间", value: formatUptime(system.uptime_seconds ?? system.uptime) },
      { label: "操作系统", value: display(system.os) },
      { label: "架构", value: display(system.arch) },
      { label: "数据目录", value: display(system.data_dir) },
    ],
    hardware: [
      { label: "CPU", value: display(resources.cpu_model ?? resources.hardware?.cpu_model) },
      { label: "核心数", value: display(resources.cores ?? resources.cpu_cores) },
      { label: "内存", value: formatBytes(resources.memory_total ?? resources.mem_total) },
      { label: "硬盘容量", value: formatBytes(resources.disk_total) },
      { label: "硬盘使用率", value: formatPercent(resources.disk_percent) },
    ],
    stats: [
      { label: "CPU 使用率", value: formatPercent(resources.cpu_percent ?? resources.cpu) },
      { label: "内存使用率", value: formatPercent(resources.memory_percent ?? resources.mem_percent) },
      { label: "总上传流量", value: formatBytes(network.total_upload ?? network.upload_total) },
      { label: "总下载流量", value: formatBytes(network.total_download ?? network.download_total) },
      { label: "当前连接数", value: display(network.connections ?? network.connection_count ?? 0) },
    ],
  };

  return (
    <div className="@container flex h-full min-h-0 flex-col gap-3">
      <GlassSegmentedControl
        value={page}
        onChange={setPage}
        ariaLabel="系统信息页面"
        className="self-start"
        options={[
          { id: "device", label: <span title="设备信息">1</span> },
          { id: "hardware", label: <span title="硬件信息">2</span> },
          { id: "stats", label: <span title="统计信息">3</span> },
        ]}
      />
      <div className={size === "s" ? "min-h-0 flex-1 overflow-y-auto pr-1" : "min-h-0 flex-1 overflow-y-auto"} role="tabpanel">
        <InfoRows rows={rows[page]} />
      </div>
    </div>
  );
}
