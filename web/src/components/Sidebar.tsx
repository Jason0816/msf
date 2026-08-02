"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { navItems } from "@/lib/dashboard-data";
import type { NavItem } from "@/types";
import { GlassSurface } from "@/components/liquid-glass/GlassSurface";

const GROUP_STATE_STORAGE_KEY = "msf-sidebar-group-open";

function defaultGroupState() {
  return Object.fromEntries(navItems.filter((item) => item.children?.length).map((item) => [item.href, true]));
}

function readGroupState() {
  const defaults = defaultGroupState();
  if (typeof window === "undefined") return defaults;

  try {
    const raw = window.sessionStorage.getItem(GROUP_STATE_STORAGE_KEY);
    if (!raw) return defaults;

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(defaults).map(([key, fallback]) => [key, typeof parsed[key] === "boolean" ? parsed[key] : fallback])
    );
  } catch {
    return defaults;
  }
}

function writeGroupState(state: Record<string, boolean>) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(GROUP_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage failures; the current in-memory state still works.
  }
}

/**
 * A single nav row. The element is identical in both states — only the layout
 * classes change (centered icon + no padding when collapsed) and the label span
 * is omitted. This mirrors the original: the content swaps instantly while the
 * sidebar width animates, so the label is revealed/hidden by the widening clip
 * rather than by mounting a different component.
 */
function NavRow({
  item,
  indent,
  active,
  collapsed,
  flex1,
}: {
  item: NavItem;
  indent?: boolean;
  active: boolean;
  collapsed: boolean;
  flex1?: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={cn(
        "gary-nav-row group/item gap-3 py-2.5 focus-visible:outline-none",
        flex1 && "flex-1",
        collapsed ? "justify-center px-0" : "px-3",
        indent && !collapsed && "ml-4",
        active
          ? "gary-nav-row--active font-medium"
          : "text-muted-foreground"
      )}
    >
      <Icon className={cn("h-5 w-5 flex-shrink-0", active && "text-primary")} />
      {!collapsed && <span className="text-sm whitespace-nowrap">{item.label}</span>}
    </Link>
  );
}

function itemMatchesPath(item: NavItem, pathname: string) {
  if (item.href === "/") return pathname === "/";
  if (pathname === item.href || pathname.startsWith(`${item.href}/`)) return true;
  return item.children?.some((child) => pathname === child.href || pathname.startsWith(`${child.href}/`)) ?? false;
}

function NavGroup({
  item,
  pathname,
  collapsed,
  open,
  onToggle,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const hasActiveChild = item.children?.some((child) => itemMatchesPath(child, pathname));
  const parentActive = pathname === item.href;
  const active = parentActive || Boolean(hasActiveChild);

  // Collapsed: the whole group folds down to a single icon row (no chevron,
  // no children) — exactly like the original compact rail.
  if (collapsed) {
    return (
      <div className="group relative">
        <NavRow item={item} active={active} collapsed />
      </div>
    );
  }

  return (
    <div>
      <div className="group relative flex items-center">
        <NavRow item={item} active={active} collapsed={false} flex1 />
        <button
          type="button"
          onClick={onToggle}
          className="gary-icon-button ml-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[11px] border-0 bg-transparent text-muted-foreground shadow-none"
          aria-label={open ? "收起" : "展开"}
          aria-expanded={open}
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform duration-150 ease-out", open && "rotate-180")} />
        </button>
      </div>
      {open && item.children && (
        <div className="mt-1 space-y-1">
          {item.children.map((child) => (
            <div key={child.href} className="group relative">
              <NavRow item={child} indent active={child.href === pathname} collapsed={false} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement | null>(null);
  const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>(readGroupState);

  const toggleGroup = (key: string) => {
    setGroupOpen((current) => {
      const next = { ...defaultGroupState(), ...current, [key]: !current[key] };
      writeGroupState(next);
      return next;
    });
  };

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const saved = Number(window.sessionStorage.getItem("msf-sidebar-scroll") || 0);
    window.requestAnimationFrame(() => {
      nav.scrollTop = saved;
    });
  }, [pathname]);

  return (
    <aside
      className={cn(
        "fixed bottom-3 left-3 top-20 z-40 hidden transition-[width] duration-250 ease-out md:block",
        collapsed ? "w-20" : "w-56"
      )}
    >
      <GlassSurface material="ultrathin" className="h-full w-full rounded-[24px]">
        <div className="flex h-full flex-col">
        <nav
          ref={navRef}
          onScroll={(event) => {
            window.sessionStorage.setItem("msf-sidebar-scroll", String(event.currentTarget.scrollTop));
          }}
          className="scrollbar-thin flex-1 space-y-1 overflow-x-hidden overflow-y-auto px-3 py-4"
        >
          {navItems.map((item) => {
            const active = itemMatchesPath(item, pathname);
            return item.children ? (
              <NavGroup
                key={item.href}
                item={item}
                pathname={pathname}
                collapsed={collapsed}
                open={groupOpen[item.href] ?? true}
                onToggle={() => toggleGroup(item.href)}
              />
            ) : (
              <div key={item.href} className="group relative">
                <NavRow item={item} active={active} collapsed={collapsed} />
              </div>
            );
          })}
        </nav>
        </div>
      </GlassSurface>
    </aside>
  );
}
