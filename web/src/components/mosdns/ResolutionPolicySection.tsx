"use client";

import type { RunMode, ResolutionSettings } from "@/lib/mosdns-system-data";
import { GlassSegmentedControl } from "@/components/liquid-glass/GlassSegmentedControl";
import { GlassSurface } from "@/components/liquid-glass/GlassSurface";
import { SolidPlate } from "@/components/liquid-glass/SolidPlate";
import { cn } from "@/lib/utils";

interface ResolutionPolicySectionProps {
  runMode: RunMode;
  onChangeRunMode: (mode: RunMode) => void;
  resolutionSettings: ResolutionSettings;
  onChangePriority: (priority: "auto" | "ipv4" | "ipv6") => void;
  prioritySaving?: boolean;
}

export function ResolutionPolicySection({
  runMode,
  onChangeRunMode,
  resolutionSettings,
  onChangePriority,
  prioritySaving = false,
}: ResolutionPolicySectionProps) {
  const priority = resolutionSettings.ipv4First ? "ipv4" : resolutionSettings.ipv6First ? "ipv6" : "auto";
  return (
    <GlassSurface material="thick" className="rounded-2xl">
      <div className="flex flex-col space-y-1.5 p-5 pb-3 sm:p-6 sm:pb-3">
        <div className="flex items-center gap-2">
          <SolidPlate tone="subtle" className="flex h-8 w-8 items-center justify-center rounded-lg text-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          </SolidPlate>
          <h3 className="text-base font-semibold tracking-tight">解析策略层</h3>
        </div>
        <p className="text-xs text-muted-foreground">决定如何解析域名</p>
      </div>
      <div className="space-y-3 p-5 pt-0 sm:p-6 sm:pt-0">
        {/* Run mode pills */}
        <SolidPlate tone="subtle" className="flex flex-col gap-3 rounded-xl p-3 sm:flex-row sm:items-start sm:gap-4">
          <div className="flex gap-2 sm:mt-2 sm:shrink-0">
            <span className="text-lg leading-none">🎯</span>
            <span className="text-sm font-medium text-foreground whitespace-nowrap">运行模式</span>
          </div>
          <div className="flex-1 space-y-2">
            <GlassSegmentedControl
              value={runMode}
              options={[
                { id: "compatible", label: "🌐 兼容模式" },
                { id: "safe", label: "🛡️ 安全模式" },
              ]}
              onChange={onChangeRunMode}
              ariaLabel="运行模式"
              className="grid w-full grid-cols-2"
            />
            <p className="text-xs text-muted-foreground">兼容/安全模式切换</p>
          </div>
        </SolidPlate>

        {/* Protocol priority */}
        <SolidPlate tone="subtle" className="flex flex-col gap-3 rounded-xl p-3 sm:flex-row sm:items-start sm:gap-4">
          <div className="flex gap-2 sm:mt-2 sm:shrink-0">
            <span className="text-lg leading-none">🔀</span>
            <span className="text-sm font-medium text-foreground whitespace-nowrap">协议优先级</span>
          </div>
          <div className="flex-1 space-y-2">
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="协议优先级">
              {([
                ["auto", "自动"],
                ["ipv4", "IPv4 优先"],
                ["ipv6", "IPv6 优先"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={priority === value}
                  disabled={prioritySaving}
                  onClick={() => onChangePriority(value)}
                  className={cn(
                    "rounded-xl px-3 py-3 text-sm transition-[background-color,box-shadow,color] disabled:cursor-wait disabled:opacity-60",
                    priority === value ? "bg-background/75 text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/45 hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-2 space-y-1 rounded-xl bg-foreground/[0.035] p-3 text-xs leading-relaxed text-muted-foreground">
              <p>自动：同时保留上游实际存在的 A 与 AAAA。</p>
              <p>IPv4 优先：双栈域名存在 A 时抑制 AAAA，v6-only 域名仍返回 AAAA。</p>
              <p>IPv6 优先：双栈域名存在 AAAA 时抑制 A，v4-only 域名仍返回 A。</p>
              <p>该策略直接在主分流序列内执行，不会通过 localhost 二次转发。</p>
            </div>
          </div>
        </SolidPlate>
      </div>
    </GlassSurface>
  );
}
