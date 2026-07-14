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

  it("requires API key for ElevenLabs TTS provider", () => {
    const config = createApiKeyProviderConfig({
      id: "elevenlabs-tts",
      label: "ElevenLabs TTS",
      provider: "elevenlabs-tts",
      apiKey: "",
      voiceId: "pNInz6obpgDQGcFmaJgB",
      model: "eleven_multilingual_v2",
    });

    expect(validateProviderConfig(config)).toContain("请填写 API Key");
    expect(validateProviderConfig({ ...config, apiKey: "el-secret" })).toEqual([]);
  });

  it("requires API key for BaiLian Qwen-TTS and CosyVoice providers", () => {
    for (const provider of ["bailian-qwen-tts", "bailian-cosyvoice"] as const) {
      const config = createApiKeyProviderConfig({
        id: provider,
        label: provider,
        provider,
        apiKey: "",
        baseUrl: "https://workspace.cn-beijing.maas.aliyuncs.com/api/v1",
        model: provider === "bailian-qwen-tts" ? "qwen3-tts-vc-2026-01-22" : "cosyvoice-v3.5-flash",
      });

      expect(validateProviderConfig(config)).toContain("请填写 API Key");
      expect(validateProviderConfig({ ...config, apiKey: "bailian-secret" })).toEqual([]);
    }
  });

  it("keeps voiceId in storage metadata because it is not sensitive", () => {
    const config = createApiKeyProviderConfig({
      id: "elevenlabs-tts",
      label: "ElevenLabs TTS",
      provider: "elevenlabs-tts",
      apiKey: "el-secret",
      voiceId: "pNInz6obpgDQGcFmaJgB",
      model: "eleven_multilingual_v2",
    });

    const metadata = sanitizeProviderConfigForStorage(config);

    expect(metadata).not.toHaveProperty("apiKey");
    expect(metadata.voiceId).toBe("pNInz6obpgDQGcFmaJgB");
  });

  it("validates project draft", () => {
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

  it("creates a stable project id when callers omit one", () => {
    const project = createProjectDraft({
      name: "新项目",
      targetPlatforms: ["douyin"],
    });

    expect(project.id).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("preserves the caller-provided project id", () => {
    const project = createProjectDraft({
      id: "custom-project-id",
      name: "新项目",
      targetPlatforms: ["douyin"],
    });

    expect(project.id).toBe("custom-project-id");
  });
});
