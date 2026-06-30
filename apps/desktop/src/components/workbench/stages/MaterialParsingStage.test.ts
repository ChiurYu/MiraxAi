import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const srcDir = path.resolve(__dirname);
const source = fs.readFileSync(path.join(srcDir, "MaterialParsingStage.vue"), "utf-8");
const template = source.match(/<template>([\s\S]*?)<\/template>/)?.[1] ?? "";
const appSource = fs.readFileSync(path.resolve(srcDir, "../../..", "App.vue"), "utf-8");

describe("MaterialParsingStage UI contracts", () => {
  it("renders a mock parsing badge", () => {
    expect(source).toContain("Mock 解析");
  });

  it("renders an honest not-connected hint", () => {
    expect(source).toContain("真实转写未连接");
    expect(source).toContain("请在设置中配置并启用 Whisper provider");
  });

  it("renders a real-mode info hint", () => {
    expect(source).toContain("真实转写模式：将使用设置中启用的 provider 生成 transcript。");
  });

  it("renders a failed-state error banner", () => {
    expect(template).toContain("status-banner status-error");
  });

  it("disables parse button in not-connected mode", () => {
    expect(source).toMatch(/:disabled="!canRun"/);
  });

  it("does not render apiKey, baseUrl, token or sk- literals in the template", () => {
    const lower = template.toLowerCase();
    expect(lower).not.toContain("apikey");
    expect(lower).not.toContain("baseurl");
    expect(lower).not.toContain("token");
    expect(lower).not.toContain("sk-");
  });

  it("App passes transcribe mode and safe error message into the stage", () => {
    expect(appSource).toContain(":mode=\"transcribeMode\"");
    expect(appSource).toContain(":error-message=\"transcribeErrorMessage\"");
  });

  it("App clears stale transcript before real transcribe", () => {
    expect(appSource).toContain("if (transcribeMode === \"real\") {");
    expect(appSource).toContain("transcriptText.value = \"\";");
  });

  it("does not show fabricated recent-parse demo entries", () => {
    expect(source).not.toContain("夏日通勤基础款搭配公式.mp4");
    expect(source).not.toContain("14.2 MB");
    expect(source).not.toContain("Yesterday • Link Extracted");
  });

  it("shows an honest empty state for recent parses", () => {
    expect(source).toContain("暂无最近解析记录");
    expect(source).toContain("recent-empty");
  });
});
