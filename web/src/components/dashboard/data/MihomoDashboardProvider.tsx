"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, getToken } from "@/lib/api";
import {
  clearClosedConnections,
  pruneClosedConnections,
  readClosedConnections,
  saveClosedConnections,
  toClosedConnection,
  type ClosedConnectionRecord,
} from "@/components/mihomo/overview/connectionHistory";
import {
  MihomoDashboardDataContext,
  mergeMihomoTrafficHistory,
  normalizeMihomoConnections,
  normalizeMihomoProviderTraffic,
  normalizeMihomoRuleHits,
  unwrapMihomoData,
  type MihomoConnection,
  type MihomoDashboardData,
  type MihomoTrafficPoint,
} from "./useMihomoDashboardData";

let sharedTrafficHistory: MihomoTrafficPoint[] = [];
const POLL_TICK_MS = 1_000;

type Snapshot = Omit<MihomoDashboardData, "refresh" | "clearConnectionHistory" | "applyConnectionRetention">;
const initialSnapshot: Snapshot = {
  overview: {}, connections: [], providers: [], ruleHits: [], trafficHistory: sharedTrafficHistory,
  closedConnections: [], trafficConnected: false, loading: true, error: "",
};

function message(error: unknown) { return error instanceof Error ? error.message : String(error); }

