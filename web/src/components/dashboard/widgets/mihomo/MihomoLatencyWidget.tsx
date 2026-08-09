"use client";

import { useRef, useState } from "react";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { SolidPlate } from "@/components/liquid-glass/SolidPlate";
import { runFaviconRounds, type FaviconSample, type FaviconTarget } from "@/components/mihomo/overview/telemetry";
import type { MihomoWidgetSize } from "./MihomoTrafficWidget";

const TARGETS: FaviconTarget[] = [
  { id: "baidu", label: "百度", url: "https://apps.bdimg.com/favicon.ico" },
  { id: "google", label: "Google", url: "https://www.google.com/favicon.ico" },
];
const ROUNDS = 10;

export type LatencyStats = { min: number; avg: number; max: number; successes: number } | null;
export function calculateLatencyStats(samples: FaviconSample[]): LatencyStats {
  const values = samples.filter((sample) => sample.ok && Number.isFinite(sample.elapsedMs)).map((sample) => sample.elapsedMs);
  if (!values.length) return null;
  return { min: Math.min(...values), avg: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length), max: Math.max(...values), successes: values.length };
}

function color(value: number) { return value < 400 ? "bg-emerald-500" : value < 800 ? "bg-amber-500" : "bg-rose-500"; }
function TargetResult({ target, samples }: { target: FaviconTarget; samples: FaviconSample[] }) {
  const own = samples.filter((sample) => sample.targetId === target.id);
  const stats = calculateLatencyStats(own);
  const ceiling = Math.max(1, ...own.filter((sample) => sample.ok).map((sample) => sample.elapsedMs));
  return <SolidPlate tone="regular" className="min-w-0 p-3">
    <div className="flex items-center justify-between"><span className="text-xs font-semibold">{target.label}</span><span className="text-[10px] tabular-nums text-muted-foreground">{own.length}/{ROUNDS}</span></div>
    <div className="mt-3 flex h-14 items-end gap-1">{Array.from({ length: ROUNDS }, (_, index) => { const sample = own[index]; return <i key={index} title={!sample ? "等待测试" : sample.ok ? `${sample.elapsedMs}ms` : "失败"} className={cn("min-w-0 flex-1 rounded-t transition-[height,background-color] duration-300", !sample ? "bg-foreground/10" : sample.ok ? color(sample.elapsedMs) : "bg-rose-500/30")} style={{ height: `${!sample ? 12 : sample.ok ? Math.max(12, sample.elapsedMs / ceiling * 100) : 100}%` }} />; })}</div>
    <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px] tabular-nums text-muted-foreground"><span>min <b className="text-foreground">{stats ? `${stats.min}ms` : "--"}</b></span><span>avg <b className="text-foreground">{stats ? `${stats.avg}ms` : "--"}</b></span><span>max <b className="text-foreground">{stats ? `${stats.max}ms` : "--"}</b></span></div>
  </SolidPlate>;
}

export type MihomoLatencyWidgetProps = { size?: MihomoWidgetSize };
export function MihomoLatencyWidget({ size = "s" }: MihomoLatencyWidgetProps) {
  const [samples, setSamples] = useState<FaviconSample[]>([]);
  const [running, setRunning] = useState(false);
  const runningRef = useRef(false);
  const run = async () => {
    if (runningRef.current) return;
    runningRef.current = true; setRunning(true); setSamples([]);
    try { await runFaviconRounds(TARGETS, ROUNDS, (sample) => setSamples((current) => [...current, sample])); }
    finally { runningRef.current = false; setRunning(false); }
  };
  return <div className="@container flex h-full flex-col gap-3">
    <div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">百度 / Google 各 10 轮</p><button type="button" onClick={() => void run()} disabled={running} className="gary-glass-button gap-1.5 rounded-xl px-3 py-2 text-xs disabled:cursor-wait disabled:opacity-60"><Zap className={cn("h-3.5 w-3.5", running && "animate-pulse")} />{running ? `测试中 ${samples.length}/20` : "开始测试"}</button></div>
    <div className={cn("grid min-h-0 flex-1 gap-2", size === "s" ? "grid-cols-1" : "grid-cols-1 @min-[560px]:grid-cols-2")}>{TARGETS.map((target) => <TargetResult key={target.id} target={target} samples={samples} />)}</div>
  </div>;
}
