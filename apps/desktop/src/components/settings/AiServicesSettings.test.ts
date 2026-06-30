import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.resolve(__dirname, "AiServicesSettings.vue"), "utf-8");

describe("AiServicesSettings connection test wiring", () => {
  it("tests real service modes for Whisper, CosyVoice and HeyGem", () => {
    expect(source).toContain('mode: "whisper"');
    expect(source).toContain('mode: "cosyvoice"');
    expect(source).toContain('mode: "heygem"');
    expect(source).not.toContain(': ({ mode: "mock" } as const)');
  });

  it("does not test a custom provider through the default OpenAI URL when baseUrl is missing", () => {
    expect(source).toContain('config.provider === "custom" && !config.baseUrl?.trim()');
    expect(source).toContain("Custom provider Base URL 不能为空。");
  });
});

describe("AiServicesSettings readiness display wiring", () => {
  it("uses a readiness helper instead of enabled alone", () => {
    expect(source).toContain("getProviderReadiness");
  });

  it("renders disabled / needs-config / ready states", () => {
    expect(source).toContain("已停用");
    expect(source).toContain("需要配置");
    expect(source).toContain("已就绪");
  });

  it("filters needs-config from enabled providers with missing required fields", () => {
    expect(source).toContain('filter.value === "needs-config"');
    expect(source).toContain('"needs-config"');
  });
});
