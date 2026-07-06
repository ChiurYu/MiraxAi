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
  it("transcribes audio file via OpenAI audio/transcriptions", async () => {
    let requestBody: unknown;
    let requestEndpoint = "";
    const transport: OpenAiCompatibleTransport = {
      async request(req) {
        expect(req.method).toBe("POST");
        requestEndpoint = req.endpoint;
        expect(req.endpoint).toContain("/audio/transcriptions");
        requestBody = req.body;
        return {
          status: 200,
          json: async () => ({
            text: "真实转写文案",
            segments: [{ start: 0, end: 3, text: "真实转写文案" }],
          }),
        };
      },
    };

    const readAudioFile = async () => new Uint8Array([1, 2, 3]);

    const provider = createWhisperProvider({
      baseUrl: "https://api.openai.com/v1",
      apiKey: "secret-token",
      model: "whisper-1",
      transport,
      readAudioFile,
    });

    const result = await provider.transcribe({
      audioPath: "/tmp/extracted-audio.wav",
      language: "zh-CN",
    });

    expect(result.text).toBe("真实转写文案");
    expect(result.segments).toEqual([{ startSeconds: 0, endSeconds: 3, text: "真实转写文案" }]);
    expect(requestBody).toBeInstanceOf(FormData);
    const formData = requestBody as FormData;
    expect(formData.get("language")).toBe("zh");
    expect(requestEndpoint).not.toContain("secret-token");
  });

  it("rejects non-whisper-1 models", () => {
    expect(() =>
      createWhisperProvider({
        baseUrl: "https://api.openai.com/v1",
        apiKey: "secret-token",
        model: "gpt-4o-transcribe",
        transport: { async request() { throw new Error("should not be called"); } },
        readAudioFile: async () => new Uint8Array([]),
      }),
    ).toThrow(expect.objectContaining({ code: "not-configured" }));
  });

  it("rejects sourceVideoPath-only input in real mode", async () => {
    const provider = createWhisperProvider({
      baseUrl: "https://api.openai.com/v1",
      apiKey: "secret-token",
      model: "whisper-1",
      transport: { async request() { throw new Error("should not be called"); } },
      readAudioFile: async () => new Uint8Array([]),
    });

    await expect(provider.transcribe({ sourceVideoPath: "/tmp/source.mp4" })).rejects.toMatchObject({
      code: "not-configured",
    });
  });

  it("rejects missing audioPath and sourceVideoPath", async () => {
    const provider = createWhisperProvider({
      baseUrl: "https://api.openai.com/v1",
      apiKey: "secret-token",
      model: "whisper-1",
      transport: { async request() { throw new Error("should not be called"); } },
      readAudioFile: async () => new Uint8Array([]),
    });

    await expect(provider.transcribe({ language: "zh-CN" })).rejects.toMatchObject({
      code: "not-configured",
    });
  });

  it("returns unauthorized on 401", async () => {
    const provider = createWhisperProvider({
      baseUrl: "https://api.openai.com/v1",
      apiKey: "secret-token",
      model: "whisper-1",
      transport: createFakeTransport([{ response: { status: 401, body: { error: "bad token" } } }]),
      readAudioFile: async () => new Uint8Array([1]),
    });

    await expect(provider.transcribe({ audioPath: "/tmp/audio.wav" })).rejects.toMatchObject({
      code: "unauthorized",
    });
  });

  it("rejects audio files larger than 25MB without leaking path", async () => {
    const provider = createWhisperProvider({
      baseUrl: "https://api.openai.com/v1",
      apiKey: "secret-token",
      model: "whisper-1",
      transport: { async request() { throw new Error("should not be called"); } },
      readAudioFile: async () => new Uint8Array(25 * 1024 * 1024 + 1),
    });

    let caught: unknown;
    try {
      await provider.transcribe({ audioPath: "/tmp/audio.wav" });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AiProviderError);
    expect((caught as AiProviderError).code).toBe("transcribe-failed");
    expect((caught as Error).message).not.toContain("/tmp/audio.wav");
    expect((caught as Error).message).not.toContain("secret-token");
  });

  it("returns transcribe-failed when response has no text", async () => {
    const provider = createWhisperProvider({
      baseUrl: "https://api.openai.com/v1",
      apiKey: "secret-token",
      model: "whisper-1",
      transport: createFakeTransport([{ response: { status: 200, body: { segments: [] } } }]),
      readAudioFile: async () => new Uint8Array([1]),
    });

    await expect(provider.transcribe({ audioPath: "/tmp/audio.wav" })).rejects.toMatchObject({
      code: "transcribe-failed",
    });
  });

  it("falls back to a single segment when verbose_json has no segments", async () => {
    const provider = createWhisperProvider({
      baseUrl: "https://api.openai.com/v1",
      apiKey: "secret-token",
      model: "whisper-1",
      transport: createFakeTransport([{ response: { status: 200, body: { text: "只有整段文案" } } }]),
      readAudioFile: async () => new Uint8Array([1]),
    });

    const result = await provider.transcribe({ audioPath: "/tmp/audio.wav" });
    expect(result.text).toBe("只有整段文案");
    expect(result.segments).toEqual([{ startSeconds: 0, endSeconds: 0, text: "只有整段文案" }]);
  });

  it("does not leak token or baseUrl token in errors", async () => {
    let requestedEndpoint = "";
    const provider = createWhisperProvider({
      baseUrl: "https://api.openai.com/v1?token=url-secret",
      apiKey: "secret-token",
      model: "whisper-1",
      transport: {
        async request(req) {
          requestedEndpoint = req.endpoint;
          return { status: 500, json: async () => ({ error: "server exploded" }) };
        },
      },
      readAudioFile: async () => new Uint8Array([1]),
    });

    let caught: unknown;
    try {
      await provider.transcribe({ audioPath: "/tmp/audio.wav" });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AiProviderError);
    expect(requestedEndpoint).not.toContain("url-secret");
    expect((caught as Error).message).not.toContain("secret-token");
    expect((caught as Error).message).not.toContain("url-secret");
  });
});
