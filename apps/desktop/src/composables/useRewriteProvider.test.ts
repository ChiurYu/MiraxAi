import { describe, expect, it } from "vitest";
import type { ApiKeyProviderConfig, WorkflowStageRuntimeMode } from "@mirax/core";
import { createMockAiProvider } from "@mirax/provider-ai";
import { selectRewriteProvider } from "./useRewriteProvider.js";

function makeConfig(overrides: Partial<ApiKeyProviderConfig> = {}): ApiKeyProviderConfig {
  return {
    id: "test",
    label: "Test",
    provider: "openai",
    apiKey: "sk-test",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4",
    enabled: true,
    ...overrides,
  };
}

describe("selectRewriteProvider", () => {
  const mockProvider = createMockAiProvider();

  it("returns mock provider in mock mode", () => {
    const result = selectRewriteProvider({
      stageMode: "mock",
      providerConfigs: [],
      mockProvider,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.provider).toBe(mockProvider);
    }
  });

  it("returns not-connected error in not-connected mode", () => {
    const result = selectRewriteProvider({
      stageMode: "not-connected",
      providerConfigs: [],
      mockProvider,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("not-connected");
    }
  });

  it("returns real provider for enabled openai config", () => {
    const result = selectRewriteProvider({
      stageMode: "real",
      providerConfigs: [makeConfig()],
      mockProvider,
    });

    expect(result.ok).toBe(true);
  });

  it("returns real provider for enabled custom config with baseUrl", () => {
    const result = selectRewriteProvider({
      stageMode: "real",
      providerConfigs: [makeConfig({ provider: "custom", baseUrl: "https://custom.example.com/v1" })],
      mockProvider,
    });

    expect(result.ok).toBe(true);
  });

  it("returns not-configured when custom config lacks baseUrl", () => {
    const result = selectRewriteProvider({
      stageMode: "real",
      providerConfigs: [makeConfig({ provider: "custom", baseUrl: undefined })],
      mockProvider,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("not-configured");
    }
  });

  it("returns not-configured when no enabled config", () => {
    const result = selectRewriteProvider({
      stageMode: "real",
      providerConfigs: [makeConfig({ enabled: false })],
      mockProvider,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("not-configured");
    }
  });

  it("rejects whisper provider for rewrite", () => {
    const result = selectRewriteProvider({
      stageMode: "real",
      providerConfigs: [makeConfig({ provider: "whisper" })],
      mockProvider,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("not-configured");
    }
  });

  it("rejects cosyvoice provider for rewrite", () => {
    const result = selectRewriteProvider({
      stageMode: "real",
      providerConfigs: [makeConfig({ provider: "cosyvoice" })],
      mockProvider,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("not-configured");
    }
  });

  it("rejects heygem provider for rewrite", () => {
    const result = selectRewriteProvider({
      stageMode: "real",
      providerConfigs: [makeConfig({ provider: "heygem" })],
      mockProvider,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("not-configured");
    }
  });

  it("returns not-configured when apiKey is empty", () => {
    const result = selectRewriteProvider({
      stageMode: "real",
      providerConfigs: [makeConfig({ apiKey: "" })],
      mockProvider,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("not-configured");
    }
  });

  it("returns not-configured when model is empty", () => {
    const result = selectRewriteProvider({
      stageMode: "real",
      providerConfigs: [makeConfig({ model: "" })],
      mockProvider,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("not-configured");
    }
  });

  it("selects first enabled openai/custom provider when other providers are enabled earlier", () => {
    const result = selectRewriteProvider({
      stageMode: "real",
      providerConfigs: [
        makeConfig({ id: "w", provider: "whisper", enabled: true }),
        makeConfig({ id: "o", provider: "openai", enabled: true }),
      ],
      mockProvider,
    });

    expect(result.ok).toBe(true);
  });

  it("returns not-configured when only non-rewrite providers are enabled", () => {
    const result = selectRewriteProvider({
      stageMode: "real",
      providerConfigs: [
        makeConfig({ id: "c", provider: "cosyvoice", enabled: true }),
        makeConfig({ id: "h", provider: "heygem", enabled: true }),
      ],
      mockProvider,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("not-configured");
    }
  });

  it("does not fall back to mock in real mode", () => {
    const result = selectRewriteProvider({
      stageMode: "real",
      providerConfigs: [],
      mockProvider,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("not-configured");
    }
  });
});
