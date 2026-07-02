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

  it("renders disabled / needs-config / untested states", () => {
    expect(source).toContain("已停用");
    expect(source).toContain("需要配置");
    expect(source).toContain("待测试");
  });

  it("filters needs-config from enabled providers with missing required fields", () => {
    expect(source).toContain('filter.value === "needs-config"');
    expect(source).toContain('"needs-config"');
  });
});

describe("AiServicesSettings connection-passed status", () => {
  it("tracks verified status through useAppSettings", () => {
    expect(source).toContain("markProviderVerified");
    expect(source).toContain("clearProviderVerified");
    expect(source).toContain("isProviderVerified");
  });

  it("only labels providers connected after a successful test", () => {
    expect(source).toContain("isProviderVerified");
    expect(source).toContain("连接正常");
  });

  it("clears verified state when a provider is saved, toggled or deleted", () => {
    expect(source).toContain("clearProviderVerified");
  });
});

describe("AiServicesSettings connection-failed status", () => {
  it("tracks failed connection test IDs through useAppSettings", () => {
    expect(source).toContain("markProviderFailed");
    expect(source).toContain("clearProviderFailed");
    expect(source).toContain("isProviderFailed");
    expect(source).not.toContain("failedConfigIds");
  });

  it("renders a connection-failed state label", () => {
    expect(source).toContain("连接失败");
    expect(source).toContain('.provider-status.failed');
  });

  it("includes failed providers in the failed filter", () => {
    expect(source).toContain('filter.value === "failed"');
  });

  it("clears the failed state on a successful retry", () => {
    expect(source).toContain("clearProviderFailed(config.id)");
  });
});

describe("AiServicesSettings API key editing boundary", () => {
  it("does not present restored empty API keys as reusable saved secrets", () => {
    expect(source).toContain("apiKeyFieldName");
    expect(source).toContain('autocomplete="new-password"');
    expect(source).toContain("刷新后 API Key 不会保留");
    expect(source).not.toContain('autocomplete="off"');
  });
});
