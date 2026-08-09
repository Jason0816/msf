import { describe, expect, it } from "vitest";
import { buildMosdnsTrend, freezeMosdnsTrend, normalizeMosdnsCaches, safePercent } from "./model";

describe("MosDNS dashboard model", () => {
  it("never produces NaN for empty cache payloads", () => {
    const caches = normalizeMosdnsCaches({});
    for (const cache of Object.values(caches)) {
      expect(cache.hitRate).toBe(0);
      expect(cache.staleRate).toBe(0);
      expect(Number.isNaN(cache.entries)).toBe(false);
    }
    expect(safePercent(undefined, 1, 0)).toBe(0);
  });

  it("normalizes ratio and percentage forms", () => {
    expect(safePercent(.25)).toBe(25);
    expect(safePercent(25)).toBe(25);
    expect(safePercent(undefined, 1, 4)).toBe(25);
  });

  it("builds stable one-second buckets without future points", () => {
    const now = 1_700_000_010_500;
    const rows = buildMosdnsTrend([{ timestamp: now - 1500, duration_ms: 10 }, { timestamp: now + 5000, duration_ms: 99 }], 10, now);
    expect(rows).toHaveLength(10);
    expect(rows.reduce((sum, row) => sum + row.queries, 0)).toBe(1);
    expect(rows.every((row) => Number.isFinite(row.durationMs))).toBe(true);
    const changed = rows.map((row) => ({ ...row, queries: row.queries + 10 }));
    expect(freezeMosdnsTrend(rows, changed)).toEqual(rows);
  });
});
