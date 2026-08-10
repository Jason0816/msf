import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("../../app/mosdns/rules/page.tsx", import.meta.url), "utf8");
const fallback = readFileSync(new URL("../../lib/mosdns-rules-data.ts", import.meta.url), "utf8");

describe("MosDNS rule source freshness", () => {
  it("does not ship the old template timestamp as live UI data", () => {
    expect(fallback).not.toContain("2025/12/19");
  });

  it("surfaces partial and single-source update failures", () => {
    expect(page).toContain("payload?.success === false");
    expect(page).toContain("部分规则源更新失败");
    expect(page).toContain("failures.length > 0");
  });
});
