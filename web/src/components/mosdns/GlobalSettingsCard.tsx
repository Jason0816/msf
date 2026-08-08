"use client";

import { BarChart3, Globe2, Info } from "lucide-react";
import { GlassButton } from "@/components/liquid-glass/GlassButton";
import { GlassSurface } from "@/components/liquid-glass/GlassSurface";

import type { GlobalSettings } from "@/lib/mosdns-system-data";

interface GlobalSettingsCardProps {
  settings: GlobalSettings;
  onChangeSocks5: (val: string) => void;
  onChangeEcsIp: (val: string) => void;
  onChangeLogCapacity: (val: number) => void;
  onSaveLogCapacity?: () => void;
}

/* ─── SOCKS5 + ECS IP row ─── */
function SettingsInputs({
  settings,
  onChangeSocks5,
  onChangeEcsIp,
}: {
  settings: GlobalSettings;
  onChangeSocks5: (val: string) => void;
  onChangeEcsIp: (val: string) => void;
}) {
  return (
    <GlassSurface material="thick" className="rounded-2xl p-4 sm:p-5">
      <div className="flex gap-3">
        <Globe2 className="mt-0.5 h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">
          全局设置
        </span>
      </div>
      <div className="flex flex-col gap-2 mt-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground w-16 shrink-0">
            SOCKS5
          </label>
          <input
            type="text"
            value={settings.socks5}
            onChange={(e) => onChangeSocks5(e.target.value)}
            className="gary-field h-9 min-w-0 flex-1 px-3 text-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground w-16 shrink-0">
            ECS IP
          </label>
          <input
            type="text"
            value={settings.ecsIp}
            onChange={(e) => onChangeEcsIp(e.target.value)}
            className="gary-field h-9 min-w-0 flex-1 px-3 text-xs"
          />
        </div>
      </div>
    </GlassSurface>
  );
}

/* ─── Log capacity card ─── */
function LogCapacityCard({
  capacity,
  onChange,
  onSave,
}: {
  capacity: number;
  onChange: (val: number) => void;
  onSave?: () => void;
}) {
  return (
    <GlassSurface material="thick" className="rounded-2xl p-4 sm:p-5">
      <div className="flex gap-3">
        <BarChart3 className="mt-0.5 h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">
          日志容量
        </span>
      </div>
      <div className="flex flex-col gap-2 mt-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground shrink-0">
            当前容量
          </label>
          <input
            type="number"
            value={capacity}
            onChange={(e) => onChange(Number(e.target.value))}
            className="gary-field h-9 min-w-0 w-full px-3 text-xs sm:w-36"
          />
          <GlassButton
            variant="primary"
            onClick={onSave}
            className="h-9 min-h-9 text-xs"
          >
            设置
          </GlassButton>
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0" />设置新容量将清空日志（最高40万）
        </p>
      </div>
    </GlassSurface>
  );
}

/** Global settings section — SOCKS5, ECS IP, log capacity in a 2-col grid. */
export function GlobalSettingsCard({
  settings,
  onChangeSocks5,
  onChangeEcsIp,
  onChangeLogCapacity,
  onSaveLogCapacity,
}: GlobalSettingsCardProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <SettingsInputs
        settings={settings}
        onChangeSocks5={onChangeSocks5}
        onChangeEcsIp={onChangeEcsIp}
      />
      <LogCapacityCard
        capacity={settings.logCapacity}
        onChange={onChangeLogCapacity}
        onSave={onSaveLogCapacity}
      />
    </div>
  );
}
