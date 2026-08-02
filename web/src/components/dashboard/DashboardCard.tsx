import { GripVertical, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassSurface } from "@/components/liquid-glass/GlassSurface";

interface DashboardCardProps {
  title: string;
  icon: LucideIcon;
  className?: string;
  headerRight?: React.ReactNode;
  compact?: boolean;
  children: React.ReactNode;
}

export function DashboardCard({
  title,
  icon: Icon,
  className,
  headerRight,
  compact = false,
  children,
}: DashboardCardProps) {
  return (
    <GlassSurface
      material="thick"
      className={cn(
        "flex h-full flex-col text-card-foreground animate-fade-in",
        className
      )}
    >
      <div className={cn("flex items-center justify-between border-b border-border/35", compact ? "p-3" : "p-4")}>
        <div className="flex items-center gap-2">
          <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab active:cursor-grabbing" />
          <Icon className="h-5 w-5 text-primary" />
          <h3 className={cn("font-semibold", compact && "text-sm")}>{title}</h3>
        </div>
        {headerRight}
      </div>
      <div className={cn("flex-1", compact ? "p-3" : "p-4")}>{children}</div>
    </GlassSurface>
  );
}
