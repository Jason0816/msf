import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { GlassSurface } from "./GlassSurface";

export interface GlassSegmentedOption<T extends string> {
  id: T;
  label: ReactNode;
}

export function GlassSegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className,
  ariaLabel,
}: {
  value: T;
  options: Array<GlassSegmentedOption<T>>;
  onChange: (value: T) => void;
  className?: string;
  ariaLabel: string;
}) {
  return (
    <GlassSurface material="regular" flat className={cn("gary-segmented", className)} role="tablist" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={value === option.id}
          onClick={() => onChange(option.id)}
          className={cn("gary-segmented__item px-4 py-2 text-sm font-medium", value === option.id && "gary-segmented__item--active")}
        >
          {option.label}
        </button>
      ))}
    </GlassSurface>
  );
}
