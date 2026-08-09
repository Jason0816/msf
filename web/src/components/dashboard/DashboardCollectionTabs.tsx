"use client";

import { useState, type ReactNode } from "react";
import { Check, SlidersHorizontal } from "lucide-react";
import { GlassSegmentedControl } from "@/components/liquid-glass/GlassSegmentedControl";
import { SolidPlate } from "@/components/liquid-glass/SolidPlate";
import { cn } from "@/lib/utils";

export type DashboardCollectionOption<T extends string> = { id: T; label: ReactNode; pickerLabel?: string };

export function DashboardCollectionTabs<T extends string>({
  options,
  selected,
  active,
  onSelectedChange,
  onActiveChange,
  ariaLabel,
}: {
  options: readonly DashboardCollectionOption<T>[];
  selected: readonly T[];
  active: T;
  onSelectedChange?: (pages: T[]) => void;
  onActiveChange: (page: T) => void;
  ariaLabel: string;
}) {
  const [configuring, setConfiguring] = useState(false);
  const visible = options.filter((option) => selected.includes(option.id));
  const toggle = (id: T) => {
    if (!onSelectedChange) return;
    const next = selected.includes(id) ? selected.filter((page) => page !== id) : options.filter((option) => selected.includes(option.id) || option.id === id).map((option) => option.id);
    if (!next.length) return;
    onSelectedChange(next);
    if (!next.includes(active)) onActiveChange(next[0]);
  };

  return (
    <div className="space-y-2">
      <div className="flex min-w-0 items-center gap-2">
        {visible.length > 1 ? (
          <GlassSegmentedControl value={active} onChange={onActiveChange} options={visible.map(({ id, label }) => ({ id, label }))} ariaLabel={ariaLabel} className="grid min-w-0 flex-1" style={{ gridTemplateColumns: `repeat(${visible.length}, minmax(0, 1fr))` }} />
        ) : (
          <SolidPlate tone="subtle" className="min-w-0 flex-1 px-3 py-2 text-xs font-medium">{visible[0]?.label}</SolidPlate>
        )}
        {onSelectedChange ? (
          <button type="button" onClick={() => setConfiguring((value) => !value)} aria-expanded={configuring} aria-label="选择集合内容" className={cn("gary-icon-button h-9 w-9 shrink-0 rounded-xl", configuring && "text-primary")}>
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {configuring ? (
        <SolidPlate tone="subtle" className="flex flex-wrap gap-1.5 p-2" role="group" aria-label={`${ariaLabel}内容`}>
          {options.map((option) => {
            const enabled = selected.includes(option.id);
            return <button key={option.id} type="button" aria-pressed={enabled} onClick={() => toggle(option.id)} className={cn("inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] transition-[background-color,color]", enabled ? "bg-primary/12 text-primary" : "bg-foreground/[.035] text-muted-foreground hover:text-foreground")}><Check className={cn("h-3 w-3", !enabled && "opacity-0")} />{option.pickerLabel ?? option.label}</button>;
          })}
        </SolidPlate>
      ) : null}
    </div>
  );
}
