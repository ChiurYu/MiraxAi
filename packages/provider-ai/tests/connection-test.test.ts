import { describe, expect, it } from "vitest";
import { testAiProviderConnection } from "../src/index";

describe("ai provider connection test", () => {
  it("returns success for mock mode", async () => {
    await expect(testAiProviderConnection({ mode: "mock" })).resolves.toEqual({
      ok: true,
      message: "Mock Provider 可用",
    });
  });

  it("returns unwired state for openai-compatible mode", async () => {
    await expect(
      testAiProviderConnection({
        mode: "openai-compatible",
        baseUrl: "https://api.openai.com/v1",
        apiKey: "sk-demo",
        model: "gpt-4.1",
      }),
    ).resolves.toEqual({
      ok: false,
      message: "OpenAI-compatible provider 尚未接入，MVP 请使用 Mock Provider。",
    });
  });
});
