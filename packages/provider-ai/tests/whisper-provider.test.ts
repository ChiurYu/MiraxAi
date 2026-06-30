import { describe, expect, it } from "vitest";
import { AiProviderError, createWhisperProvider } from "../src/index.js";
import type { OpenAiCompatibleTransport } from "../src/index.js";

function createFakeTransport(
  scenarios: Array<{
    response: { status: number; body: unknown };
  }>,
): OpenAiCompatibleTransport {
  let index = 0;
  return {
    async request() {
      const scenario = scenarios[index++];
      if (!scenario) {
        throw new Error("Unexpected request");
      }
      return {
        status: scenario.response.status,
        json: async () => scenario.response.body,
      };
    },
  };
}

describe("whisper provider", () => {
  it("transcribes using injected fake service", async () => {
    let requestBody: unknown;
    const transport: OpenAiCompatibleTransport = {
      async request(req) {
        expect(req.method).toBe("POST");
        expect(req.endpoint).toContain("/transcribe");
        requestBody = req.body;
        return {
          status: 200,
          json: async () => ({
            text: "真实转写文案",
            segments: [{ startSeconds: 0, endSeconds: 3, text: "真实转写文案" }],
          }),
        };
      },
    };

    const provider = createWhisperProvider({
      baseUrl: "https://whisper.example.com",
      apiKey: "secret-token",
      model: "whisper-v3",
      transport,
    });

    const result = await provider.transcribe({
      sourceVideoPath: "/tmp/source.mp4",
      language: "zh-CN",
    });

    expect(result.text).toBe("真实转写文案");
    expect(result.segments).toEqual([{ startSeconds: 0, endSeconds: 3, text: "真实转写文案" }]);
    expect(requestBody).toMatchObject({
      sourceVideoPath: "/tmp/source.mp4",
      language: "zh-CN",
      model: "whisper-v3",
    });
  });

  it("rejects missing source before contacting service", async () => {
    const provider = createWhisperProvider({
      baseUrl: "https://whisper.example.com",
      model: "whisper-v3",
      transport: {
        async request() {
          throw new Error("should not be called");
        },
      },
    });

    await expect(provider.transcribe({ sourceVideoPath: "", language: "zh-CN" })).rejects.toMatchObject({
      code: "not-configured",
    });
  });

  it("returns unauthorized on 401", async () => {
    const provider = createWhisperProvider({
      baseUrl: "https://whisper.example.com",
      apiKey: "secret-token",
      model: "whisper-v3",
      transport: createFakeTransport([{ response: { status: 401, body: { error: "bad token" } } }]),
    });

    await expect(provider.transcribe({ sourceVideoPath: "/tmp/source.mp4" })).rejects.toMatchObject({
      code: "unauthorized",
    });
  });

  it("returns transcribe-failed when response has no text", async () => {
    const provider = createWhisperProvider({
      baseUrl: "https://whisper.example.com",
      model: "whisper-v3",
      transport: createFakeTransport([{ response: { status: 200, body: { segments: [] } } }]),
    });

    await expect(provider.transcribe({ sourceVideoPath: "/tmp/source.mp4" })).rejects.toMatchObject({
      code: "transcribe-failed",
    });
  });

  it("returns transcribe-failed when response segments are invalid", async () => {
    const provider = createWhisperProvider({
      baseUrl: "https://whisper.example.com",
      model: "whisper-v3",
      transport: createFakeTransport([{ response: { status: 200, body: { text: "文案", segments: [{ text: "文案" }] } } }]),
    });

    await expect(provider.transcribe({ sourceVideoPath: "/tmp/source.mp4" })).rejects.toMatchObject({
      code: "transcribe-failed",
    });
  });

  it("does not leak token or baseUrl token in errors", async () => {
    let requestedEndpoint = "";
    const provider = createWhisperProvider({
      baseUrl: "https://whisper.example.com?token=url-secret",
      apiKey: "secret-token",
      model: "whisper-v3",
      transport: {
        async request(req) {
          requestedEndpoint = req.endpoint;
          return {
            status: 500,
            json: async () => ({ error: "server exploded" }),
          };
        },
      },
    });

    let caught: unknown;
    try {
      await provider.transcribe({ sourceVideoPath: "/tmp/source.mp4" });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AiProviderError);
    expect(requestedEndpoint).not.toContain("url-secret");
    expect((caught as Error).message).not.toContain("secret-token");
    expect((caught as Error).message).not.toContain("url-secret");
  });
});
