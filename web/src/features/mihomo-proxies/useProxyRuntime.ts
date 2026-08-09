import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { mergeProxyStore, patchProxyDelayKeys, patchProxySelection, createEmptyProxyStore } from "./proxyStore";
import {
  cancelProxyTestJob,
  createProxyTestJob,
  resolveNodeTestPolicy,
  runControlledTests,
  updateProxyTestJob,
  type ProxyPolicySource,
} from "./latency";
import { proxyApi, type ProxyApi } from "./proxyApi";
import { resolveProxyChain } from "./selectors";
import {
  planAllProxyTests,
  planProxyNodeTest,
  planProxyGroupTests,
  type ProxySpeedtestPlan,
} from "./speedtestPlan";
import {
  type ProxyKey,
  type ProxyPageSettings,
  type ProxyRuntimeSnapshot,
  type ProxyStore,
  type ProxyTestJob,
  type ProxyTestJobScope,
} from "./types";

export type ProxyRuntimeOptions = {
  api?: ProxyApi;
  enabled?: boolean;
  autoRefreshMs?: number;
  initialStore?: ProxyStore;
  pageFallback?: ProxyPolicySource;
  systemDefault?: ProxyPolicySource;
  settings?: Pick<ProxyPageSettings, "autoDisconnectOnSwitch">;
};

export type ProxyRefreshOptions = { silent?: boolean };

/** Internal attribution carried on jobs until the UI types can adopt it. */
export type ProxyRuntimeTestJob = ProxyTestJob & {
  physicalKeys?: ProxyKey[];
  displayKeys?: ProxyKey[];
  targetDisplayKeys?: Record<string, ProxyKey[]>;
};

export type ProxyRuntime = Omit<ProxyRuntimeSnapshot, "testingJobs"> & {
  testingJobs: Record<string, ProxyRuntimeTestJob>;
  store: ProxyStore;
  refresh(options?: ProxyRefreshOptions): Promise<ProxyStore | undefined>;
  selectProxy(groupKey: ProxyKey, targetKey: ProxyKey): Promise<unknown>;
  testNode(key: ProxyKey, options?: { groupKey?: ProxyKey; temporary?: ProxyPolicySource }): Promise<ProxyTestJob>;
  testGroup(key: ProxyKey, options?: { temporary?: ProxyPolicySource }): Promise<ProxyTestJob>;
  testProvider(providerId: string, options?: { temporary?: ProxyPolicySource }): Promise<ProxyTestJob>;
  testAll(options?: { temporary?: ProxyPolicySource }): Promise<ProxyTestJob>;
  cancelTest(jobId: string): void;
  clearError(): void;
  resolveChain(groupKey: ProxyKey): ReturnType<typeof resolveProxyChain>;
};

type JobControllers = Map<string, AbortController>;
type PlannedTargetResult = {
  key: ProxyKey;
  value?: {
    target: ProxySpeedtestPlan["targets"][number];
    result: Awaited<ReturnType<ProxyApi["delayProxy"]>>;
  };
  error?: unknown;
};

