"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronsUpDown, FileText, LockKeyhole, RefreshCw, Save, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ConfigFileTree, collectConfigDirectoryPaths, countConfigFiles, type ConfigFileNode } from "@/components/config/ConfigFileTree";
import { YamlEditor } from "@/components/mihomo/YamlEditor";
import { ToastStack, useToaster } from "@/components/Toaster";
import { api, apiList } from "@/lib/api";
import { cn } from "@/lib/utils";

const MIHOMO_RUNTIME_CONFIG = "configs/mihomo/config.yaml";
const DEFAULT_SELECTED = "configs/app.yaml";
const READ_ONLY_CONFIG_PATHS = new Set([MIHOMO_RUNTIME_CONFIG]);

export default function ConfigPage() {
  const { toasts, showToast } = useToaster();
  const [tree, setTree] = useState<ConfigFileNode[]>([]);
  const [treeRoot, setTreeRoot] = useState("configs");
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set());
  const [selected, setSelected] = useState(DEFAULT_SELECTED);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validation, setValidation] = useState("");
  const treeInitialized = useRef(false);

  const directoryPaths = useMemo(() => collectConfigDirectoryPaths(tree), [tree]);
  const fileCount = useMemo(() => countConfigFiles(tree), [tree]);
  const allExpanded = directoryPaths.size > 0 && Array.from(directoryPaths).every((path) => expandedPaths.has(path));
  const readOnly = selected === MIHOMO_RUNTIME_CONFIG;

  const loadTree = async () => {
    try {
      const payload = await api<any>("/api/v1/config/tree?path=configs");
      const nextTree = apiList<ConfigFileNode>(payload, ["tree", "data"]);
      setTree(nextTree);
      setTreeRoot(String(payload.absolute_path || payload.root || "configs"));
      if (!treeInitialized.current) {
        setExpandedPaths(collectConfigDirectoryPaths(nextTree));
        treeInitialized.current = true;
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err));
    }
  };

  const loadFile = async (path = selected) => {
    setLoading(true);
    setValidation("");
    try {
      const payload = await api<any>(`/api/v1/config/file?path=${encodeURIComponent(path)}`);
      setSelected(payload.path || path);
      setContent(payload.content || "");
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTree();
    void loadFile(selected);
  }, []);

  const save = async () => {
    if (readOnly) {
      showToast("运行配置不可在配置管理中直接保存");
      return;
    }
    setSaving(true);
    try {
      await api("/api/v1/config/file", {
        method: "PUT",
        body: JSON.stringify({ path: selected, content, comment: "web ui save" }),
      });
      showToast("配置已保存");
      void loadTree();
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const validate = async () => {
    try {
      const payload = await api<any>("/api/v1/config/validate", {
        method: "POST",
        body: JSON.stringify({ path: selected, content }),
      });
      setValidation(payload.valid === false ? payload.error || "验证失败" : "配置验证通过");
    } catch (err) {
      setValidation(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <AppShell>
      <div className="space-y-5 animate-fade-in">
        <ToastStack toasts={toasts} />
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-[10px] bg-gradient-to-br from-primary/10 to-secondary/10 p-2">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-none text-foreground">配置管理</h1>
              <p className="mt-1 text-sm text-muted-foreground">读取、验证并保存系统配置文件</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => void loadFile(selected)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted">
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              刷新
            </button>
            <button onClick={() => void validate()} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted">
              <ShieldCheck className="h-4 w-4" />
              验证
            </button>
            <button onClick={() => void save()} disabled={saving || readOnly} title={readOnly ? "Mihomo 运行配置请在 Mihomo 配置页面修改" : "保存配置"} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
              <Save className="h-4 w-4" />
              保存
            </button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-xl border bg-card">
            <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
              <div className="min-w-0">
                <div className="font-semibold">配置目录</div>
                <div className="truncate text-[11px] text-muted-foreground" title={treeRoot}>{treeRoot} · {fileCount} 个文件</div>
              </div>
              <button
                type="button"
                onClick={() => setExpandedPaths(allExpanded ? new Set() : new Set(directoryPaths))}
                disabled={directoryPaths.size === 0}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55 disabled:opacity-40"
                aria-label={allExpanded ? "收起全部目录" : "展开全部目录"}
                title={allExpanded ? "收起全部" : "展开全部"}
              >
                <ChevronsUpDown className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="max-h-[calc(100vh-220px)] overflow-auto p-2">
              {tree.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">暂无配置文件</div>
              ) : (
                <ConfigFileTree
                  nodes={tree}
                  selectedPath={selected}
                  expandedPaths={expandedPaths}
                  onToggle={(path) => setExpandedPaths((current) => {
                    const next = new Set(current);
                    if (next.has(path)) next.delete(path);
                    else next.add(path);
                    return next;
                  })}
                  onSelect={(node) => void loadFile(node.path || node.name || "")}
                  readOnlyPaths={READ_ONLY_CONFIG_PATHS}
                />
              )}
            </div>
          </aside>

          <section className="rounded-xl border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 truncate font-semibold">
                  <span className="truncate">{selected}</span>
                  {readOnly ? <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="只读文件" /> : null}
                </div>
                <div className="text-xs text-muted-foreground">{content.length} 字符</div>
              </div>
              {validation && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-700 dark:text-green-300">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {validation}
                </div>
              )}
            </div>
            <YamlEditor
              value={content}
              onChange={setContent}
              readOnly={readOnly}
              maxHeight="calc(100vh - 260px)"
              className={cn("min-h-[calc(100vh-260px)]", loading && "opacity-70")}
            />
          </section>
        </div>
      </div>
    </AppShell>
  );
}
