"use client";

import { GlassSurface } from "@/components/liquid-glass/GlassSurface";
import { TIME_WINDOW_OPTIONS, type TimeWindowSeconds } from "./timeSeries";

export function TimeWindowSelector({
  value,
  onChange,
}: {
  value: TimeWindowSeconds;
  onChange: (value: TimeWindowSeconds) => void;
}) {
  return (
    <GlassSurface material="regular" flat className="gary-segmented flex items-center gap-1 overflow-x-auto p-1">
      {TIME_WINDOW_OPTIONS.map((seconds) => (
        <button
          type="button"
          key={seconds}
          onClick={() => onChange(seconds)}
          aria-pressed={seconds === value}
          title={`观察最近 ${seconds} 秒`}
          className={
            "gary-segmented__item flex-shrink-0 px-2.5 py-1.5 text-[10px] font-medium " +
            (seconds === value ? "gary-segmented__item--active text-primary" : "text-muted-foreground")
          }
        >
          {seconds}s
        </button>
      ))}
    </GlassSurface>
  );
}
