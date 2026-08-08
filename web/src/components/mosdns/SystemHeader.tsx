"use client";

import { Save, Globe } from "lucide-react";
import { GlassButton } from "@/components/liquid-glass/GlassButton";
import { GlassSurface } from "@/components/liquid-glass/GlassSurface";
import { SolidPlate } from "@/components/liquid-glass/SolidPlate";

interface SystemHeaderProps {
  onSave: () => void;
  saving?: boolean;
}

export function SystemHeader({ onSave, saving = false }: SystemHeaderProps) {
  return (
    <GlassSurface material="thick" className="rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <SolidPlate tone="subtle" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <Globe className="h-5 w-5 text-primary" />
          </SolidPlate>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">系统控制</h1>
            <p className="text-xs text-muted-foreground">上游配置、过滤策略与缓存管理</p>
          </div>
        </div>
        <GlassButton
          variant="primary"
          onClick={onSave}
          disabled={saving}
          className="shrink-0 text-sm disabled:cursor-wait disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          <span className="hidden sm:inline">{saving ? "保存中..." : "保存并重启"}</span>
          <span className="sm:hidden">{saving ? "保存中" : "保存"}</span>
        </GlassButton>
      </div>
    </GlassSurface>
  );
}
