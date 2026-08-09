"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Box,
  Cpu,
  MemoryStick,
  Monitor,
  Network,
  RotateCw,
  Server,
  Square,
  TrendingUp,
  Zap,
  Play,
  type LucideIcon,
} from "lucide-react";
import { api, apiData, apiList, formatBytes, formatPercent, getToken } from "@/lib/api";
import { useApiPath } from "@/lib/use-api";
import { DashboardCard } from "./DashboardCard";
import { RateChart, TrendChart, type ChartPoint } from "./charts";
import { TimeWindowSelector } from "@/components/charts/TimeWindowSelector";
import { mergeFrozenTimePoints, withinTimeWindow, type TimeWindowSeconds } from "@/components/charts/timeSeries";
import { useToaster, ToastStack } from "@/components/Toaster";
import { SolidPlate } from "@/components/liquid-glass/SolidPlate";
import {
  DASHBOARD_SETTINGS_EVENT,
  loadDashboardSettings,
  type DashboardComponentKey,
} from "@/lib/dashboard-settings";

const CPU_COLOR = "oklch(60% 0.21 235)";
const MEM_COLOR = "oklch(58% 0.25 293)";
const UP_COLOR = "oklch(60% 0.17 152)";
const CONN_COLOR = "oklch(75% 0.15 75)";
const HISTORY_RETENTION_SECONDS = 360;
let dashboardHistoryCache: Array<ChartPoint & { timestamp?: unknown }> = [];

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <SolidPlate tone="regular" className="flex items-center justify-between gap-3 px-3 py-2.5">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right text-sm font-medium tabular-nums">{value}</span>
    </SolidPlate>
  );
}

function LegendDot({ color, label, icon: Icon }: { color: string; label: string; icon?: LucideIcon }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {Icon ? <Icon className="h-3.5 w-3.5" style={{ color }} /> : <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />}
      <span>{label}</span>
    </div>
  );
}

function scaleButtonClass(active: boolean) {
  return (
    "gary-segmented__item flex-shrink-0 px-2.5 py-1.5 text-[10px] font-medium " +
    (active
      ? "gary-segmented__item--active text-primary"
      : "text-muted-foreground")
  );
}

function numberValue(value: unknown) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizeMonitorPoint(row: any): ChartPoint & { timestamp?: unknown } {
  const network = row?.network && typeof row.network === "object" ? row.network : {};
  return {
    timestamp: row?.timestamp ?? row?.time,
    cpuPercent: row?.cpu_percent ?? row?.cpuPercent ?? row?.cpu,
    memoryPercent: row?.memory_percent ?? row?.memoryPercent ?? row?.mem_percent,
    downloadSpeed: row?.download_speed ?? row?.downloadSpeed ?? network.download_speed ?? network.downloadSpeed,
    uploadSpeed: row?.upload_speed ?? row?.uploadSpeed ?? network.upload_speed ?? network.uploadSpeed,
    connections: row?.connections ?? row?.connection_count ?? network.connections ?? network.connection_count,
  };
}

function autoPercentScale(points: ChartPoint[], fallbackCpu: unknown, fallbackMemory: unknown) {
  const values = points.length
    ? points.flatMap((point) => [numberValue(point.cpuPercent), numberValue(point.memoryPercent)])
    : [numberValue(fallbackCpu), numberValue(fallbackMemory)];
  const max = Math.max(...values, 1);
  return Math.max(10, Math.min(100, Math.ceil(max / 10) * 10));
}

function serviceIcon(name: string): LucideIcon {
  if (name.includes("mosdns")) return Server;
  if (name.includes("mihomo")) return Zap;
  if (name.includes("sing")) return Box;
  return Network;
}

function serviceName(service: any) {
  return String(service.display_name || service.label || service.name || "service");
}

function serviceKey(service: any) {
  return String(service.name || service.id || serviceName(service)).toLowerCase();
}

function formatUptime(value: unknown) {
  if (typeof value === "string" && value) return value;
  const seconds = Number(value || 0);
  if (!Number.isFinite(seconds) || seconds <= 0) return "-";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours >= 24) return `${Math.floor(hours / 24)} 天 ${hours % 24} 小时`;
  if (hours > 0) return `${hours} 小时 ${minutes} 分钟`;
  return `${minutes} 分钟`;
}

