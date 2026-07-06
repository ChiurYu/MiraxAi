import { describe, expect, it } from "vitest";
import type { ApiKeyProviderConfig, WorkflowStageRuntimeMode } from "@mirax/core";
import { WhisperProvider, createMockAiProvider } from "@mirax/provider-ai";
import { selectTranscribeProvider } from "./useTranscribeProvider.js";

function makeConfig(overrides: Partial<ApiKeyProviderConfig> = {}): ApiKeyProviderConfig {
  return {
    id: "test",
    label: "Test",
    provider: "whisper",
    apiKey: "whisper-token",
    baseUrl: "https://whisper.example.com",
    model: "whisper-1",
    enabled: true,
    ...overrides,
  };
}

describe("selectTranscribeProvider", () => {
  const mockProvider = createMockAiProvider();

  function select(stageMode: WorkflowStageRuntimeMode, providerConfigs: ApiKeyProviderConfig[]) {
    return selectTranscribeProvider({ stageMode, providerConfigs, mockProvider });
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

  it("returns real provider for enabled whisper config", () => {
    const result = select("real", [makeConfig()]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.provider).toBeInstanceOf(WhisperProvider);
    }
  });

  it("sanitizes whisper baseUrl credentials, query and hash before constructing provider", () => {
    const result = select("real", [
      makeConfig({
        baseUrl: "https://user:pass@whisper.example.com/api?token=url-secret#/hash",
      }),
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const provider = result.provider as WhisperProvider;
      expect(provider.baseUrl).toBe("https://whisper.example.com/api");
    }
  });

  it("returns not-configured when no enabled transcribe provider exists", () => {
    const result = select("real", [makeConfig({ enabled: false })]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("not-configured");
    }
  });

  it("rejects non-transcribe providers", () => {
    const result = select("real", [
      makeConfig({ id: "o", provider: "openai", enabled: true }),
      makeConfig({ id: "c", provider: "cosyvoice", enabled: true }),
    ]);

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

  it("returns not-configured when model is empty", () => {
    const result = select("real", [makeConfig({ model: "" })]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("not-configured");
    }
  });

  it("returns not-configured when apiKey is empty", () => {
    const result = select("real", [makeConfig({ apiKey: "" })]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("not-configured");
    }
  });

  it("returns not-configured when model is not whisper-1", () => {
    const result = select("real", [makeConfig({ model: "gpt-4o-transcribe" })]);
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
