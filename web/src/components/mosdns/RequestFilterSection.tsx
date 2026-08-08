"use client";

import type { FilterSettings } from "@/lib/mosdns-system-data";
import { GlassSurface } from "@/components/liquid-glass/GlassSurface";
import { SolidPlate } from "@/components/liquid-glass/SolidPlate";
import { cn } from "@/lib/utils";

interface FilterToggleProps {
  label: string;
  description: string;
  icon: string;
  checked: boolean;
  onToggle: () => void;
  /** Optional tooltip icon */
  tooltip?: string;
}

function FilterToggle({ label, description, icon, checked, onToggle, tooltip }: FilterToggleProps) {
  return (
    <SolidPlate tone="subtle" className="flex items-center justify-between gap-3 rounded-xl p-3">
      <div className="flex items-start gap-3 min-w-0">
        <span className="text-lg leading-none mt-0.5 shrink-0">{icon}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-foreground">{label}</span>
            {tooltip && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <path d="M12 17h.01" />
              </svg>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      {/* Toggle switch with visible border */}
      <button
        role="switch"
        aria-checked={checked}
        onClick={onToggle}
        className={cn(
          "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          checked ? "bg-emerald-500" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform",
            checked ? "translate-x-4" : "translate-x-0.5"
          )}
        />
      </button>
    </SolidPlate>
  );
}

interface RequestFilterSectionProps {
  filterSettings: FilterSettings;
  onToggleAdBlock: () => void;
  onToggleRequestBlock: () => void;
  onToggleTypeBlock: () => void;
  onToggleIpv6Block: () => void;
}

export function RequestFilterSection({
  filterSettings,
  onToggleAdBlock,
  onToggleRequestBlock,
  onToggleTypeBlock,
  onToggleIpv6Block,
}: RequestFilterSectionProps) {
  return (
    <GlassSurface material="thick" className="rounded-2xl">
      <div className="flex flex-col space-y-1.5 p-5 pb-3 sm:p-6 sm:pb-3">
        <div className="flex items-center gap-2">
          <SolidPlate tone="subtle" className="flex h-8 w-8 items-center justify-center rounded-lg text-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </SolidPlate>
          <h3 className="text-base font-semibold tracking-tight">请求过滤层</h3>
        </div>
        <p className="text-xs text-muted-foreground">控制哪些 DNS 请求被处理或拦截</p>
      </div>
      <div className="space-y-2 p-5 pt-0 sm:p-6 sm:pt-0">
        {/* Ad block */}
        <FilterToggle
          icon="📛"
          label="广告屏蔽"
          description="启用 AdGuard 在线规则"
          tooltip="使用 AdGuard 规则过滤广告域名"
          checked={filterSettings.adBlock}
          onToggle={onToggleAdBlock}
        />

        {/* Request type filtering group */}
        <div className="space-y-2 pt-1 sm:pl-4">
          <div className="flex items-center gap-1.5 px-1 pb-1 pt-1 text-xs font-medium text-muted-foreground">
            <span>🚫</span> 请求类型过滤
          </div>
          <FilterToggle
            icon=""
            label="请求屏蔽"
            description="屏蔽无解析结果请求"
            tooltip=""
            checked={filterSettings.requestBlock}
            onToggle={onToggleRequestBlock}
          />
          <FilterToggle
            icon=""
            label="类型屏蔽"
            description="屏蔽 SOA/PTR/HTTPS 请求"
            tooltip=""
            checked={filterSettings.typeBlock}
            onToggle={onToggleTypeBlock}
          />
          <FilterToggle
            icon=""
            label="IPV6 屏蔽"
            description="阻止 AAAA 请求类型"
            tooltip=""
            checked={filterSettings.ipv6Block}
            onToggle={onToggleIpv6Block}
          />
        </div>
      </div>
    </GlassSurface>
  );
}
