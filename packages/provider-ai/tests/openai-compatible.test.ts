import { describe, expect, it } from "vitest";
import { AiProviderError, createOpenAiCompatibleProvider } from "../src/index.js";
import type { OpenAiCompatibleTransport, RewriteScriptResult } from "../src/index.js";

function createFakeTransport(
  scenarios: Array<{
    match?: { method?: string; endpoint?: string };
    response: { status: number; body: unknown };
  }>,
): OpenAiCompatibleTransport {
  let index = 0;
  return {
    async request(req) {
      const scenario = scenarios[index++];
      if (scenario?.match) {
        if (scenario.match.method && req.method !== scenario.match.method) {
          throw new Error(`Expected ${scenario.match.method} but got ${req.method}`);
        }
        if (scenario.match.endpoint && !req.endpoint.includes(scenario.match.endpoint)) {
          throw new Error(`Expected endpoint matching ${scenario.match.endpoint} but got ${req.endpoint}`);
        }
      }
      return {
        status: scenario.response.status,
        json: async () => scenario.response.body,
      };
    },
  };
}

function chatCompletionResponse(content: string): unknown {
  return {
    choices: [{ message: { role: "assistant", content } }],
  };
}

describe("openai-compatible provider", () => {
  it("rewrites script using injected fake transport", async () => {
    const resultJson: RewriteScriptResult = {
      script: "改写后的口播脚本。",
      titleSuggestions: ["标题一", "标题二", "标题三"],
      coverTextSuggestions: ["封面一", "封面二"],
    };

    const transport = createFakeTransport([
      {
        match: { method: "POST", endpoint: "/chat/completions" },
        response: { status: 200, body: chatCompletionResponse(JSON.stringify(resultJson)) },
      },
    ]);

    const provider = createOpenAiCompatibleProvider({
      baseUrl: "https://api.example.com/v1",
      apiKey: "sk-test",
      model: "gpt-4",
      transport,
    });

    const result = await provider.rewriteScript({
      transcript: "原始文案",
      productName: "通勤包",
      sellingPoints: ["大容量"],
    });

    expect(result.script).toBe(resultJson.script);
    expect(result.titleSuggestions).toEqual(resultJson.titleSuggestions);
    expect(result.coverTextSuggestions).toEqual(resultJson.coverTextSuggestions);
  });

  it("returns unauthorized on 401", async () => {
    const transport = createFakeTransport([
      {
        response: { status: 401, body: { error: { message: "Invalid key" } } },
      },
    ]);

    const provider = createOpenAiCompatibleProvider({
      apiKey: "sk-test",
      model: "gpt-4",
      transport,
    });

    await expect(
      provider.rewriteScript({ transcript: "原始文案", productName: "通勤包", sellingPoints: [] }),
    ).rejects.toMatchObject({ code: "unauthorized" });
  });

  it("returns unauthorized on 403", async () => {
    const transport = createFakeTransport([{ response: { status: 403, body: { error: "Forbidden" } } }]);

    const provider = createOpenAiCompatibleProvider({
      apiKey: "sk-test",
      model: "gpt-4",
      transport,
    });

    await expect(
      provider.rewriteScript({ transcript: "原始文案", productName: "通勤包", sellingPoints: [] }),
    ).rejects.toMatchObject({ code: "unauthorized" });
  });

  it("returns network error when transport fails", async () => {
    const transport: OpenAiCompatibleTransport = {
      async request() {
        throw new TypeError("fetch failed");
      },
    };

    const provider = createOpenAiCompatibleProvider({
      apiKey: "sk-test",
      model: "gpt-4",
      transport,
    });

    await expect(
      provider.rewriteScript({ transcript: "原始文案", productName: "通勤包", sellingPoints: [] }),
    ).rejects.toMatchObject({ code: "network" });
  });

  it("returns bad-response when content is not valid JSON", async () => {
    const transport = createFakeTransport([
      {
        response: { status: 200, body: chatCompletionResponse("not json") },
      },
    ]);

    const provider = createOpenAiCompatibleProvider({
      apiKey: "sk-test",
      model: "gpt-4",
      transport,
    });

    await expect(
      provider.rewriteScript({ transcript: "原始文案", productName: "通勤包", sellingPoints: [] }),
    ).rejects.toMatchObject({ code: "bad-response" });
  });

  it("returns bad-response when content JSON lacks script", async () => {
    const transport = createFakeTransport([
      {
        response: { status: 200, body: chatCompletionResponse(JSON.stringify({ titleSuggestions: [] })) },
      },
    ]);

    const provider = createOpenAiCompatibleProvider({
      apiKey: "sk-test",
      model: "gpt-4",
      transport,
    });

    await expect(
      provider.rewriteScript({ transcript: "原始文案", productName: "通勤包", sellingPoints: [] }),
    ).rejects.toMatchObject({ code: "bad-response" });
  });

  it("returns bad-response on non-2xx HTTP status", async () => {
    const transport = createFakeTransport([{ response: { status: 500, body: { error: "Server error" } } }]);

    const provider = createOpenAiCompatibleProvider({
      apiKey: "sk-test",
      model: "gpt-4",
      transport,
    });

    await expect(
      provider.rewriteScript({ transcript: "原始文案", productName: "通勤包", sellingPoints: [] }),
    ).rejects.toMatchObject({ code: "bad-response" });
  });

  it("throws not-configured when apiKey is missing", () => {
    let caught: unknown;
    try {
      createOpenAiCompatibleProvider({ apiKey: "", model: "gpt-4" });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(AiProviderError);
    expect((caught as AiProviderError).code).toBe("not-configured");
  });

  it("throws not-configured when model is missing", () => {
    let caught: unknown;
    try {
      createOpenAiCompatibleProvider({ apiKey: "sk-test", model: "" });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(AiProviderError);
    expect((caught as AiProviderError).code).toBe("not-configured");
  });
});
