import { describe, expect, it } from "vitest";
import type { ApiKeyProviderConfig, WorkflowStageRuntimeMode } from "@mirax/core";
import { BaiLianTtsProvider, createMockAiProvider, ElevenLabsTtsProvider } from "@mirax/provider-ai";
import { selectVoiceCloneProvider } from "./useVoiceCloneProvider.js";

function makeConfig(overrides: Partial<ApiKeyProviderConfig> = {}): ApiKeyProviderConfig {
  return {
    id: "test",
    label: "Test",
    provider: "elevenlabs-tts",
    apiKey: "el-key",
    model: "eleven_multilingual_v2",
    enabled: true,
    ...overrides,
  };
}

describe("selectVoiceCloneProvider", () => {
  const mockProvider = createMockAiProvider();

  function select(stageMode: WorkflowStageRuntimeMode, providerConfigs: ApiKeyProviderConfig[], selectedProviderConfigId = "test") {
    return selectVoiceCloneProvider({ stageMode, providerConfigs, selectedProviderConfigId, mockProvider, readAudioFile: async () => new Uint8Array([1]) });
  }

  it("returns mock provider in mock mode", () => {
    const result = select("mock", []);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.provider).toBe(mockProvider);
    }
  });

  it("returns not-connected error in not-connected mode", () => {
    const result = select("not-connected", []);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("not-connected");
    }
  });

  it("returns only the explicitly selected ready ElevenLabs provider", () => {
    const result = select("real", [makeConfig()]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.provider).toBeInstanceOf(ElevenLabsTtsProvider);
    }
  });

  it("returns only the explicitly selected ready BaiLian Qwen provider", () => {
    const result = select("real", [makeConfig({
      provider: "bailian-qwen-tts",
      apiKey: "bailian-key",
      baseUrl: "https://workspace.cn-beijing.maas.aliyuncs.com/api/v1",
      model: "qwen3-tts-vc-2026-01-22",
    })]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.provider).toBeInstanceOf(BaiLianTtsProvider);
    }
  });

  it("uses the injected native JSON transport for a BaiLian Qwen clone", async () => {
    let requests = 0;
    const result = selectVoiceCloneProvider({
      stageMode: "real",
      providerConfigs: [makeConfig({
        provider: "bailian-qwen-tts",
        apiKey: "bailian-key",
        baseUrl: "https://workspace.cn-beijing.maas.aliyuncs.com/api/v1",
        model: "qwen3-tts-vc-2026-01-22",
      })],
      selectedProviderConfigId: "test",
      mockProvider,
      readAudioFile: async () => new Uint8Array([1]),
      baiLianFetchJson: async () => {
        requests += 1;
        return { status: 200, json: async () => ({ output: { voice: "qwen-voice-1" } }) };
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    await expect(result.provider.cloneVoice({ projectId: "project-1", voiceName: "中文声音", voiceSamplePath: "/managed/sample.mp3" }))
      .resolves.toMatchObject({ voiceId: "qwen-voice-1" });
    expect(requests).toBe(1);
  });

  it("rejects a BaiLian config without API Key, business-space URL, or model", () => {
    const base = makeConfig({
      provider: "bailian-cosyvoice",
      apiKey: "bailian-key",
      baseUrl: "https://workspace.cn-beijing.maas.aliyuncs.com/api/v1",
      model: "cosyvoice-v3.5-flash",
    });

    expect(select("real", [{ ...base, apiKey: "" }]).ok).toBe(false);
    expect(select("real", [{ ...base, baseUrl: "" }]).ok).toBe(false);
    expect(select("real", [{ ...base, model: "" }]).ok).toBe(false);
  });

  it("returns not-configured when the selected provider is absent, disabled, non-ElevenLabs, or lacks a credential", () => {
    expect(select("real", [], "missing").ok).toBe(false);
    const result = select("real", [makeConfig({ enabled: false })]);
    expect(result.ok).toBe(false);
    expect(select("real", [makeConfig({ provider: "cosyvoice" })]).ok).toBe(false);
    expect(select("real", [makeConfig({ apiKey: "" })]).ok).toBe(false);
  });

  it("does not fall back to mock in real mode", () => {
    const result = select("real", []);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("not-configured");
    }
  });
});
