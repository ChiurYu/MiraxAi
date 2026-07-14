import { describe, expect, it } from "vitest";
import { AiProviderError, createOpenAiCompatibleProvider } from "../src/index.js";
import type { OpenAiCompatibleTransport, OpenAiCompatibleTransportRequest, RewriteScriptResult } from "../src/index.js";

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

function createRecordingTransport(
  response: { status: number; body: unknown } = { status: 200, body: chatCompletionResponse(JSON.stringify({ script: "ok" })) },
): { transport: OpenAiCompatibleTransport; requests: OpenAiCompatibleTransportRequest[] } {
  const requests: OpenAiCompatibleTransportRequest[] = [];
  return {
    transport: {
      async request(req) {
        requests.push(req);
        return {
          status: response.status,
          json: async () => response.body,
        };
      },
    },
    requests,
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

  it("sends explicit goal, preset and length constraints in the user prompt", async () => {
    const resultJson: RewriteScriptResult = {
      script: "口语化种草脚本。",
      titleSuggestions: ["标题一"],
      coverTextSuggestions: ["封面一"],
    };
    const { transport, requests } = createRecordingTransport({
      status: 200,
      body: chatCompletionResponse(JSON.stringify(resultJson)),
    });

    const provider = createOpenAiCompatibleProvider({
      apiKey: "sk-test",
      model: "gpt-4",
      transport,
    });

    await provider.rewriteScript({
      transcript: "原始文案",
      productName: "通勤包",
      sellingPoints: ["大容量"],
      activeGoal: "更口语化",
      activePreset: "小红书种草风格 (Emoji Enhanced)",
      targetLength: 80,
    });

    expect(requests).toHaveLength(1);
    const userPrompt = extractUserPrompt(requests[0]);
    expect(userPrompt).toContain("改写目标：更口语化");
    expect(userPrompt).toContain("句子更短、更顺口");
    expect(userPrompt).toContain("风格模板：小红书种草风格 (Emoji Enhanced)");
    expect(userPrompt).toContain("种草感强");
    expect(userPrompt).toContain("目标长度：约 80 个汉字");
  });

  it("sends fact boundary that forbids invented product claims", async () => {
    const { transport, requests } = createRecordingTransport({
      status: 200,
      body: chatCompletionResponse(JSON.stringify({ script: "ok" })),
    });

    const provider = createOpenAiCompatibleProvider({
      apiKey: "sk-test",
      model: "gpt-4",
      transport,
    });

    await provider.rewriteScript({
      transcript: "原始文案",
      productName: "通勤包",
      sellingPoints: ["大容量"],
      activeGoal: "更专业",
      activePreset: "B站测评硬核风格",
      targetLength: 120,
    });

    const userPrompt = extractUserPrompt(requests[0]);
    expect(userPrompt).toContain("事实边界");
    expect(userPrompt).toContain("不得编造产品参数、价格、资质、效果、销量、用户评价等未提及的内容");
    expect(userPrompt).toContain("不编造参数或测试数据");
  });

  it("preserves unknown goal and preset labels with safe fallback", async () => {
    const { transport, requests } = createRecordingTransport({
      status: 200,
      body: chatCompletionResponse(JSON.stringify({ script: "ok" })),
    });

    const provider = createOpenAiCompatibleProvider({
      apiKey: "sk-test",
      model: "gpt-4",
      transport,
    });

    await provider.rewriteScript({
      transcript: "原始文案",
      productName: "通勤包",
      sellingPoints: ["大容量"],
      activeGoal: "未来目标",
      activePreset: "未来风格",
    });

    const userPrompt = extractUserPrompt(requests[0]);
    expect(userPrompt).toContain("改写目标：未来目标");
    expect(userPrompt).toContain("用户选择「未来目标」");
    expect(userPrompt).toContain("风格模板：未来风格");
    expect(userPrompt).toContain("用户选择「未来风格」");
  });

  it("uses relaxed length guidance when targetLength is omitted", async () => {
    const { transport, requests } = createRecordingTransport({
      status: 200,
      body: chatCompletionResponse(JSON.stringify({ script: "ok" })),
    });

    const provider = createOpenAiCompatibleProvider({
      apiKey: "sk-test",
      model: "gpt-4",
      transport,
    });

    await provider.rewriteScript({
      transcript: "原始文案",
      productName: "通勤包",
      sellingPoints: ["大容量"],
      activeGoal: "保持原意",
      activePreset: "高端奢侈品发布语调",
    });

    const userPrompt = extractUserPrompt(requests[0]);
    expect(userPrompt).toContain("目标长度：不强制精确字数");
    expect(userPrompt).not.toContain("约 0 个汉字");
  });
});

function extractUserPrompt(req: OpenAiCompatibleTransportRequest): string {
  const body = req.body as { messages?: Array<{ role: string; content?: string }> } | undefined;
  const message = body?.messages?.find((m) => m.role === "user");
  if (!message?.content || typeof message.content !== "string") {
    throw new Error("User prompt not found in request body");
  }
  return message.content;
}
