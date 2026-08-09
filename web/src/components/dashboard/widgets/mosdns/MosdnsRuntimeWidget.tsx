"use client";

import { useState } from "react";
import { GlassSegmentedControl } from "@/components/liquid-glass/GlassSegmentedControl";
import { useMosdnsDashboardData } from "../../data";
import { normalizeMosdnsRuntime, type MosdnsRuntimePage, type MosdnsWidgetSize } from "./model";

const options = [{ id: "overview", label: "概览" }, { id: "memory", label: "内存" }, { id: "system", label: "系统" }] as const;
function Tiles({ rows }: { rows: Array<{ label: string; value: string; sub: string }> }) { return <div className="grid grid-cols-2 gap-2">{rows.map((row) => <div key={row.label} className="rounded-xl bg-foreground/[.035] p-3"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{row.label}</p><p className="mt-1 truncate text-base font-semibold tabular-nums">{row.value}</p><p className="mt-0.5 truncate text-[10px] text-muted-foreground">{row.sub}</p></div>)}</div>; }
export function MosdnsRuntimeWidget({ activePage, onActivePageChange, size = "m" }: { activePage?: MosdnsRuntimePage; onActivePageChange?: (page: MosdnsRuntimePage) => void; size?: MosdnsWidgetSize }) {
  const { overview } = useMosdnsDashboardData(["overview"]); const [internal, setInternal] = useState<MosdnsRuntimePage>("overview"); const page = activePage ?? internal; const data = normalizeMosdnsRuntime(overview);
  const setPage = (next: MosdnsRuntimePage) => { if (activePage === undefined) setInternal(next); onActivePageChange?.(next); };
  if (size === "s") return <div className="flex h-full min-h-0 flex-col gap-3"><GlassSegmentedControl value={page} onChange={setPage} options={options.map((item) => ({ ...item }))} ariaLabel="运行指标页面" className="grid w-full grid-cols-3" /><div className="min-h-0 flex-1 overflow-y-auto"><Tiles rows={data[page]} /></div></div>;
  return <div className="h-full min-h-0 overflow-y-auto"><Tiles rows={[...data.overview, ...data.memory, ...data.system]} /></div>;
}
