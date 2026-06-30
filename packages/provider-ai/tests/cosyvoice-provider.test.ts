import { describe, expect, it } from "vitest";
import { AiProviderError, createCosyVoiceProvider } from "../src/index.js";
import type { OpenAiCompatibleTransport } from "../src/index.js";

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
      if (!scenario) {
        throw new Error("Unexpected request");
      }
      if (scenario.match?.method && req.method !== scenario.match.method) {
        throw new Error(`Expected ${scenario.match.method} but got ${req.method}`);
      }
      if (scenario.match?.endpoint && !req.endpoint.includes(scenario.match.endpoint)) {
        throw new Error(`Expected endpoint matching ${scenario.match.endpoint} but got ${req.endpoint}`);
      }
      return {
        status: scenario.response.status,
        json: async () => scenario.response.body,
      };
    },
  };
}

describe("cosyvoice provider", () => {
  it("clones voice using injected fake service", async () => {
    let requestBody: unknown;
    const transport: OpenAiCompatibleTransport = {
      async request(req) {
        expect(req.method).toBe("POST");
        expect(req.endpoint).toContain("/voice-clone");
        requestBody = req.body;
        return {
          status: 200,
          json: async () => ({ voiceId: "voice-real-1", samplePath: "/tmp/mirax/project-1/voice.wav" }),
        };
      },
    };

    const provider = createCosyVoiceProvider({
      baseUrl: "https://cosyvoice.example.com",
      apiKey: "secret-token",
      model: "cosyvoice-v1",
      transport,
    });

    const result = await provider.cloneVoice({
      voiceSamplePath: "/tmp/source.wav",
      projectId: "project-1",
    });

    expect(result).toEqual({
      voiceId: "voice-real-1",
      samplePath: "/tmp/mirax/project-1/voice.wav",
    });
    expect(requestBody).toMatchObject({
      samplePath: "/tmp/source.wav",
      projectId: "project-1",
    });
  });

  it("rejects missing voice sample before contacting service", async () => {
    const provider = createCosyVoiceProvider({
      baseUrl: "https://cosyvoice.example.com",
      transport: {
        async request() {
          throw new Error("should not be called");
        },
      },
    });

    await expect(
      provider.cloneVoice({
        voiceSamplePath: "",
        projectId: "project-1",
      }),
    ).rejects.toMatchObject({ code: "not-configured" });
  });

  it("returns clone-failed when voice clone response has no voiceId", async () => {
    const provider = createCosyVoiceProvider({
      baseUrl: "https://cosyvoice.example.com",
      transport: createFakeTransport([{ response: { status: 200, body: { samplePath: "/tmp/source.wav" } } }]),
    });

    await expect(
      provider.cloneVoice({
        voiceSamplePath: "/tmp/source.wav",
        projectId: "project-1",
      }),
    ).rejects.toMatchObject({ code: "clone-failed" });
  });

  it("does not leak token or baseUrl token in clone voice errors", async () => {
    let requestedEndpoint = "";
    const provider = createCosyVoiceProvider({
      baseUrl: "https://cosyvoice.example.com?token=url-secret",
      apiKey: "secret-token",
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
      await provider.cloneVoice({
        voiceSamplePath: "/tmp/source.wav",
        projectId: "project-1",
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AiProviderError);
    expect(requestedEndpoint).not.toContain("url-secret");
    expect((caught as Error).message).not.toContain("secret-token");
    expect((caught as Error).message).not.toContain("url-secret");
  });

  it("synthesizes speech using injected fake service", async () => {
    let requestBody: unknown;
    const transport: OpenAiCompatibleTransport = {
      async request(req) {
        expect(req.method).toBe("POST");
        expect(req.endpoint).toContain("/tts");
        requestBody = req.body;
        return {
          status: 200,
          json: async () => ({ audioPath: "/tmp/mirax/project-1/speech.wav", durationSeconds: 12 }),
        };
      },
    };

    const provider = createCosyVoiceProvider({
      baseUrl: "https://cosyvoice.example.com",
      apiKey: "secret-token",
      model: "cosyvoice-v1",
      transport,
    });

    const result = await provider.synthesizeSpeech({
      voiceId: "voice-a",
      script: "大家好，今天介绍这款通勤包。",
      projectId: "project-1",
      outputPath: "/tmp/mirax/project-1/speech/speech.wav",
    });

    expect(result).toEqual({
      audioPath: "/tmp/mirax/project-1/speech.wav",
      durationSeconds: 12,
    });
    expect(requestBody).toMatchObject({
      outputPath: "/tmp/mirax/project-1/speech/speech.wav",
    });
  });

  it("rejects missing voiceId before contacting service", async () => {
    const transport: OpenAiCompatibleTransport = {
      async request() {
        throw new Error("should not be called");
      },
    };

    const provider = createCosyVoiceProvider({
      baseUrl: "https://cosyvoice.example.com",
      transport,
    });

    await expect(
      provider.synthesizeSpeech({
        voiceId: "",
        script: "有效文案",
        projectId: "project-1",
      }),
    ).rejects.toMatchObject({ code: "voice-unavailable" });
  });

  it("rejects missing script before contacting service", async () => {
    const provider = createCosyVoiceProvider({
      baseUrl: "https://cosyvoice.example.com",
      transport: {
        async request() {
          throw new Error("should not be called");
        },
      },
    });

    await expect(
      provider.synthesizeSpeech({
        voiceId: "voice-a",
        script: "",
        projectId: "project-1",
      }),
    ).rejects.toMatchObject({ code: "not-configured" });
  });

  it("returns unauthorized on 401", async () => {
    const provider = createCosyVoiceProvider({
      baseUrl: "https://cosyvoice.example.com",
      apiKey: "secret-token",
      transport: createFakeTransport([{ response: { status: 401, body: { error: "bad token" } } }]),
    });

    await expect(
      provider.synthesizeSpeech({
        voiceId: "voice-a",
        script: "有效文案",
        projectId: "project-1",
      }),
    ).rejects.toMatchObject({ code: "unauthorized" });
  });

  it("returns synthesis-failed when response has no audioPath", async () => {
    const provider = createCosyVoiceProvider({
      baseUrl: "https://cosyvoice.example.com",
      transport: createFakeTransport([{ response: { status: 200, body: { durationSeconds: 12 } } }]),
    });

    await expect(
      provider.synthesizeSpeech({
        voiceId: "voice-a",
        script: "有效文案",
        projectId: "project-1",
      }),
    ).rejects.toMatchObject({ code: "synthesis-failed" });
  });

  it("returns synthesis-failed when response lacks trusted duration", async () => {
    const provider = createCosyVoiceProvider({
      baseUrl: "https://cosyvoice.example.com",
      transport: createFakeTransport([
        { response: { status: 200, body: { audioPath: "/tmp/mirax/project-1/speech.wav" } } },
      ]),
    });

    await expect(
      provider.synthesizeSpeech({
        voiceId: "voice-a",
        script: "有效文案",
        projectId: "project-1",
      }),
    ).rejects.toMatchObject({ code: "synthesis-failed" });
  });

  it("does not leak token or baseUrl token in errors", async () => {
    let requestedEndpoint = "";
    const provider = createCosyVoiceProvider({
      baseUrl: "https://cosyvoice.example.com?token=url-secret",
      apiKey: "secret-token",
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
      await provider.synthesizeSpeech({
        voiceId: "voice-a",
        script: "有效文案",
        projectId: "project-1",
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AiProviderError);
    expect(requestedEndpoint).not.toContain("url-secret");
    expect((caught as Error).message).not.toContain("secret-token");
    expect((caught as Error).message).not.toContain("url-secret");
  });

  it("throws not-configured when baseUrl is missing", () => {
    let caught: unknown;
    try {
      createCosyVoiceProvider({ baseUrl: "" });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AiProviderError);
    expect((caught as AiProviderError).code).toBe("not-configured");
  });
});
