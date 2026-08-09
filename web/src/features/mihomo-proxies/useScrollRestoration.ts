import { useCallback, useEffect, useRef } from "react";

export type ScrollRestoreKey = "groups" | "providers" | "search" | string;
export const SCROLL_STORAGE_PREFIX = "msf-mihomo-proxies.scroll.v2";

type ScrollStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type ScrollPosition = { x: number; y: number; savedAt: number };

function isWindowElement(value: HTMLElement | Window): value is Window {
  return typeof Window !== "undefined" && value instanceof Window;
}

export type ScrollRestorationOptions = {
  key: ScrollRestoreKey;
  enabled?: boolean;
  storage?: ScrollStorage;
  getElement?: () => HTMLElement | Window;
  maxWaitMs?: number;
};

export type ScrollRestorationResult = {
  save(): void;
  restore(): void;
  clear(): void;
  storageKey: string;
};

function defaultStorage(): ScrollStorage | undefined {
  return typeof window === "undefined" ? undefined : window.sessionStorage;
}

function keyFor(key: ScrollRestoreKey): string {
  return `${SCROLL_STORAGE_PREFIX}.${key}`;
}

function elementOf(options: ScrollRestorationOptions): HTMLElement | Window | undefined {
  return options.getElement?.() ?? (typeof window === "undefined" ? undefined : window);
}

export function readScrollPosition(key: ScrollRestoreKey, storage: ScrollStorage | undefined = defaultStorage()): ScrollPosition | undefined {
  try {
    const raw = storage?.getItem(keyFor(key));
    if (!raw) return undefined;
    const value = JSON.parse(raw) as Partial<ScrollPosition>;
    if (typeof value.y !== "number" || !Number.isFinite(value.y)) return undefined;
    return { x: typeof value.x === "number" && Number.isFinite(value.x) ? value.x : 0, y: value.y, savedAt: typeof value.savedAt === "number" ? value.savedAt : 0 };
  } catch {
    return undefined;
  }
}

export function writeScrollPosition(key: ScrollRestoreKey, position: { x: number; y: number }, storage: ScrollStorage | undefined = defaultStorage()): void {
  try {
    storage?.setItem(keyFor(key), JSON.stringify({ ...position, savedAt: Date.now() }));
  } catch {
    // Storage can be disabled or full; scrolling should continue normally.
  }
}

export function useScrollRestoration(options: ScrollRestorationOptions): ScrollRestorationResult;
export function useScrollRestoration(key: ScrollRestoreKey, options?: Omit<ScrollRestorationOptions, "key">): ScrollRestorationResult;
export function useScrollRestoration(optionsOrKey: ScrollRestorationOptions | ScrollRestoreKey, shorthandOptions: Omit<ScrollRestorationOptions, "key"> = {}): ScrollRestorationResult {
  const options: ScrollRestorationOptions = typeof optionsOrKey === "string" ? { ...shorthandOptions, key: optionsOrKey } : optionsOrKey;
  const storage = options.storage ?? defaultStorage();
  const storageKey = keyFor(options.key);
  const cancelledRef = useRef(false);
  const restoreTimerRef = useRef<number | undefined>(undefined);
  const removeListenersRef = useRef<(() => void) | undefined>(undefined);

  const save = useCallback(() => {
    const element = elementOf(options);
    if (!element) return;
    if (isWindowElement(element)) writeScrollPosition(options.key, { x: element.scrollX, y: element.scrollY }, storage);
    else writeScrollPosition(options.key, { x: element.scrollLeft, y: element.scrollTop }, storage);
  }, [options, storage]);

  const clear = useCallback(() => {
    try {
      storage?.removeItem(storageKey);
    } catch {
      // Ignore storage failures.
    }
  }, [storage, storageKey]);

  const restore = useCallback(() => {
    if (options.enabled === false) return;
    const element = elementOf(options);
    const position = readScrollPosition(options.key, storage);
    if (!element || !position) return;
    cancelledRef.current = false;
    const maxWait = Math.max(0, options.maxWaitMs ?? 300);
    const started = Date.now();
    const attempt = () => {
      if (cancelledRef.current) return;
      const height = isWindowElement(element) ? document.documentElement.scrollHeight : element.scrollHeight;
      if (height >= position.y || Date.now() - started >= maxWait) {
        if (isWindowElement(element)) element.scrollTo({ left: position.x, top: position.y, behavior: "auto" });
        else element.scrollTo({ left: position.x, top: position.y, behavior: "auto" });
        return;
      }
      restoreTimerRef.current = window.setTimeout(attempt, 50);
    };
    attempt();
  }, [options, storage]);

  useEffect(() => {
    if (options.enabled === false) return undefined;
    const element = elementOf(options);
    if (!element) return undefined;
    const onScroll = () => {
      cancelledRef.current = true;
      save();
    };
    element.addEventListener("scroll", onScroll, { passive: true });
    removeListenersRef.current = () => element.removeEventListener("scroll", onScroll);
    restore();
    return () => {
      cancelledRef.current = true;
      if (restoreTimerRef.current !== undefined) window.clearTimeout(restoreTimerRef.current);
      removeListenersRef.current?.();
      removeListenersRef.current = undefined;
      save();
    };
  }, [options, restore, save]);

  return { save, restore, clear, storageKey };
}
