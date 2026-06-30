import { describe, expect, it } from "vitest";
import type { ApiKeyProviderConfig, WorkflowStageRuntimeMode } from "@mirax/core";
import { CosyVoiceProvider, createMockAiProvider } from "@mirax/provider-ai";
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

  function select(stageMode: WorkflowStageRuntimeMode, providerConfigs: ApiKeyProviderConfig[]) {
    return selectSpeechProvider({ stageMode, providerConfigs, mockProvider });
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

  it("trims duplicate slashes around path segments", () => {
    expect(buildSpeechOutputPath("/tmp/audio/", "/project-1/")).toBe("/tmp/audio/project-1/speech/speech.wav");
  });
});
