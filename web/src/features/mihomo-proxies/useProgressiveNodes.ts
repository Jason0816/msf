import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type ProgressiveNodeLike = { key: string };

export type ProgressiveNodesOptions<T extends ProgressiveNodeLike> = {
  items: readonly T[];
  selectedKey?: string;
  initialCount?: number;
  batchSize?: number;
  root?: Element | null;
  rootMargin?: string;
  enabled?: boolean;
};

export type ProgressiveNodesResult<T> = {
  items: T[];
  visibleItems: T[];
  hasMore: boolean;
  renderedCount: number;
  loadMore(): void;
  reset(): void;
  sentinelRef(node: Element | null): void;
};

function normalizeOptions<T extends ProgressiveNodeLike>(
  optionsOrItems: ProgressiveNodesOptions<T> | readonly T[],
  selectedKeyOrOptions?: string | Omit<ProgressiveNodesOptions<T>, "items">,
  maybeOptions?: Omit<ProgressiveNodesOptions<T>, "items">,
): ProgressiveNodesOptions<T> {
  if (Array.isArray(optionsOrItems)) {
    const extras: Omit<ProgressiveNodesOptions<T>, "items"> = typeof selectedKeyOrOptions === "object" ? selectedKeyOrOptions : (maybeOptions ?? {});
    return { ...extras, items: optionsOrItems, selectedKey: typeof selectedKeyOrOptions === "string" ? selectedKeyOrOptions : extras.selectedKey };
  }
  return optionsOrItems as ProgressiveNodesOptions<T>;
}

export function useProgressiveNodes<T extends ProgressiveNodeLike>(options: ProgressiveNodesOptions<T>): ProgressiveNodesResult<T>;
export function useProgressiveNodes<T extends ProgressiveNodeLike>(items: readonly T[], selectedKey?: string, options?: Omit<ProgressiveNodesOptions<T>, "items">): ProgressiveNodesResult<T>;
export function useProgressiveNodes<T extends ProgressiveNodeLike>(
  optionsOrItems: ProgressiveNodesOptions<T> | readonly T[],
  selectedKeyOrOptions?: string | Omit<ProgressiveNodesOptions<T>, "items">,
  maybeOptions?: Omit<ProgressiveNodesOptions<T>, "items">,
): ProgressiveNodesResult<T> {
  const options = normalizeOptions(optionsOrItems, selectedKeyOrOptions, maybeOptions);
  const { items, selectedKey, enabled = true } = options;
  const initialCount = Math.max(1, options.initialCount ?? 24);
  const batchSize = Math.max(1, options.batchSize ?? initialCount);
  const [limit, setLimit] = useState(Math.min(items.length, initialCount));
  const observerRef = useRef<IntersectionObserver | undefined>(undefined);

  const keySignature = useMemo(() => items.map((item) => item.key).join("\u0000"), [items]);
  useEffect(() => {
    setLimit((current) => {
      const minimum = Math.min(items.length, initialCount);
      return Math.min(items.length, current > items.length ? minimum : Math.max(minimum, current));
    });
  }, [initialCount, keySignature, items.length]);

  const loadMore = useCallback(() => {
    if (!enabled) return;
    setLimit((current) => Math.min(items.length, current + batchSize));
  }, [batchSize, enabled, items.length]);

  const reset = useCallback(() => setLimit(Math.min(items.length, initialCount)), [initialCount, items.length]);

  const sentinelRef = useCallback(
    (node: Element | null) => {
      observerRef.current?.disconnect();
      observerRef.current = undefined;
      if (!node || !enabled || typeof IntersectionObserver === "undefined") return;
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) loadMore();
        },
        { root: options.root ?? null, rootMargin: options.rootMargin ?? "320px 0px" },
      );
      observerRef.current.observe(node);
    },
    [enabled, loadMore, options.root, options.rootMargin],
  );

  useEffect(() => () => observerRef.current?.disconnect(), []);

  const visibleItems = useMemo(() => {
    const next = items.slice(0, limit);
    if (selectedKey && !next.some((item) => item.key === selectedKey)) {
      const selected = items.find((item) => item.key === selectedKey);
      if (selected) next.push(selected);
    }
    return next;
  }, [items, limit, selectedKey]);

  return { items: [...items], visibleItems, hasMore: limit < items.length, renderedCount: visibleItems.length, loadMore, reset, sentinelRef };
}
