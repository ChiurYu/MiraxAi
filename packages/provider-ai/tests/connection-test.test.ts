import { describe, expect, it } from "vitest";
import { testAiProviderConnection } from "../src/index.js";
import type { OpenAiCompatibleTransport } from "../src/index.js";

function createFakeTransport(
  scenarios: Array<{ response: { status: number; body: unknown } }>,
): OpenAiCompatibleTransport {
  let index = 0;
  return {
    async request() {
      const scenario = scenarios[index++];
      return {
        status: scenario.response.status,
        json: async () => scenario.response.body,
      };
    },
  };
}

describe("ai provider connection test", () => {
  it("returns success for mock mode", async () => {
    const result = await testAiProviderConnection({ mode: "mock" });
    expect(result).toEqual({ ok: true, message: "Mock Provider 可用" });
    expect(result.code).toBeUndefined();
  });

  it("returns success for openai-compatible mode when transport returns 200", async () => {
    const transport = createFakeTransport([{ response: { status: 200, body: { data: [] } } }]);

    const result = await testAiProviderConnection({
      mode: "openai-compatible",
      baseUrl: "https://api.example.com/v1",
      apiKey: "sk-test",
      model: "gpt-4",
      transport,
    });

    expect(result.ok).toBe(true);
    expect(result.message).toContain("连接正常");
    expect(result.code).toBeUndefined();
  });

  it("returns not-configured when apiKey is empty", async () => {
    const result = await testAiProviderConnection({
      mode: "openai-compatible",
      apiKey: "",
      model: "gpt-4",
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe("not-configured");
  });

  it("returns not-configured when model is empty", async () => {
    const result = await testAiProviderConnection({
      mode: "openai-compatible",
      apiKey: "sk-test",
      model: "",
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe("not-configured");
  });

  it("returns unauthorized for 401", async () => {
    const transport = createFakeTransport([{ response: { status: 401, body: { error: "Invalid key" } } }]);

    const result = await testAiProviderConnection({
      mode: "openai-compatible",
      apiKey: "sk-test",
      model: "gpt-4",
      transport,
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe("unauthorized");
    expect(result.message).toContain("API key");
  });

  it("returns unauthorized for 403", async () => {
    const transport = createFakeTransport([{ response: { status: 403, body: { error: "Forbidden" } } }]);

    const result = await testAiProviderConnection({
      mode: "openai-compatible",
      apiKey: "sk-test",
      model: "gpt-4",
      transport,
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe("unauthorized");
    expect(result.message).toContain("API key");
  });

  it("returns bad-response for non-2xx", async () => {
    const transport = createFakeTransport([{ response: { status: 500, body: { error: "Server error" } } }]);

    const result = await testAiProviderConnection({
      mode: "openai-compatible",
      apiKey: "sk-test",
      model: "gpt-4",
      transport,
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe("bad-response");
    expect(result.message).toContain("500");
  });

  it("returns bad-response when response JSON is invalid", async () => {
    const transport: OpenAiCompatibleTransport = {
      async request() {
        return {
          status: 200,
          json: async () => {
            throw new SyntaxError("Unexpected token");
          },
        };
      },
    };

    const result = await testAiProviderConnection({
      mode: "openai-compatible",
      apiKey: "sk-test",
      model: "gpt-4",
      transport,
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe("bad-response");
  });

  it("returns network when transport throws", async () => {
    const transport: OpenAiCompatibleTransport = {
      async request() {
        throw new TypeError("fetch failed");
      },
    };

    const result = await testAiProviderConnection({
      mode: "openai-compatible",
      apiKey: "sk-test",
      model: "gpt-4",
      transport,
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe("network");
  });

  it("does not leak apiKey or baseUrl token in messages", async () => {
    const transport = createFakeTransport([{ response: { status: 200, body: { data: [] } } }]);
    const leakedBaseUrl = "https://api.example.com/v1?token=secret";

    const result = await testAiProviderConnection({
      mode: "openai-compatible",
      baseUrl: leakedBaseUrl,
      apiKey: "sk-secret-key",
      model: "gpt-4",
      transport,
    });

    expect(result.ok).toBe(true);
    expect(result.message).not.toContain("sk-secret-key");
    expect(result.message).not.toContain("secret");
    expect(result.message).not.toContain(leakedBaseUrl);
  });
});