export function MihomoDashboardProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot>(() => ({ ...initialSnapshot, trafficHistory: sharedTrafficHistory }));
  const mounted = useRef(true);
  const running = useRef(new Set<string>());
  const previousConnections = useRef<Map<string, MihomoConnection> | null>(null);
  const connectionCount = useRef(0);
  const socketSampleAt = useRef(0);
  const lastPollAt = useRef<Record<string, number>>({});

  const appendTraffic = useCallback((point: MihomoTrafficPoint) => {
    setSnapshot((current) => {
      const trafficHistory = mergeMihomoTrafficHistory(current.trafficHistory, point);
      sharedTrafficHistory = trafficHistory;
      return { ...current, trafficHistory };
    });
  }, []);

  const load = useCallback(async (key: string, path: string, apply: (payload: unknown) => void | Promise<void>) => {
    if (running.current.has(key)) return;
    running.current.add(key);
    try {
      const payload = await api(path);
      if (mounted.current) await apply(payload);
    } catch (error) {
      if (mounted.current) setSnapshot((current) => ({ ...current, loading: false, error: message(error) }));
    } finally { running.current.delete(key); }
  }, []);

  const refreshOverview = useCallback(() => load("overview", "/api/v1/mihomo/overview", (payload) => {
    const overview = unwrapMihomoData(payload);
    const stats = overview.stats ?? overview;
    const connections = Number(overview.activeConnections ?? overview.active_connections ?? stats.activeConnections ?? stats.active_connections ?? 0) || 0;
    connectionCount.current = connections;
    setSnapshot((current) => ({ ...current, overview, loading: false, error: "" }));
    if (Date.now() - socketSampleAt.current > 2_500) {
      appendTraffic({
        timestamp: Date.now(),
        downloadSpeed: Number(overview.downloadSpeed ?? overview.download_speed ?? stats.downloadSpeed ?? stats.download_speed ?? 0) || 0,
        uploadSpeed: Number(overview.uploadSpeed ?? overview.upload_speed ?? stats.uploadSpeed ?? stats.upload_speed ?? 0) || 0,
        connections,
      });
    }
  }), [appendTraffic, load]);

  const refreshConnections = useCallback(() => load("connections", "/api/v1/mihomo/connections", async (payload) => {
    const connections = normalizeMihomoConnections(payload);
    connectionCount.current = connections.length;
    const currentMap = new Map(connections.map((row) => [String(row.id), row]));
    if (previousConnections.current) {
      const ended = Array.from(previousConnections.current).filter(([id]) => !currentMap.has(id)).map(([, row]) => toClosedConnection(row));
      if (ended.length) {
        await saveClosedConnections(ended);
        const closedConnections = await readClosedConnections();
        if (mounted.current) setSnapshot((current) => ({ ...current, closedConnections }));
      }
    }
    previousConnections.current = currentMap;
    if (mounted.current) setSnapshot((current) => ({ ...current, connections }));
  }), [load]);

  const refreshProviders = useCallback(() => load("providers", "/api/v1/mihomo/proxy-providers", (payload) => {
    setSnapshot((current) => ({ ...current, providers: normalizeMihomoProviderTraffic(payload) }));
  }), [load]);

  const refreshRules = useCallback(() => load("rules", "/api/v1/mihomo/rules?page_size=10000", (payload) => {
    setSnapshot((current) => ({ ...current, ruleHits: normalizeMihomoRuleHits(payload) }));
  }), [load]);

  const refresh = useCallback(async () => {
    await Promise.all([refreshOverview(), refreshConnections(), refreshProviders(), refreshRules()]);
  }, [refreshConnections, refreshOverview, refreshProviders, refreshRules]);

  const clearConnectionHistory = useCallback(async () => {
    await clearClosedConnections();
    setSnapshot((current) => ({ ...current, closedConnections: [] }));
  }, []);

  const applyConnectionRetention = useCallback(async (days: number) => {
    if (days > 0) await pruneClosedConnections(Date.now() - days * 86_400_000);
    const closedConnections = await readClosedConnections();
    if (mounted.current) setSnapshot((current) => ({ ...current, closedConnections }));
  }, []);

  useEffect(() => {
    mounted.current = true;
    void (async () => {
      const retention = Number(localStorage.getItem("msf-mihomo-history-cleanup-days") || 30);
      if (retention > 0) await pruneClosedConnections(Date.now() - retention * 86_400_000);
      const closedConnections = await readClosedConnections();
      if (mounted.current) setSnapshot((current) => ({ ...current, closedConnections }));
    })();
    void refresh();
    const timer = window.setInterval(() => {
      const now = Date.now();
      const hidden = document.visibilityState !== "visible";
      const due = (key: string, visibleMs: number, hiddenMs: number) => {
        const interval = hidden ? hiddenMs : visibleMs;
        if (now - (lastPollAt.current[key] ?? 0) < interval) return false;
        lastPollAt.current[key] = now;
        return true;
      };
      if (due("overview", 1_000, 10_000)) void refreshOverview();
      if (due("connections", 2_000, 10_000)) void refreshConnections();
      if (due("providers", 60_000, 120_000)) void refreshProviders();
      if (due("rules", 10_000, 60_000)) void refreshRules();
    }, POLL_TICK_MS);
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", visible);
    return () => { mounted.current = false; window.clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
  }, [refresh, refreshConnections, refreshOverview, refreshProviders, refreshRules]);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let retryTimer = 0;
    let stopped = false;
    const connect = () => {
      if (stopped) return;
      const token = getToken();
      if (!token) { retryTimer = window.setTimeout(connect, 2_000); return; }
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      socket = new WebSocket(`${protocol}//${window.location.host}/api/v1/mihomo/controller/traffic?token=${encodeURIComponent(token)}`);
      socket.onopen = () => { if (!stopped && mounted.current) setSnapshot((current) => ({ ...current, trafficConnected: true })); };
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(String(event.data));
          const timestamp = Date.now();
          socketSampleAt.current = timestamp;
          if (!stopped && mounted.current) appendTraffic({ timestamp, downloadSpeed: Number(payload.down ?? payload.download) || 0, uploadSpeed: Number(payload.up ?? payload.upload) || 0, connections: connectionCount.current });
        } catch { /* keep the latest valid sample */ }
      };
      socket.onerror = () => socket?.close();
      socket.onclose = () => {
        socket = null;
        if (!stopped && mounted.current) setSnapshot((current) => ({ ...current, trafficConnected: false }));
        if (!stopped) retryTimer = window.setTimeout(connect, 2_000);
      };
    };
    connect();
    return () => { stopped = true; window.clearTimeout(retryTimer); socket?.close(); };
  }, [appendTraffic]);

  const value = useMemo<MihomoDashboardData>(() => ({ ...snapshot, refresh, clearConnectionHistory, applyConnectionRetention }), [applyConnectionRetention, clearConnectionHistory, refresh, snapshot]);
  return <MihomoDashboardDataContext.Provider value={value}>{children}</MihomoDashboardDataContext.Provider>;
}
