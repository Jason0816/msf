import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Boxes,
  ChartNoAxesCombined,
  CircleGauge,
  Cpu,
  Database,
  Gauge,
  Globe2,
  Info,
  Layers3,
  MemoryStick,
  Network,
  Route,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  Timer,
  TrendingUp,
  Waypoints,
  Zap,
} from "lucide-react";
import type { DashboardWidgetCategory, DashboardWidgetType } from "@/lib/dashboard-settings";

export type DashboardWidgetSize = "xs" | "s" | "m" | "l";

export interface WidgetDefinition {
  type: DashboardWidgetType;
  label: string;
  description: string;
  category: DashboardWidgetCategory;
  icon: LucideIcon;
  defaultSize: DashboardWidgetSize;
  minSize: DashboardWidgetSize;
  defaultHeight: number;
  minHeight: number;
  allowMultiple?: boolean;
}

export const widgetCategoryLabels: Record<DashboardWidgetCategory, string> = {
  system: "系统",
  mosdns: "MosDNS",
  mihomo: "Mihomo",
};

export const sizeColumns: Record<DashboardWidgetSize, number> = { xs: 3, s: 4, m: 6, l: 12 };

export const widgetRegistry: readonly WidgetDefinition[] = [
  { type: "system-info", label: "信息集合", description: "设备、硬件与统计信息", category: "system", icon: Info, defaultSize: "m", minSize: "s", defaultHeight: 5, minHeight: 4 },
  { type: "system-resources", label: "资源使用趋势", description: "CPU 与内存历史趋势", category: "system", icon: TrendingUp, defaultSize: "m", minSize: "s", defaultHeight: 5, minHeight: 4 },
  { type: "system-rate", label: "主机实时速率", description: "上传、下载与连接数", category: "system", icon: Activity, defaultSize: "m", minSize: "s", defaultHeight: 6, minHeight: 5 },
  { type: "singbox-service", label: "Sing-Box 服务", description: "服务状态与控制", category: "system", icon: Boxes, defaultSize: "s", minSize: "s", defaultHeight: 5, minHeight: 4 },

  { type: "mosdns-service", label: "MosDNS 服务", description: "服务状态与控制", category: "mosdns", icon: Server, defaultSize: "s", minSize: "s", defaultHeight: 5, minHeight: 4 },
  { type: "mosdns-query", label: "查询趋势", description: "查询数与耗时趋势", category: "mosdns", icon: ChartNoAxesCombined, defaultSize: "m", minSize: "s", defaultHeight: 6, minHeight: 5 },
  { type: "mosdns-info", label: "信息集合", description: "分流与查询排行", category: "mosdns", icon: Layers3, defaultSize: "m", minSize: "s", defaultHeight: 6, minHeight: 5 },
  { type: "mosdns-cache-stats", label: "缓存统计", description: "四类缓存命中统计", category: "mosdns", icon: Database, defaultSize: "s", minSize: "xs", defaultHeight: 5, minHeight: 4 },
  { type: "mosdns-runtime", label: "运行指标", description: "运行时、内存与系统指标", category: "mosdns", icon: MemoryStick, defaultSize: "m", minSize: "s", defaultHeight: 6, minHeight: 5 },
  { type: "mosdns-resolution-policy", label: "解析策略层", description: "安全模式与 IP 优先级", category: "mosdns", icon: ShieldCheck, defaultSize: "m", minSize: "s", defaultHeight: 6, minHeight: 5 },
  { type: "mosdns-cache-system", label: "缓存系统", description: "缓存策略、任务与操作", category: "mosdns", icon: SlidersHorizontal, defaultSize: "l", minSize: "m", defaultHeight: 9, minHeight: 7 },

  { type: "mihomo-service", label: "Mihomo 服务", description: "服务状态与控制", category: "mihomo", icon: Zap, defaultSize: "s", minSize: "s", defaultHeight: 5, minHeight: 4 },
  { type: "mihomo-traffic", label: "实时连接图", description: "上传、下载与连接数", category: "mihomo", icon: Gauge, defaultSize: "m", minSize: "s", defaultHeight: 6, minHeight: 5 },
  { type: "mihomo-latency", label: "延迟测试", description: "百度与 Google 十轮测速", category: "mihomo", icon: Timer, defaultSize: "s", minSize: "s", defaultHeight: 5, minHeight: 4 },
  { type: "mihomo-globe", label: "全球连接", description: "3D 地球连接视图", category: "mihomo", icon: Globe2, defaultSize: "l", minSize: "m", defaultHeight: 9, minHeight: 7 },
  { type: "mihomo-topology", label: "连接拓扑", description: "规则与节点链路", category: "mihomo", icon: Waypoints, defaultSize: "l", minSize: "m", defaultHeight: 9, minHeight: 7 },
  { type: "mihomo-provider-traffic", label: "订阅流量统计", description: "Provider 使用情况", category: "mihomo", icon: CircleGauge, defaultSize: "m", minSize: "s", defaultHeight: 6, minHeight: 5 },
  { type: "mihomo-connection-stats", label: "连接统计", description: "连接聚合与历史", category: "mihomo", icon: Network, defaultSize: "l", minSize: "m", defaultHeight: 8, minHeight: 6 },
  { type: "mihomo-rule-hits", label: "规则命中统计", description: "规则命中次数与动态排行", category: "mihomo", icon: Route, defaultSize: "m", minSize: "s", defaultHeight: 6, minHeight: 5 },
  { type: "mihomo-proxy-group", label: "自定义策略组控制", description: "添加可独立配置的策略组", category: "mihomo", icon: Cpu, defaultSize: "m", minSize: "s", defaultHeight: 6, minHeight: 5, allowMultiple: true },
] as const;

const registryByType = new Map(widgetRegistry.map((definition) => [definition.type, definition]));

export function getWidgetDefinition(type: DashboardWidgetType): WidgetDefinition {
  return registryByType.get(type) ?? widgetRegistry[0];
}

export function getAllowedWidths(definition: WidgetDefinition) {
  const minimum = sizeColumns[definition.minSize];
  return [3, 4, 6, 12].filter((width) => width >= minimum);
}
