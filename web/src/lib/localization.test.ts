import { describe, expect, it } from "vitest";
import { translateText } from "./localization";

describe("English localization", () => {
  it("restores core navigation and MosDNS rule labels", () => {
    expect(translateText("规则管理")).toBe("Rules");
    expect(translateText("广告拦截规则")).toBe("Ad-blocking sources");
    expect(translateText("在线分流规则")).toBe("Online routing sources");
    expect(translateText("上次更新")).toBe("Last updated");
  });

  it("translates dynamic client status text", () => {
    expect(translateText("5 分钟前")).toBe("5 minutes ago");
    expect(translateText("上次扫描 5 分钟前")).toBe("Last scan 5 minutes ago");
    expect(translateText("多选 (3)")).toBe("Select multiple (3)");
  });
});
