import { describe, expect, it } from "vitest";
import {
  createApiKeyProviderConfig,
  createProjectDraft,
  sanitizeProviderConfigForStorage,
  validateProviderConfig,
  validateProjectDraft,
} from "../src/index.js";

describe("validation domain", () => {
  it("requires the user-owned API key provider fields used by the rebuilt desktop app", () => {
    const config = createApiKeyProviderConfig({
      id: "openai-main",
      label: "OpenAI 主账号",
      provider: "openai",
      apiKey: "sk-demo",
      baseUrl: "https://api.openai.com/v1",
    });

    expect(validateProviderConfig(config)).toEqual([]);
    expect(validateProviderConfig({ ...config, apiKey: "" })).toContain("请填写 API Key");
    expect(validateProviderConfig({ ...config, baseUrl: "not-a-url" })).toContain("Base URL 格式不正确");
  });

  it("allows local service providers without an API key", () => {
    for (const provider of ["whisper", "cosyvoice", "heygem"] as const) {
      const config = createApiKeyProviderConfig({
        id: provider,
        label: provider,
        provider,
        apiKey: "",
        baseUrl: `http://localhost:9000/${provider}`,
      });

      expect(validateProviderConfig(config)).toEqual([]);
    }
  });

  it("strips the API key and keeps only non-sensitive metadata for storage", () => {
    const config = createApiKeyProviderConfig({
      id: "openai-main",
      label: "OpenAI 主账号",
      provider: "openai",
      apiKey: "sk-secret",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4.1",
    });

    const metadata = sanitizeProviderConfigForStorage(config);

    expect(metadata).not.toHaveProperty("apiKey");
    expect(metadata).toEqual({
      id: "openai-main",
      label: "OpenAI 主账号",
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4.1",
      enabled: true,
    });
  });

  it("strips username, password, query and hash from baseUrl when persisting", () => {
    const config = createApiKeyProviderConfig({
      id: "leaky-url",
      label: "Leaky URL",
      provider: "custom",
      apiKey: "sk-secret",
      baseUrl: "https://user:pass@api.example.com:8443/v1/chat?token=secret-token#/hash",
      model: "gpt-4",
    });

    const metadata = sanitizeProviderConfigForStorage(config);

    expect(metadata.baseUrl).toBe("https://api.example.com:8443/v1/chat");
  });

  it("drops an invalid baseUrl during sanitization instead of leaking it", () => {
    const config = createApiKeyProviderConfig({
      id: "invalid-url",
      label: "Invalid URL",
      provider: "custom",
      apiKey: "sk-secret",
      baseUrl: "not-a-url",
      model: "gpt-4",
    });

    const metadata = sanitizeProviderConfigForStorage(config);

    expect(metadata.baseUrl).toBeUndefined();
  });

  it("validates the minimum project information required before generation starts", () => {
    const draft = createProjectDraft({
      name: "女装口播 0611",
      targetPlatforms: ["douyin", "xiaohongshu"],
      sourceVideoPath: "/tmp/source.mp4",
      voiceSamplePath: "/tmp/voice.wav",
    });

    expect(validateProjectDraft(draft)).toEqual([]);
    expect(validateProjectDraft({ ...draft, name: "" })).toContain("请填写项目名称");
    expect(validateProjectDraft({ ...draft, targetPlatforms: [] })).toContain("至少选择一个发布平台");
  });
});
