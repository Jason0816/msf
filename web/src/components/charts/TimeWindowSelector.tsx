"use client";

import { GlassSurface } from "@/components/liquid-glass/GlassSurface";
import { TIME_WINDOW_OPTIONS, type TimeWindowSeconds } from "./timeSeries";

export function TimeWindowSelector({
  value,
  onChange,
  compact = false,
}: {
  value: TimeWindowSeconds;
  onChange: (value: TimeWindowSeconds) => void;
  compact?: boolean;
}) {
  return (
    <GlassSurface material="regular" flat className={`gary-segmented flex shrink-0 items-center overflow-x-auto ${compact ? "gap-0.5 p-0.5" : "gap-1 p-1"}`}>
      {TIME_WINDOW_OPTIONS.map((seconds) => (
        <button
          type="button"
          key={seconds}
          onClick={() => onChange(seconds)}
          aria-pressed={seconds === value}
          title={`观察最近 ${seconds} 秒`}
          className={
            `gary-segmented__item flex-shrink-0 font-medium ${compact ? "px-1.5 py-1 text-[9px]" : "px-2.5 py-1.5 text-[10px]"} ` +
            (seconds === value ? "gary-segmented__item--active text-primary" : "text-muted-foreground")
          }
        >
          {seconds}s
        </button>
      ))}
    </GlassSurface>
  );
}
