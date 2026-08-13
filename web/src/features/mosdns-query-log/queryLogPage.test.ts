import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("../../app/mosdns/query-log/page.tsx", import.meta.url), "utf8");

describe("MosDNS query log result visibility", () => {
  it("shows DNS answers in a dedicated compact result column", () => {
    expect(page).toContain('{ label: "查询结果"');
    expect(page).toContain('className="w-full min-w-[1120px] table-fixed text-sm"');
    expect(page).toContain('className: "w-[220px] max-w-[260px]"');
    expect(page).toContain("formatAnswerItem");
    expect(page).toContain('textValue(answer, ["data", "value", "answer", "ip", "target"])');
    expect(page).toContain("未记录应答");
  });

  it("includes returned answers in query-log search", () => {
    expect(page).toContain('${r.domain}${r.client}${r.answer || ""}');
    expect(page).toContain("r.answer === query");
  });
});
