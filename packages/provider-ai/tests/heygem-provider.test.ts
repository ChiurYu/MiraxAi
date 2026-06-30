import { describe, expect, it } from "vitest";
import { AiProviderError, createHeyGemProvider } from "../src/index.js";
import type { OpenAiCompatibleTransport } from "../src/index.js";

function createFakeTransport(
  scenarios: Array<{ response: { status: number; body: unknown } }>,
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

describe("heygem provider", () => {
  it("generates avatar video using injected fake service", async () => {
    let requestBody: unknown;
    const transport: OpenAiCompatibleTransport = {
      async request(req) {
        expect(req.method).toBe("POST");
        expect(req.endpoint).toContain("/avatar");
        requestBody = req.body;
        return {
          status: 200,
          json: async () => ({ videoPath: "/tmp/mirax/project-1/avatar/avatar.mp4", durationSeconds: 12 }),
        };
      },
    };

    const provider = createHeyGemProvider({
      baseUrl: "https://heygem.example.com",
      apiKey: "secret-token",
      model: "heygem-v1",
      transport,
    });

    const result = await provider.generateAvatarVideo({
      audioPath: "/tmp/mirax/project-1/speech.wav",
      avatarId: "presenter-a",
      projectId: "project-1",
      outputPath: "/tmp/mirax/project-1/avatar/avatar.mp4",
    });

    expect(result).toEqual({
      videoPath: "/tmp/mirax/project-1/avatar/avatar.mp4",
      durationSeconds: 12,
    });
    expect(requestBody).toMatchObject({
      audioPath: "/tmp/mirax/project-1/speech.wav",
      avatarId: "presenter-a",
      projectId: "project-1",
      outputPath: "/tmp/mirax/project-1/avatar/avatar.mp4",
      model: "heygem-v1",
    });
  });

  it("rejects missing audioPath before contacting service", async () => {
    const provider = createHeyGemProvider({
      baseUrl: "https://heygem.example.com",
      transport: {
        async request() {
          throw new Error("should not be called");
        },
      },
    });

    await expect(
      provider.generateAvatarVideo({ audioPath: "", avatarId: "presenter-a", projectId: "project-1" }),
    ).rejects.toMatchObject({ code: "not-configured" });
  });

  it("rejects missing avatarId before contacting service", async () => {
    const provider = createHeyGemProvider({
      baseUrl: "https://heygem.example.com",
      transport: {
        async request() {
          throw new Error("should not be called");
        },
      },
    });

    await expect(
      provider.generateAvatarVideo({
        audioPath: "/tmp/mirax/project-1/speech.wav",
        avatarId: "",
        projectId: "project-1",
      }),
    ).rejects.toMatchObject({ code: "not-configured" });
  });

  it("returns unauthorized on 401", async () => {
    const provider = createHeyGemProvider({
      baseUrl: "https://heygem.example.com",
      apiKey: "secret-token",
      transport: createFakeTransport([{ response: { status: 401, body: { error: "bad token" } } }]),
    });

    await expect(
      provider.generateAvatarVideo({
        audioPath: "/tmp/mirax/project-1/speech.wav",
        avatarId: "presenter-a",
        projectId: "project-1",
      }),
    ).rejects.toMatchObject({ code: "unauthorized" });
  });

  it("returns avatar-failed when response has no videoPath", async () => {
    const provider = createHeyGemProvider({
      baseUrl: "https://heygem.example.com",
      transport: createFakeTransport([{ response: { status: 200, body: { durationSeconds: 12 } } }]),
    });

    await expect(
      provider.generateAvatarVideo({
        audioPath: "/tmp/mirax/project-1/speech.wav",
        avatarId: "presenter-a",
        projectId: "project-1",
      }),
    ).rejects.toMatchObject({ code: "avatar-failed" });
  });

  it("returns avatar-failed when response lacks trusted duration", async () => {
    const provider = createHeyGemProvider({
      baseUrl: "https://heygem.example.com",
      transport: createFakeTransport([
        { response: { status: 200, body: { videoPath: "/tmp/mirax/project-1/avatar/avatar.mp4" } } },
      ]),
    });

    await expect(
      provider.generateAvatarVideo({
        audioPath: "/tmp/mirax/project-1/speech.wav",
        avatarId: "presenter-a",
        projectId: "project-1",
      }),
    ).rejects.toMatchObject({ code: "avatar-failed" });
  });

  it("does not leak token or baseUrl token in errors", async () => {
    let requestedEndpoint = "";
    const provider = createHeyGemProvider({
      baseUrl: "https://heygem.example.com?token=url-secret",
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
      await provider.generateAvatarVideo({
        audioPath: "/tmp/mirax/project-1/speech.wav",
        avatarId: "presenter-a",
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
});
