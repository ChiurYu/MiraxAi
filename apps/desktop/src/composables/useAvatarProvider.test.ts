import { describe, expect, it } from "vitest";
import type { ApiKeyProviderConfig, WorkflowStageRuntimeMode } from "@mirax/core";
import { HeyGemProvider, createMockAiProvider } from "@mirax/provider-ai";
import { buildAvatarOutputPath, selectAvatarProvider } from "./useAvatarProvider.js";

function makeConfig(overrides: Partial<ApiKeyProviderConfig> = {}): ApiKeyProviderConfig {
  return {
    id: "test",
    label: "Test",
    provider: "heygem",
    apiKey: "heygem-token",
    baseUrl: "https://heygem.example.com",
    model: "heygem-v1",
    enabled: true,
    ...overrides,
  };
}

describe("selectAvatarProvider", () => {
  const mockProvider = createMockAiProvider();

  function select(stageMode: WorkflowStageRuntimeMode, providerConfigs: ApiKeyProviderConfig[]) {
    return selectAvatarProvider({ stageMode, providerConfigs, mockProvider });
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

  it("returns real provider for enabled heygem config", () => {
    const result = select("real", [makeConfig()]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.provider).toBeInstanceOf(HeyGemProvider);
    }
  });

  it("sanitizes heygem baseUrl credentials, query and hash before constructing provider", () => {
    const result = select("real", [
      makeConfig({ baseUrl: "https://user:pass@heygem.example.com/api?token=url-secret#/hash" }),
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const provider = result.provider as HeyGemProvider;
      expect(provider.baseUrl).toBe("https://heygem.example.com/api");
    }
  });

  it("returns not-configured when no enabled avatar provider exists", () => {
    const result = select("real", [makeConfig({ enabled: false })]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("not-configured");
    }
  });

  it("rejects non-avatar providers", () => {
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

  it("allows empty apiKey for local heygem service", () => {
    const result = select("real", [makeConfig({ apiKey: "" })]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.provider).toBeInstanceOf(HeyGemProvider);
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

describe("buildAvatarOutputPath", () => {
  it("creates a stable avatar output path", () => {
    expect(buildAvatarOutputPath("/Users/Shared/MiraxAI/video", "demo-project")).toBe(
      "/Users/Shared/MiraxAI/video/demo-project/avatar/avatar.mp4",
    );
  });
});
