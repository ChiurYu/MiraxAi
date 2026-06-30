import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const srcDir = path.resolve(__dirname);
const source = fs.readFileSync(path.join(srcDir, "VoiceCloningStage.vue"), "utf-8");
const template = source.match(/<template>([\s\S]*?)<\/template>/)?.[1] ?? "";
const appSource = fs.readFileSync(path.resolve(srcDir, "../../..", "App.vue"), "utf-8");

describe("VoiceCloningStage UI contracts", () => {
  it("renders a mock voice badge", () => {
    expect(source).toContain("Mock 声音");
  });

  it("renders an honest not-connected hint", () => {
    expect(source).toContain("真实声音克隆未连接");
    expect(source).toContain("请在设置中配置并启用 CosyVoice provider");
  });

  it("renders a real-mode info hint", () => {
    expect(source).toContain("真实声音克隆模式：将使用设置中启用的 provider 生成 voiceId。");
  });

  it("renders a failed-state error banner", () => {
    expect(template).toContain("status-banner status-error");
  });

  it("disables clone button in not-connected mode", () => {
    expect(template).toMatch(/:disabled="!canRun"/);
  });

  it("does not render apiKey, baseUrl, token or sk- literals in the template", () => {
    const lower = template.toLowerCase();
    expect(lower).not.toContain("apikey");
    expect(lower).not.toContain("baseurl");
    expect(lower).not.toContain("token");
    expect(lower).not.toContain("sk-");
  });

  it("App passes voice clone mode and safe error message into the stage", () => {
    expect(appSource).toContain(":mode=\"voiceCloneMode\"");
    expect(appSource).toContain(":error-message=\"voiceCloneErrorMessage\"");
  });

  it("App clears stale voice before real voice cloning", () => {
    expect(appSource).toContain("if (voiceCloneMode === \"real\") {");
    expect(appSource).toContain("selectedVoiceId.value = \"\";");
    expect(appSource).toContain("selectedVoiceName.value = \"\";");
  });
});
