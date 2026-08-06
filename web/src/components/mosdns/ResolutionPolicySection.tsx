"use client";

import type { RunMode, ResolutionSettings } from "@/lib/mosdns-system-data";
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
    <div className="rounded-[12px] border bg-card text-card-foreground !border-border/20 !shadow-none transition-shadow duration-300 hover:!shadow-sm border-blue-200/40 shadow-sm">
      <div className="flex flex-col space-y-1.5 p-6 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="oklch(0.6 0.21 235)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          </div>
          <h3 className="text-base font-semibold tracking-tight">解析策略层</h3>
        </div>
        <p className="text-xs text-muted-foreground">决定如何解析域名</p>
      </div>
      <div className="p-6 pt-0 space-y-4">
        {/* Run mode pills */}
        <div className="flex items-start gap-4">
          <div className="flex gap-2 mt-1 shrink-0">
            <span className="text-lg leading-none">🎯</span>
            <span className="text-sm font-medium text-foreground whitespace-nowrap">运行模式</span>
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <button
                onClick={() => onChangeRunMode("compatible")}
                className={cn(
                  "flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-all",
                  runMode === "compatible"
                    ? "bg-blue-500 text-white shadow-md cursor-default"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:opacity-90"
                )}
              >
                🌐 兼容模式
              </button>
              <button
                onClick={() => onChangeRunMode("safe")}
                className={cn(
                  "flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-all",
                  runMode === "safe"
                    ? "bg-blue-500 text-white shadow-md cursor-default"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:opacity-90"
                )}
              >
                🛡️ 安全模式
              </button>
            </div>
            <p className="text-xs text-muted-foreground">兼容/安全模式切换</p>
          </div>
        </div>

        {/* Protocol priority */}
        <div className="flex items-start gap-4 pt-2 border-t border-border/20">
          <div className="flex gap-2 mt-1 shrink-0">
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
                    "rounded-lg border px-3 py-3 text-sm transition-colors disabled:cursor-wait disabled:opacity-60",
                    priority === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted/30 text-foreground hover:bg-muted"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-2 space-y-1 rounded border border-foreground bg-muted/50 p-2 text-xs text-muted-foreground">
              <p>自动：同时保留上游实际存在的 A 与 AAAA。</p>
              <p>IPv4 优先：双栈域名存在 A 时抑制 AAAA，v6-only 域名仍返回 AAAA。</p>
              <p>IPv6 优先：双栈域名存在 AAAA 时抑制 A，v4-only 域名仍返回 A。</p>
              <p>该策略直接在主分流序列内执行，不会通过 localhost 二次转发。</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
