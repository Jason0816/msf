import { Check, Pencil, RotateCcw, Undo2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DASHBOARD_MAX_WIDGETS, type DashboardSettings } from "@/lib/dashboard-settings";
import { addDashboardWidget, removeDashboardWidget } from "./layout/dashboardLayout";
import { widgetCategoryLabels, widgetRegistry } from "./widgetRegistry";

export function DashboardWidgetPicker({ settings, editing, onChange, onCommand, onClose }: {
  settings: DashboardSettings;
  editing: boolean;
  onChange: (settings: DashboardSettings) => void;
  onCommand: (command: "edit" | "done" | "undo" | "reset") => void;
  onClose: () => void;
}) {
  const atLimit = settings.instances.length >= DASHBOARD_MAX_WIDGETS;
  return (
    <div className="fixed inset-0 z-[59] bg-black/15 md:pointer-events-none md:bg-transparent" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-label="仪表盘组件" className="gary-glass gary-glass--thick pointer-events-auto absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-hidden rounded-t-[28px] border border-border/60 bg-background/92 text-card-foreground shadow-2xl md:inset-auto md:bottom-24 md:right-6 md:w-[440px] md:max-h-[calc(100dvh-8rem)] md:rounded-[24px]">
        <header className="flex items-center justify-between border-b border-border/50 px-4 py-4">
          <div><h2 className="font-semibold">选择仪表盘组件</h2><p className="mt-0.5 text-xs text-muted-foreground">已选择 {settings.instances.length} / {DASHBOARD_MAX_WIDGETS}</p></div>
          <button type="button" onClick={onClose} aria-label="关闭组件面板" className="gary-icon-button h-9 w-9 rounded-xl border-0 bg-transparent shadow-none"><X className="h-4 w-4" /></button>
        </header>
        <div className="max-h-[calc(82dvh-9rem)] space-y-5 overflow-y-auto px-4 py-4 md:max-h-[calc(100dvh-17rem)]">
          {(["system", "mosdns", "mihomo"] as const).map((category) => (
            <section key={category} aria-labelledby={`widget-category-${category}`}>
              <h3 id={`widget-category-${category}`} className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{widgetCategoryLabels[category]}</h3>
              <div className="flex flex-wrap gap-2">
                {widgetRegistry.filter((item) => item.category === category).map((definition) => {
                  const selected = settings.instances.filter((instance) => instance.type === definition.type);
                  const isSelected = selected.length > 0;
                  const disabled = atLimit && (!isSelected || definition.allowMultiple);
                  const toggle = () => {
                    if (definition.allowMultiple || !isSelected) {
                      const next = addDashboardWidget(settings, definition.type);
                      if (next) onChange(next);
                    } else {
                      onChange(removeDashboardWidget(settings, selected[0].id));
                    }
                  };
                  return (
                    <button key={definition.type} type="button" onClick={toggle} disabled={disabled} aria-pressed={isSelected} title={disabled ? "最多启用 15 个组件" : definition.description} className={cn("gary-glass-button inline-flex max-w-full items-center gap-2 rounded-xl px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40", isSelected && "text-primary")}>
                      <definition.icon className="h-3.5 w-3.5 shrink-0" /><span>{definition.label}</span>
                      {definition.allowMultiple && selected.length ? <span className="rounded-full bg-primary/12 px-1.5 tabular-nums">{selected.length}</span> : isSelected ? <Check className="h-3.5 w-3.5" /> : null}
                    </button>
                  );
                })}
              </div>
              {category === "mihomo" && settings.instances.filter((item) => item.type === "mihomo-proxy-group").length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {settings.instances.filter((item) => item.type === "mihomo-proxy-group").map((instance, index) => <button type="button" key={instance.id} onClick={() => onChange(removeDashboardWidget(settings, instance.id))} className="inline-flex items-center gap-1 rounded-full bg-muted/65 px-2 py-1 text-[10px] text-muted-foreground" title="移除此实例">策略组 {index + 1}<X className="h-3 w-3" /></button>)}
                </div>
              ) : null}
            </section>
          ))}
          {atLimit ? <p role="status" className="rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">最多启用 15 个组件，取消任意组件后可继续添加。</p> : null}
        </div>
        <footer className="grid grid-cols-3 gap-2 border-t border-border/50 px-4 py-3">
          <button type="button" onClick={() => onCommand(editing ? "done" : "edit")} className="gary-glass-button gap-1.5 rounded-xl px-2 py-2 text-xs font-medium text-primary">{editing ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}{editing ? "完成编辑" : "编辑布局"}</button>
          <button type="button" disabled={!editing} onClick={() => onCommand("undo")} className="gary-glass-button gap-1.5 rounded-xl px-2 py-2 text-xs disabled:opacity-40"><Undo2 className="h-3.5 w-3.5" />撤销调整</button>
          <button type="button" onClick={() => onCommand("reset")} className="gary-glass-button gap-1.5 rounded-xl px-2 py-2 text-xs"><RotateCcw className="h-3.5 w-3.5" />默认布局</button>
        </footer>
      </section>
    </div>
  );
}
