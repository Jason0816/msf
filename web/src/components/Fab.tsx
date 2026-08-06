"use client";

import { useState } from "react";
import { Eye, EyeOff, Maximize2, SlidersHorizontal, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import {
  dashboardComponentOptions,
  defaultDashboardSettings,
  loadDashboardSettings,
  saveDashboardSettings,
  type DashboardSettings,
} from "@/lib/dashboard-settings";
import { cn } from "@/lib/utils";
import { GlassSurface } from "@/components/liquid-glass/GlassSurface";
import { ModalViewport } from "@/components/liquid-glass/ModalViewport";
import { SolidPlate } from "@/components/liquid-glass/SolidPlate";

export function Fab() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<DashboardSettings>(() => loadDashboardSettings());

  if (location.pathname !== "/") return null;

  const updateSettings = (next: DashboardSettings) => {
    setSettings(next);
    saveDashboardSettings(next);
  };

  const toggleComponent = (key: keyof DashboardSettings["visible"]) => {
    updateSettings({
      ...settings,
      visible: {
        ...settings.visible,
        [key]: !settings.visible[key],
      },
    });
  };

  const resetLayout = () => {
    updateSettings({
      compact: defaultDashboardSettings.compact,
      visible: { ...defaultDashboardSettings.visible },
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="打开仪表盘设置"
        className={cn(
          "gary-glass gary-glass--regular gary-glass--no-backdrop gary-icon-button fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-4 z-[60] h-12 w-12 select-none rounded-[18px] text-foreground md:bottom-6 md:right-6 md:h-14 md:w-14",
          open && "rotate-90"
        )}
        title="仪表盘设置"
      >
        <SlidersHorizontal className="h-5 w-5 md:h-6 md:w-6" />
      </button>
      {open && (
        <ModalViewport onClose={() => setOpen(false)}>
          <GlassSurface material="thick" strong className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-[420px] flex-col text-card-foreground" role="dialog" aria-modal="true">
            <div className="flex items-center justify-between border-b border-border/50 px-4 py-4">
              <h2 className="text-base font-semibold">仪表盘设置</h2>
              <button
                type="button"
                aria-label="关闭仪表盘设置"
                onClick={() => setOpen(false)}
                className="gary-icon-button h-8 w-8 rounded-[11px] border-0 bg-transparent text-muted-foreground shadow-none"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto px-4 py-4">
              <section className="space-y-2">
                <h3 className="text-sm font-medium text-foreground">显示模式</h3>
                <SolidPlate className="flex items-center justify-between px-3 py-3">
                  <div className="flex items-center gap-3">
                    <Maximize2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium text-foreground">紧凑模式</div>
                      <div className="text-xs text-muted-foreground">
                        {settings.compact ? "已启用 - 缩小间距" : "已关闭 - 标准间距"}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSettings({ ...settings, compact: !settings.compact })}
                    className={cn(
                      "gary-glass-button rounded-xl px-3 py-1.5 text-xs font-medium",
                      settings.compact && "text-primary"
                    )}
                  >
                    {settings.compact ? "开启" : "关闭"}
                  </button>
                </SolidPlate>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-medium text-foreground">组件显示</h3>
                <div className="space-y-2">
                  {dashboardComponentOptions.map((item) => {
                    const visible = settings.visible[item.key];
                    return (
                      <SolidPlate key={item.key} className="flex items-center justify-between px-3 py-3">
                        <span className="text-sm text-foreground">{item.label}</span>
                        <button
                          type="button"
                          onClick={() => toggleComponent(item.key)}
                          className={cn(
                            "gary-glass-button inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium",
                            visible && "text-primary"
                          )}
                        >
                          {visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          {visible ? "显示" : "隐藏"}
                        </button>
                      </SolidPlate>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-2 border-t border-border/50 pt-4">
                <h3 className="text-sm font-medium text-foreground">布局操作</h3>
                <button
                  type="button"
                  aria-label="重置仪表盘布局"
                  onClick={resetLayout}
                  className="gary-glass-button w-full rounded-xl px-3 py-2.5 text-sm font-medium"
                >
                  重置布局
                </button>
              </section>
            </div>

            <div className="border-t border-border/50 px-4 py-3 text-center text-xs text-muted-foreground">
              拖拽组件标题栏可以调整位置 · 窗口调整时自动优化布局
            </div>
          </GlassSurface>
        </ModalViewport>
      )}
    </>
  );
}
