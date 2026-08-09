"use client";

import { useState } from "react";
import { GlassSegmentedControl } from "@/components/liquid-glass/GlassSegmentedControl";
import { useMosdnsDashboardData } from "../../data";
import { normalizeMosdnsInfo, type MosdnsInfoPage, type MosdnsWidgetSize } from "./model";

const pages = [{ id: "split", label: "分流" }, { id: "domains", label: "域名" }, { id: "slowest", label: "最慢" }, { id: "clients", label: "客户端" }] as const;
export function MosdnsInfoWidget({ activePage, onActivePageChange, size = "m" }: { activePage?: MosdnsInfoPage; onActivePageChange?: (page: MosdnsInfoPage) => void; size?: MosdnsWidgetSize }) {
  const { overview, queryEntries } = useMosdnsDashboardData(["overview", "query"]);
  const [internal, setInternal] = useState<MosdnsInfoPage>("split");
  const page = activePage ?? internal;
  const setPage = (next: MosdnsInfoPage) => { if (activePage === undefined) setInternal(next); onActivePageChange?.(next); };
  const data = normalizeMosdnsInfo(overview, queryEntries);
  const rows = data[page];
  return <div className="flex h-full min-h-0 flex-col gap-3"><GlassSegmentedControl value={page} onChange={setPage} options={pages.map((item) => ({ ...item }))} ariaLabel="MosDNS 信息页面" className="grid w-full grid-cols-4" /><div className="min-h-0 flex-1 overflow-y-auto rounded-xl bg-foreground/[.025]">{rows.length ? rows.map((row, index) => <div key={`${row.name}-${index}`} className="border-b border-border/35 px-3 py-2.5 last:border-0"><div className="flex items-center gap-2 text-xs"><span className="w-5 text-center text-muted-foreground">{index + 1}</span><span className="min-w-0 flex-1 truncate" title={row.name}>{row.name}</span><b className={("danger" in row && row.danger) ? "text-red-500" : "text-muted-foreground"}>{row.value}</b></div><div className="ml-7 mt-1.5 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, row.percent)}%` }} /></div></div>) : <div className="grid h-full min-h-28 place-items-center text-xs text-muted-foreground">暂无数据</div>}</div>{size === "s" ? <p className="text-[10px] text-muted-foreground">共 {data.total.toLocaleString()} 次查询</p> : null}</div>;
}
