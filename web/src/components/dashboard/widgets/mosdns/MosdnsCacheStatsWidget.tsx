"use client";

import { useState } from "react";
import { GlassSegmentedControl } from "@/components/liquid-glass/GlassSegmentedControl";
import { useMosdnsDashboardData } from "../../data";
import { normalizeMosdnsCaches, type MosdnsCachePage, type MosdnsWidgetSize } from "./model";

const options = [{ id: "all", label: "全部" }, { id: "domestic", label: "国内" }, { id: "foreign", label: "国外" }, { id: "node", label: "节点" }] as const;
export function MosdnsCacheStatsWidget({ activePage, onActivePageChange, size = "s" }: { activePage?: MosdnsCachePage; onActivePageChange?: (page: MosdnsCachePage) => void; size?: MosdnsWidgetSize }) {
  const { overview } = useMosdnsDashboardData(["overview"]);
  const [internal, setInternal] = useState<MosdnsCachePage>("all"); const page = activePage ?? internal;
  const setPage = (next: MosdnsCachePage) => { if (activePage === undefined) setInternal(next); onActivePageChange?.(next); };
  const card = normalizeMosdnsCaches(overview)[page];
  const rows = [["请求", card.total], ["命中", card.hits], ["过期命中", card.staleHits], ["命中率", `${card.hitRate.toFixed(2)}%`], ["过期命中率", `${card.staleRate.toFixed(2)}%`], ["条目", card.entries]];
  return <div className="flex h-full min-h-0 flex-col gap-3"><GlassSegmentedControl value={page} onChange={setPage} options={options.map((item) => ({ ...item }))} ariaLabel="缓存类型" className="grid w-full grid-cols-4 text-[10px]" /><div className={`grid gap-2 ${size === "xs" ? "grid-cols-2" : "grid-cols-2 @container @min-[420px]:grid-cols-3"}`}>{rows.map(([label, value]) => <div key={label} className="rounded-xl bg-foreground/[.035] p-2.5"><p className="text-[10px] text-muted-foreground">{label}</p><p className="mt-1 truncate text-sm font-semibold tabular-nums">{typeof value === "number" ? value.toLocaleString() : value}</p></div>)}</div><div className="mt-auto space-y-2"><div className="flex justify-between text-[10px] text-muted-foreground"><span>命中分布</span><span>{card.hitRate.toFixed(1)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-sky-500" style={{ width: `${card.hitRate}%` }} /></div></div></div>;
}