function ServiceCard({
  service,
  onMessage,
  onReload,
  compact,
}: {
  service: any;
  onMessage: (message: string) => void;
  onReload: () => void;
  compact?: boolean;
}) {
  const name = serviceName(service);
  const key = serviceKey(service);
  const Icon = serviceIcon(key);
  const configured = service.installed !== false && service.configured !== false;
  const running = Boolean(service.running || service.status === "running");

  const runAction = async (action: "start" | "stop" | "restart") => {
    onMessage(`${name} ${action === "start" ? "正在启动" : action === "stop" ? "正在停止" : "正在重启"}...`);
    try {
      const payload = await api<any>(`/api/v1/services/${key}/${action}?wait=1&timeout=5`, { method: "POST" });
      if (payload.success === false) throw new Error(payload.error || "服务操作失败");
      onMessage(`${name} 操作完成`);
      onReload();
    } catch (err) {
      onMessage(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <DashboardCard title={name} icon={Icon} compact={compact}>
      {configured ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">状态</span>
            <span className={(running ? "text-green-700 dark:text-green-400" : "text-muted-foreground") + " gary-status-pill text-xs font-medium"}>
              <span className={(running ? "bg-green-500" : "bg-muted-foreground") + " w-1.5 h-1.5 rounded-full"} />
              {running ? "运行中" : "已停止"}
            </span>
          </div>
          <InfoLine label="CPU" value={formatPercent(service.cpu ?? service.cpu_percent)} />
          <InfoLine label="内存" value={typeof service.memory === "string" ? service.memory : formatBytes(service.memory_bytes ?? service.memory)} />
          <InfoLine label="运行时间" value={formatUptime(service.uptime ?? service.uptime_seconds)} />
          <div className="flex gap-2 pt-2">
            {running ? (
              <button onClick={() => void runAction("stop")} className="gary-glass-button flex-1 gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-destructive">
                <Square className="h-3.5 w-3.5" />
                停止
              </button>
            ) : (
              <button onClick={() => void runAction("start")} className="gary-glass-button flex-1 gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-green-600 dark:text-green-400">
                <Play className="h-3.5 w-3.5" />
                启动
              </button>
            )}
            <button onClick={() => void runAction("restart")} className="gary-glass-button flex-1 gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-primary">
              <RotateCw className="h-3.5 w-3.5" />
              重启
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 space-y-3">
          <SolidPlate tone="subtle" className="flex h-12 w-12 items-center justify-center rounded-full">
            <Icon className="h-6 w-6 text-muted-foreground" />
          </SolidPlate>
          <div className="text-center space-y-1">
            <div className="text-sm font-medium text-foreground">服务未配置</div>
            <div className="text-xs text-muted-foreground">该服务尚未在系统中配置</div>
          </div>
        </div>
      )}
    </DashboardCard>
  );
}

export function Dashboard() {
  const { toasts, showToast } = useToaster();
  const [trendRange, setTrendRange] = useState<TimeWindowSeconds>(180);
  const [rateRange, setRateRange] = useState<TimeWindowSeconds>(60);
  const [trendAutoScale, setTrendAutoScale] = useState(false);
  const [dashboardSettings, setDashboardSettings] = useState(() => loadDashboardSettings());
  const [resourceHistory, setResourceHistory] = useState<Array<ChartPoint & { timestamp?: unknown }>>(() => dashboardHistoryCache);
  const monitor = useApiPath<any>("/api/v1/monitor/system", [], 3000);
  const resources = useApiPath<any>("/api/v1/monitor/resources", [], 3000);
  const network = useApiPath<any>("/api/v1/monitor/network", [], 3000);
  const historyQuery = useApiPath<any>("/api/v1/monitor/history", [], 30000);
  const servicesQuery = useApiPath<any>("/api/v1/services", [], 3000);

  const system = apiData<any>(monitor.data, {});
  const resource = apiData<any>(resources.data, {});
  const net = apiData<any>(network.data, {});
  const services = apiList<any>(servicesQuery.data, ["services", "data"]);
  const cpuPercent = Number(resource.cpu_percent ?? resource.cpu ?? 0);
  const memoryPercent = Number(resource.memory_percent ?? resource.mem_percent ?? 0);
  const downloadSpeed = Number(net.download_speed ?? 0);
  const uploadSpeed = Number(net.upload_speed ?? 0);
  const connectionCount = Number(net.connections ?? net.connection_count ?? 0);
  const isVisible = (key: DashboardComponentKey) => dashboardSettings.visible[key] !== false;
  const compact = dashboardSettings.compact;

  useEffect(() => {
    const syncSettings = () => setDashboardSettings(loadDashboardSettings());
    window.addEventListener(DASHBOARD_SETTINGS_EVENT, syncSettings);
    window.addEventListener("storage", syncSettings);
    return () => {
      window.removeEventListener(DASHBOARD_SETTINGS_EVENT, syncSettings);
      window.removeEventListener("storage", syncSettings);
    };
  }, []);

  useEffect(() => {
    const nextSamples = apiList<any>(historyQuery.data, ["data", "history", "items"]).map(normalizeMonitorPoint);
    if (nextSamples.length === 0) return;
    setResourceHistory((prev) => {
      const next = mergeFrozenTimePoints(prev, nextSamples, HISTORY_RETENTION_SECONDS);
      dashboardHistoryCache = next;
      return next;
    });
  }, [historyQuery.data]);

  useEffect(() => {
    let stopped = false;
    let controller: AbortController | null = null;
    const receive = (payload: string) => {
      try {
        const point = normalizeMonitorPoint(JSON.parse(payload));
        setResourceHistory((previous) => {
          const next = mergeFrozenTimePoints(previous, [point], HISTORY_RETENTION_SECONDS);
          dashboardHistoryCache = next;
          return next;
        });
      } catch {
        // Ignore malformed/partial events; the next complete monitor event will replace them.
      }
    };

    const connect = async () => {
      while (!stopped) {
        controller = new AbortController();
        try {
          const token = getToken();
          const response = await fetch("/api/v1/events/monitor", {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            signal: controller.signal,
          });
          if (!response.ok || !response.body) throw new Error(`monitor stream ${response.status}`);
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          while (!stopped) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
            let boundary = buffer.indexOf("\n\n");
            while (boundary >= 0) {
              const block = buffer.slice(0, boundary);
              buffer = buffer.slice(boundary + 2);
              const eventName = block.split("\n").find((line) => line.startsWith("event:"))?.slice(6).trim();
              const data = block.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart()).join("\n");
              if ((!eventName || eventName === "monitor") && data) receive(data);
              boundary = buffer.indexOf("\n\n");
            }
          }
        } catch (error) {
          if (stopped || (error instanceof DOMException && error.name === "AbortError")) return;
        }
        if (!stopped) await new Promise((resolve) => window.setTimeout(resolve, 1000));
      }
    };
    void connect();
    return () => {
      stopped = true;
      controller?.abort();
    };
  }, []);

  const visibleResourceHistory = useMemo(
    () => withinTimeWindow(resourceHistory, trendRange),
    [resourceHistory, trendRange]
  );
  const visibleRateHistory = useMemo(
    () => withinTimeWindow(resourceHistory, rateRange),
    [resourceHistory, rateRange]
  );
  const trendScaleMax = trendAutoScale
    ? autoPercentScale(visibleResourceHistory, cpuPercent, memoryPercent)
    : 100;

  const rows = {
    device: [
      { label: "主机名", value: String(system.hostname || "-") },
      { label: "系统平台", value: String(system.platform || `${system.os || "-"} / ${system.arch || "-"}`) },
      { label: "运行时间", value: formatUptime(system.uptime_seconds ?? system.uptime) },
      { label: "数据目录", value: String(system.data_dir || "-") },
    ],
    hardware: [
      { label: "CPU", value: String(resource.cpu_model || resource.hardware?.cpu_model || "-") },
      { label: "核心数", value: String(resource.cores || resource.cpu_cores || "-") },
      { label: "内存", value: formatBytes(resource.memory_total || resource.mem_total) },
      { label: "硬盘容量", value: formatBytes(resource.disk_total) },
    ],
    stats: [
      { label: "CPU 使用率", value: formatPercent(resource.cpu_percent ?? resource.cpu) },
      { label: "内存使用率", value: formatPercent(resource.memory_percent ?? resource.mem_percent) },
      { label: "总上传流量", value: formatBytes(net.total_upload ?? net.upload_total) },
      { label: "总下载流量", value: formatBytes(net.total_download ?? net.download_total) },
    ],
  };

  return (
    <div className={compact ? "grid grid-cols-1 lg:grid-cols-12 gap-3" : "grid grid-cols-1 lg:grid-cols-12 gap-4"}>
      <ToastStack toasts={toasts} />
      {isVisible("device") && <div className="lg:col-span-3">
        <DashboardCard title="设备信息" icon={Monitor} compact={compact}>
          <div className="space-y-2">{rows.device.map((row) => <InfoLine key={row.label} {...row} />)}</div>
        </DashboardCard>
      </div>}
      {isVisible("hardware") && <div className="lg:col-span-3">
        <DashboardCard title="硬件信息" icon={Cpu} compact={compact}>
          <div className="space-y-2">
            {rows.hardware.map((row) => <InfoLine key={row.label} {...row} />)}
            <SolidPlate tone="regular" className="px-3 py-2.5">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm text-muted-foreground">硬盘使用率</span>
                <span className="text-sm font-medium">{formatPercent(resource.disk_percent)}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted/50 overflow-hidden">
                <div className="h-2 rounded-full bg-gradient-to-r from-primary to-primary/70" style={{ width: `${Math.min(Number(resource.disk_percent || 0), 100)}%` }} />
              </div>
            </SolidPlate>
          </div>
        </DashboardCard>
      </div>}
      {isVisible("resources") && <div className="lg:col-span-6">
        <DashboardCard
          title="资源使用趋势"
          icon={TrendingUp}
          compact={compact}
          headerRight={
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">CPU <span className="font-semibold text-primary">{formatPercent(resource.cpu_percent ?? resource.cpu)}</span></span>
              <span className="text-muted-foreground">内存 <span className="font-semibold" style={{ color: MEM_COLOR }}>{formatPercent(resource.memory_percent ?? resource.mem_percent)}</span></span>
            </div>
          }
        >
          <div className="flex flex-col h-full">
            <div className="flex min-h-[150px] flex-1 gap-2 overflow-hidden px-1 py-3">
              <div className="flex flex-col justify-between text-[10px] text-muted-foreground py-1">
                <span>{trendScaleMax}%</span><span>{Math.round(trendScaleMax / 2)}%</span><span>0%</span>
              </div>
              <div className="flex-1"><TrendChart points={visibleResourceHistory} cpuPercent={cpuPercent} memoryPercent={memoryPercent} scaleMax={trendScaleMax} windowSeconds={trendRange} /></div>
            </div>
            <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <LegendDot color={CPU_COLOR} label="CPU" icon={Cpu} />
                <LegendDot color={MEM_COLOR} label="内存" icon={MemoryStick} />
              </div>
              <div className="flex items-center gap-1 overflow-x-auto">
                <TimeWindowSelector value={trendRange} onChange={setTrendRange} />
                <button
                  type="button"
                  onClick={() => setTrendAutoScale((value) => !value)}
                  aria-pressed={trendAutoScale}
                  title={`动态缩放: ${trendScaleMax}%`}
                  className={scaleButtonClass(trendAutoScale)}
                >
                  {trendScaleMax}%
                </button>
              </div>
            </div>
          </div>
        </DashboardCard>
      </div>}
      {isVisible("rate") && <div className="lg:col-span-6">
        <DashboardCard
          title="实时速率"
          icon={Activity}
          compact={compact}
          headerRight={
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">连接数 <span className="font-semibold text-foreground">{String(connectionCount)}</span></span>
              <span className="text-muted-foreground">下载 <span className="font-semibold" style={{ color: CPU_COLOR }}>{formatBytes(net.download_speed)}/s</span></span>
              <span className="text-muted-foreground">上传 <span className="font-semibold" style={{ color: UP_COLOR }}>{formatBytes(net.upload_speed)}/s</span></span>
            </div>
          }
        >
          <div className="flex flex-col h-full">
            <div className="flex min-h-[200px] flex-1 gap-2 overflow-hidden px-1 py-3">
              <div className="flex flex-col justify-between text-[10px] text-muted-foreground py-1">
                <span>512K</span><span>256K</span><span>0</span>
              </div>
              <div className="flex-1"><RateChart points={visibleRateHistory} downloadSpeed={downloadSpeed} uploadSpeed={uploadSpeed} connections={connectionCount} windowSeconds={rateRange} /></div>
            </div>
            <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <LegendDot color={CONN_COLOR} label="连接数" />
                <LegendDot color={UP_COLOR} label="上传速度" />
                <LegendDot color={CPU_COLOR} label="下载速度" />
              </div>
              <TimeWindowSelector value={rateRange} onChange={setRateRange} />
            </div>
          </div>
        </DashboardCard>
      </div>}
      {isVisible("stats") && <div className="lg:col-span-6">
        <DashboardCard title="统计信息" icon={Activity} compact={compact}>
          <div className="space-y-2">
            {rows.stats.map((row) => (
              <SolidPlate key={row.label} tone="regular" className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                  <span className="text-sm font-medium">{row.value}</span>
                </div>
              </SolidPlate>
            ))}
          </div>
        </DashboardCard>
      </div>}
      {services.filter((service) => {
        const key = serviceKey(service);
        if (key.includes("mosdns")) return isVisible("mosdns");
        if (key.includes("mihomo")) return isVisible("mihomo");
        if (key.includes("sing")) return isVisible("singbox");
        return true;
      }).map((service) => (
        <div key={serviceKey(service)} className="lg:col-span-4">
          <ServiceCard service={service} onMessage={showToast} onReload={() => void servicesQuery.reload()} compact={compact} />
        </div>
      ))}
    </div>
  );
}