export function useProxyRuntime(options: ProxyRuntimeOptions = {}): ProxyRuntime {
  const client = options.api ?? proxyApi;
  const enabled = options.enabled !== false;
  const refreshInterval = Math.max(0, options.autoRefreshMs ?? 30_000);
  const [store, setStore] = useState<ProxyStore>(() => options.initialStore ?? createEmptyProxyStore());
  const [loading, setLoading] = useState(() => !options.initialStore || options.initialStore.groupKeys.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [visible, setVisible] = useState(true);
  const [testingJobs, setTestingJobs] = useState<Record<string, ProxyRuntimeTestJob>>({});
  const storeRef = useRef(store);
  const sequenceRef = useRef(0);
  const requestAbortRef = useRef<AbortController | undefined>(undefined);
  const mountedRef = useRef(true);
  const jobControllersRef = useRef<JobControllers>(new Map());
  // Incremented for every local selection/test mutation. A refresh that began
  // against an older revision is discarded instead of overwriting a fresh
  // delay result with a stale controller snapshot.
  const localRevisionRef = useRef(0);
  const settingsRef = useRef(options.settings);
  const pageFallbackRef = useRef(options.pageFallback);
  const systemDefaultRef = useRef(options.systemDefault);

  useEffect(() => {
    storeRef.current = store;
  }, [store]);

  useEffect(() => {
    settingsRef.current = options.settings;
    pageFallbackRef.current = options.pageFallback;
    systemDefaultRef.current = options.systemDefault;
  }, [options.pageFallback, options.settings, options.systemDefault]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestAbortRef.current?.abort();
      jobControllersRef.current.forEach((controller) => controller.abort());
      jobControllersRef.current.clear();
    };
  }, []);

  const refresh = useCallback(
    async ({ silent = false }: ProxyRefreshOptions = {}): Promise<ProxyStore | undefined> => {
      if (!enabled || (typeof document !== "undefined" && document.hidden)) return undefined;
      requestAbortRef.current?.abort();
      const controller = new AbortController();
      requestAbortRef.current = controller;
      const sequence = ++sequenceRef.current;
      const revisionAtStart = localRevisionRef.current;
      const hadData = storeRef.current.groupKeys.length > 0 || Object.keys(storeRef.current.entities).length > 0;
      if (!silent && !hadData) setLoading(true);
      else setRefreshing(true);
      try {
        const result = await client.loadRuntime(storeRef.current, controller.signal);
        if (!mountedRef.current || sequence !== sequenceRef.current || controller.signal.aborted) return undefined;
        if (revisionAtStart !== localRevisionRef.current) return undefined;
        const next = mergeProxyStore(storeRef.current, result.store);
        storeRef.current = next;
        setStore(next);
        if (result.errors.length > 0) setError(result.errors.map((item) => item.message).join("；"));
        else setError(undefined);
        return next;
      } catch (reason) {
        if (!mountedRef.current || sequence !== sequenceRef.current || controller.signal.aborted) return undefined;
        setError(reason instanceof Error ? reason.message : "代理数据加载失败");
        return undefined;
      } finally {
        if (mountedRef.current && sequence === sequenceRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [client, enabled],
  );

  useEffect(() => {
    if (!enabled) return undefined;
    void refresh({ silent: Boolean(options.initialStore) });
    if (refreshInterval <= 0) return undefined;
    const timer = window.setInterval(() => {
      if (typeof document === "undefined" || !document.hidden) void refresh({ silent: true });
    }, refreshInterval);
    return () => window.clearInterval(timer);
  }, [enabled, options.initialStore, refresh, refreshInterval]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const onVisibility = () => {
      const nextVisible = !document.hidden;
      setVisible(nextVisible);
      if (nextVisible) void refresh({ silent: true });
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [refresh]);

  const updateJob = useCallback((job: ProxyRuntimeTestJob) => {
    if (!mountedRef.current) return;
    setTestingJobs((current) => ({ ...current, [job.id]: job }));
  }, []);

  const startJob = useCallback(
    (scope: ProxyTestJobScope, total: number, plan?: ProxySpeedtestPlan) => {
      const job: ProxyRuntimeTestJob = {
        ...createProxyTestJob(scope, total),
        ...(plan ? {
          physicalKeys: plan.targets.map((target) => target.physicalKey),
          displayKeys: Array.from(new Set(plan.targets.flatMap((target) => target.displayKeys))),
          targetDisplayKeys: Object.fromEntries(plan.targets.map((target) => [target.physicalKey, [...target.displayKeys]])),
        } : {}),
      };
      const controller = new AbortController();
      jobControllersRef.current.set(job.id, controller);
      updateJob(job);
      return { job, controller };
    },
    [updateJob],
  );

  const finishJob = useCallback(
    (job: ProxyTestJob, update: Partial<Pick<ProxyTestJob, "status" | "completed" | "succeeded" | "failed" | "error">>) => {
      const next = updateProxyTestJob(job, update) as ProxyRuntimeTestJob;
      updateJob(next);
      if (next.status === "done" || next.status === "cancelled") jobControllersRef.current.delete(next.id);
      return next;
    },
    [updateJob],
  );

  /** Run one request per unique physical leaf using the scoped controller API. */
  const runPlannedTargets = useCallback(
    async (plan: ProxySpeedtestPlan, signal: AbortSignal, onProgress?: (result: PlannedTargetResult) => void) => {
      const targets = new Map(plan.targets.map((target) => [target.key, target]));
      return runControlledTests(
        plan.targets.map((target) => target.key),
        async (key, requestSignal) => {
          const target = targets.get(key);
          if (!target) throw new Error("测速目标不存在");
          const result = target.provider
            ? await client.delayProviderProxy(target.provider.id, target.node.name, target.policy, requestSignal)
            : await client.delayProxy(target.node.name, target.policy, requestSignal);
          return { target, result };
        },
        {
          concurrency: 5,
          signal,
          onProgress: (result) => onProgress?.({ key: result.key, value: result.value as PlannedTargetResult["value"], error: result.error }),
        },
      );
    },
    [client],
  );

  const commitDelayResult = useCallback((target: ProxySpeedtestPlan["targets"][number], delay: number, sample?: Parameters<typeof patchProxyDelayKeys>[3]) => {
    if (!mountedRef.current) return;
    const keys = target.displayKeys.length ? target.displayKeys : [target.physicalKey];
    const next = patchProxyDelayKeys(storeRef.current, keys, delay, sample);
    localRevisionRef.current += 1;
    storeRef.current = next;
    setStore(next);
  }, []);

  const selectProxy = useCallback(
    async (groupKey: ProxyKey, targetKey: ProxyKey) => {
      const before = storeRef.current;
      const group = before.entities[groupKey];
      const target = before.entities[targetKey];
      if (!group || group.kind !== "group" || !target) throw new Error("代理组或节点不存在");
      const optimistic = patchProxySelection(before, groupKey, targetKey);
      localRevisionRef.current += 1;
      storeRef.current = optimistic;
      setStore(optimistic);
      try {
        const response = await client.selectProxy(group.name, target.name);
        let disconnect;
        if (settingsRef.current?.autoDisconnectOnSwitch !== false) {
          // A precise disconnect failure must never roll back a successful
          // selection or broaden the request to all connections.
          try {
            disconnect = await client.disconnectProxyGroup(group.name);
          } catch {
            // The caller can surface this as a non-blocking toast.
          }
        }
        return { selection: response, disconnect };
      } catch (reason) {
        if (mountedRef.current) {
          storeRef.current = before;
          setStore(before);
        }
        throw reason;
      }
    },
    [client],
  );

  const testNode = useCallback(
    async (key: ProxyKey, testOptions: { groupKey?: ProxyKey; temporary?: ProxyPolicySource } = {}) => {
      const current = storeRef.current;
      const node = current.entities[key];
      if (!node) throw new Error("节点不存在");
      const plan = planProxyNodeTest(current, key, {
        groupKey: testOptions.groupKey,
        pageFallback: pageFallbackRef.current ?? current.pageTestPolicy,
        systemDefault: systemDefaultRef.current,
        temporary: testOptions.temporary,
      });
      localRevisionRef.current += 1;
      const started = startJob("node", plan.targets.length, plan);
      let job = updateProxyTestJob(started.job, { status: "running", startedAt: Date.now() });
      updateJob(job);
      const recordResult = (result: PlannedTargetResult) => {
        const target = result.value?.target ?? plan.targets.find((item) => item.key === result.key);
        if (!target) return;
        const delay = result.value?.result.delay ?? 0;
        const success = Boolean(result.value && delay > 0);
        commitDelayResult(target, delay, {
          delay,
          timestamp: result.value?.result.testedAt,
          url: target.policy.url,
          success,
        });
        job = finishJob(job, {
          completed: job.completed + 1,
          succeeded: job.succeeded + (success ? 1 : 0),
          failed: job.failed + (success ? 0 : 1),
          status: "running",
          ...(result.error ? { error: result.error instanceof Error ? result.error.message : "测速失败" } : {}),
        });
      };
      await runPlannedTargets(plan, started.controller.signal, recordResult);
      const cancelled = started.controller.signal.aborted;
      job = finishJob(job, { status: cancelled ? "cancelled" : "done", completed: cancelled ? job.completed : plan.targets.length });
      return job;
    },
    [commitDelayResult, finishJob, runPlannedTargets, startJob, updateJob],
  );

  const testGroup = useCallback(
    async (groupKey: ProxyKey, testOptions: { temporary?: ProxyPolicySource } = {}) => {
      const current = storeRef.current;
      const group = current.entities[groupKey];
      if (!group || group.kind !== "group") throw new Error("代理组不存在");
      const plan = planProxyGroupTests(current, groupKey, {
        pageFallback: pageFallbackRef.current ?? current.pageTestPolicy,
        systemDefault: systemDefaultRef.current,
        temporary: testOptions.temporary,
      });
      localRevisionRef.current += 1;
      const started = startJob("group", plan.targets.length, plan);
      let job = updateProxyTestJob(started.job, { status: "running", startedAt: Date.now() });
      updateJob(job);
      const recordResult = (result: PlannedTargetResult) => {
        const target = result.value?.target ?? plan.targets.find((item) => item.key === result.key);
        if (!target) return;
        const delay = result.value?.result.delay ?? 0;
        const success = Boolean(result.value && delay > 0);
        commitDelayResult(target, delay, {
          delay,
          timestamp: result.value?.result.testedAt,
          url: target.policy.url,
          success,
        });
        job = finishJob(job, {
          completed: job.completed + 1,
          succeeded: job.succeeded + (success ? 1 : 0),
          failed: job.failed + (success ? 0 : 1),
          status: "running",
          ...(result.error ? { error: result.error instanceof Error ? result.error.message : "测速失败" } : {}),
        });
      };
      await runPlannedTargets(plan, started.controller.signal, recordResult);
      const cancelled = started.controller.signal.aborted;
      job = finishJob(job, { status: cancelled ? "cancelled" : "done", completed: cancelled ? job.completed : plan.targets.length });
      return job;
    },
    [commitDelayResult, finishJob, runPlannedTargets, startJob, updateJob],
  );

  const testProvider = useCallback(
    async (providerId: string, testOptions: { temporary?: ProxyPolicySource } = {}) => {
      const current = storeRef.current;
      const provider = current.providers[providerId];
      if (!provider) throw new Error("Provider 不存在");
      localRevisionRef.current += 1;
      const started = startJob("provider", 1);
      let job = updateProxyTestJob(started.job, { status: "running", startedAt: Date.now() });
      updateJob(job);
      try {
        const policy = resolveNodeTestPolicy(
          undefined,
          undefined,
          { ...provider, testPolicy: provider.testPolicy },
          pageFallbackRef.current ?? current.pageTestPolicy,
          systemDefaultRef.current,
          testOptions.temporary,
        );
        await client.healthcheckProvider(provider.id, policy, started.controller.signal);
        await refresh({ silent: true });
        job = finishJob(job, { status: "done", completed: 1, succeeded: 1 });
      } catch (reason) {
        job = finishJob(job, { status: started.controller.signal.aborted ? "cancelled" : "done", completed: 1, failed: 1, error: reason instanceof Error ? reason.message : "Provider 健康检查失败" });
      }
      return job;
    },
    [client, finishJob, refresh, startJob, updateJob],
  );

  const testAll = useCallback(
    async (testOptions: { temporary?: ProxyPolicySource } = {}) => {
      const current = storeRef.current;
      const plan = planAllProxyTests(current, {
        pageFallback: pageFallbackRef.current ?? current.pageTestPolicy,
        systemDefault: systemDefaultRef.current,
        temporary: testOptions.temporary,
      });
      localRevisionRef.current += 1;
      const started = startJob("all", plan.targets.length, plan);
      let job = updateProxyTestJob(started.job, { status: "running", startedAt: Date.now() });
      updateJob(job);
      const recordResult = (result: PlannedTargetResult) => {
        const target = result.value?.target ?? plan.targets.find((item) => item.key === result.key);
        if (!target) return;
        const delay = result.value?.result.delay ?? 0;
        const success = Boolean(result.value && delay > 0);
        commitDelayResult(target, delay, {
          delay,
          timestamp: result.value?.result.testedAt,
          url: target.policy.url,
          success,
        });
        job = finishJob(job, {
          completed: job.completed + 1,
          succeeded: job.succeeded + (success ? 1 : 0),
          failed: job.failed + (success ? 0 : 1),
          status: "running",
          ...(result.error ? { error: result.error instanceof Error ? result.error.message : "测速失败" } : {}),
        });
      };
      await runPlannedTargets(plan, started.controller.signal, recordResult);
      const cancelled = started.controller.signal.aborted;
      return finishJob(job, { status: cancelled ? "cancelled" : "done", completed: cancelled ? job.completed : plan.targets.length });
    },
    [commitDelayResult, finishJob, runPlannedTargets, startJob, updateJob],
  );

  const cancelTest = useCallback((jobId: string) => {
    const controller = jobControllersRef.current.get(jobId);
    controller?.abort();
    setTestingJobs((current) => {
      const job = current[jobId];
      return job ? { ...current, [jobId]: cancelProxyTestJob(job) } : current;
    });
  }, []);

  const clearError = useCallback(() => setError(undefined), []);
  const resolveChain = useCallback((groupKey: ProxyKey) => resolveProxyChain(groupKey, storeRef.current), []);

  return useMemo(
    () => ({ store, loading, refreshing, error, visible, testingJobs, refresh, selectProxy, testNode, testGroup, testProvider, testAll, cancelTest, clearError, resolveChain }),
    [cancelTest, clearError, error, loading, refresh, refreshing, resolveChain, selectProxy, store, testAll, testGroup, testNode, testProvider, testingJobs, visible],
  );
}
