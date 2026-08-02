import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { GlassSurface } from "@/components/liquid-glass/GlassSurface";

export function SectionSurface({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <GlassSurface material="thick" className={cn("p-5 md:p-6", className)} {...props} />;
}
