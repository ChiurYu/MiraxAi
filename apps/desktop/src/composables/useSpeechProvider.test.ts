import { describe, expect, it } from "vitest";
import type { ApiKeyProviderConfig, WorkflowStageRuntimeMode } from "@mirax/core";
import { BaiLianTtsProvider, CosyVoiceProvider, createMockAiProvider, ElevenLabsTtsProvider } from "@mirax/provider-ai";
import { buildSpeechOutputPath, selectSpeechProvider } from "./useSpeechProvider.js";

function makeConfig(overrides: Partial<ApiKeyProviderConfig> = {}): ApiKeyProviderConfig {
  return {
    id: "test",
    label: "Test",
    provider: "cosyvoice",
    apiKey: "tts-token",
    baseUrl: "https://cosyvoice.example.com",
    model: "cosyvoice-v1",
    enabled: true,
    ...overrides,
  };
}

describe("selectSpeechProvider", () => {
  const mockProvider = createMockAiProvider();
  const fakeWriteFile = async () => undefined;
  const fakeReadDuration = async () => 1.0;

  function select(stageMode: WorkflowStageRuntimeMode, providerConfigs: ApiKeyProviderConfig[], deps?: { writeFile?: typeof fakeWriteFile; readDuration?: typeof fakeReadDuration }) {
    return selectSpeechProvider({ stageMode, providerConfigs, mockProvider, writeFile: deps?.writeFile, readDuration: deps?.readDuration });
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

  it("returns real provider for enabled cosyvoice config", () => {
    const result = select("real", [makeConfig()]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.provider).toBeInstanceOf(CosyVoiceProvider);
    }
  });

  it("sanitizes cosyvoice baseUrl credentials, query and hash before constructing provider", () => {
    const result = select("real", [
      makeConfig({
        baseUrl: "https://user:pass@cosyvoice.example.com/api?token=url-secret#/hash",
      }),
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const provider = result.provider as CosyVoiceProvider;
      expect(provider.baseUrl).toBe("https://cosyvoice.example.com/api");
    }
  });

  it("returns not-configured when no enabled speech provider exists", () => {
    const result = select("real", [makeConfig({ enabled: false })]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("not-configured");
    }
  });

  it("rejects non-speech providers", () => {
    const result = select("real", [
      makeConfig({ id: "o", provider: "openai", enabled: true }),
      makeConfig({ id: "h", provider: "heygem", enabled: true }),
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("not-configured");
    }
  });

  it("allows empty apiKey for local cosyvoice service", () => {
    const result = select("real", [makeConfig({ apiKey: "" })]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.provider).toBeInstanceOf(CosyVoiceProvider);
    }
  });

  it("returns not-configured when baseUrl is missing", () => {
    const result = select("real", [makeConfig({ baseUrl: undefined })]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("not-configured");
    }
  });

  it("returns not-configured when baseUrl is invalid", () => {
    const result = select("real", [makeConfig({ baseUrl: "not-a-url" })]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("not-configured");
    }
  });

  it("returns real ElevenLabs provider for enabled elevenlabs-tts config", () => {
    const result = select("real", [
      makeConfig({ provider: "elevenlabs-tts", baseUrl: undefined, apiKey: "el-key", voiceId: "vid", model: "m" }),
    ], { writeFile: fakeWriteFile, readDuration: fakeReadDuration });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.provider).toBeInstanceOf(ElevenLabsTtsProvider);
    }
  });

  it("uses the injected native JSON transport for BaiLian synthesis", async () => {
    let requests = 0;
    const result = selectSpeechProvider({
      stageMode: "real",
      providerConfigs: [makeConfig({
        provider: "bailian-qwen-tts",
        apiKey: "bailian-key",
        baseUrl: "https://workspace.cn-beijing.maas.aliyuncs.com/api/v1",
        model: "qwen3-tts-vc-2026-01-22",
      })],
      mockProvider,
      writeFile: fakeWriteFile,
      readDuration: fakeReadDuration,
      baiLianFetchJson: async () => {
        requests += 1;
        return { status: 401, json: async () => ({}) };
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    await expect(result.provider.synthesizeSpeech({ projectId: "project-1", voiceId: "voice-1", script: "你好", outputPath: "/audio/speech.wav" }))
      .rejects.toMatchObject({ code: "unauthorized" });
    expect(requests).toBe(1);
  });

  it("returns not-configured for elevenlabs-tts when writeFile/readDuration are not injected", () => {
    const result = select("real", [
      makeConfig({ provider: "elevenlabs-tts", baseUrl: undefined, apiKey: "el-key", voiceId: "vid", model: "m" }),
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("not-configured");
    }
  });

  it("returns not-configured for elevenlabs-tts when apiKey or model is missing, while allowing the resolver to decide Voice ID", () => {
    const missingKey = select("real", [
      makeConfig({ provider: "elevenlabs-tts", baseUrl: undefined, apiKey: "", voiceId: "vid", model: "m" }),
    ], { writeFile: fakeWriteFile, readDuration: fakeReadDuration });
    expect(missingKey.ok).toBe(false);

    const noDefaultVoice = select("real", [
      makeConfig({ provider: "elevenlabs-tts", baseUrl: undefined, apiKey: "key", voiceId: "", model: "m" }),
    ], { writeFile: fakeWriteFile, readDuration: fakeReadDuration });
    expect(noDefaultVoice.ok).toBe(true);

    const missingModel = select("real", [
      makeConfig({ provider: "elevenlabs-tts", baseUrl: undefined, apiKey: "key", voiceId: "vid", model: "" }),
    ], { writeFile: fakeWriteFile, readDuration: fakeReadDuration });
    expect(missingModel.ok).toBe(false);
  });

  it("does not require baseUrl for elevenlabs-tts", () => {
    const result = select("real", [
      makeConfig({ provider: "elevenlabs-tts", baseUrl: undefined, apiKey: "el-key", voiceId: "vid", model: "m" }),
    ], { writeFile: fakeWriteFile, readDuration: fakeReadDuration });

    expect(result.ok).toBe(true);
  });

  it("returns a real BaiLian provider for the explicitly selected Qwen configuration", () => {
    const result = selectSpeechProvider({
      stageMode: "real",
      providerConfigs: [
        makeConfig({ id: "local", provider: "cosyvoice" }),
        makeConfig({ id: "qwen", provider: "bailian-qwen-tts", apiKey: "bailian-key", baseUrl: "https://workspace.cn-beijing.maas.aliyuncs.com/api/v1", model: "qwen3-tts-vc-2026-01-22" }),
      ],
      selectedProviderConfigId: "qwen",
      mockProvider,
      writeFile: fakeWriteFile,
      readDuration: fakeReadDuration,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.provider).toBeInstanceOf(BaiLianTtsProvider);
  });

  it("does not fall back to mock in real mode", () => {
    const result = select("real", []);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("not-configured");
    }
  });
});

describe("buildSpeechOutputPath", () => {
  it("builds a stable speech artifact path under audio output", () => {
    expect(buildSpeechOutputPath("/Users/Shared/MiraxAI/audio", "project-1")).toBe(
      "/Users/Shared/MiraxAI/audio/project-1/speech/speech.wav",
    );
  });

  it("builds an mp3 path for elevenlabs-tts", () => {
    expect(buildSpeechOutputPath("/Users/Shared/MiraxAI/audio", "project-1", "elevenlabs-tts")).toBe(
      "/Users/Shared/MiraxAI/audio/project-1/speech/speech.mp3",
    );
  });

  it("trims duplicate slashes around path segments", () => {
    expect(buildSpeechOutputPath("/tmp/audio/", "/project-1/")).toBe("/tmp/audio/project-1/speech/speech.wav");
  });
});
