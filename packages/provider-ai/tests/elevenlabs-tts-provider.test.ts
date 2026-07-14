import { describe, expect, it, vi } from "vitest";
import { AiProviderError } from "../src/types.js";
import { ElevenLabsTtsProvider } from "../src/elevenLabsTtsProvider.js";

describe("ElevenLabsTtsProvider", () => {
  const defaultOptions = (overrides: Record<string, unknown> = {}) => ({
    apiKey: "el-secret",
    voiceId: "pNInz6obpgDQGcFmaJgB",
    model: "eleven_multilingual_v2",
    writeFile: async () => undefined,
    readDuration: async () => 2.5,
    ...overrides,
  });

  it("synthesizes speech and returns audio path with duration", async () => {
    const written: { path: string; data: Uint8Array }[] = [];
    const mp3Bytes = new Uint8Array([0xff, 0xfb, 0x90]);

    const provider = new ElevenLabsTtsProvider(
      defaultOptions({
        writeFile: async (path, data) => {
          written.push({ path, data });
        },
        fetchBinary: async () => ({
          status: 200,
          arrayBuffer: async () => mp3Bytes.buffer,
        }),
      }),
    );

    const result = await provider.synthesizeSpeech({
      voiceId: "pNInz6obpgDQGcFmaJgB",
      script: "这是 Mirax AI 的语音合成测试。",
      projectId: "proj-1",
      outputPath: "/tmp/proj-1/speech.mp3",
    });

    expect(result.audioPath).toBe("/tmp/proj-1/speech.mp3");
    expect(result.durationSeconds).toBe(2.5);
    expect(written).toHaveLength(1);
    expect(written[0].path).toBe("/tmp/proj-1/speech.mp3");
    expect(written[0].data).toEqual(mp3Bytes);
  });

  it("uses the call-level voice ID instead of the legacy constructor default", async () => {
    let endpoint = "";
    const provider = new ElevenLabsTtsProvider(
      defaultOptions({
        voiceId: "legacy-default",
        fetchBinary: async (url) => {
          endpoint = url;
          return { status: 200, arrayBuffer: async () => new Uint8Array([1]).buffer };
        },
      }),
    );

    await provider.synthesizeSpeech({
      voiceId: "project-bound-voice",
      script: "测试",
      projectId: "project-1",
      outputPath: "/tmp/speech.mp3",
    });

    expect(endpoint).toContain("/v1/text-to-speech/project-bound-voice");
    expect(endpoint).not.toContain("legacy-default");
  });

  it("uploads one managed sample and parses only the IVC response fields", async () => {
    const uploads: unknown[] = [];
    const provider = new ElevenLabsTtsProvider(
      defaultOptions({
        readAudioFile: async () => new Uint8Array([1, 2, 3]),
        uploadVoiceSample: async (input: unknown) => {
          uploads.push(input);
          return { status: 200, json: async () => ({ voice_id: "remote-voice", requires_verification: false, ignored: "secret" }) };
        },
      }),
    );

    await expect(provider.cloneVoice({
      voiceSamplePath: "/managed/a.wav",
      projectId: "project-1",
      sampleId: "sample-1",
      voiceName: "我的授权音色",
    })).resolves.toEqual({ voiceId: "remote-voice", samplePath: "/managed/a.wav", requiresVerification: false });
    expect(uploads).toMatchObject([{ name: "我的授权音色", fileName: "a.wav", data: new Uint8Array([1, 2, 3]) }]);
  });

  it("uses ElevenLabs files[] multipart upload without a manual Content-Type", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => ({
      status: 200,
      json: async () => ({ voice_id: "remote-voice" }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    try {
      const provider = new ElevenLabsTtsProvider(defaultOptions({ readAudioFile: async () => new Uint8Array([1]) }));
      await provider.cloneVoice({ voiceSamplePath: "/managed/a.wav", projectId: "p", sampleId: "s", voiceName: "授权" });
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect((init.body as FormData).get("files[]")).toBeInstanceOf(Blob);
      expect((init.body as FormData).get("name")).toBe("授权");
      expect(init.headers).toEqual({ "xi-api-key": "el-secret" });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("rejects an IVC request without a voice name before reading the file", async () => {
    let read = false;
    const provider = new ElevenLabsTtsProvider(defaultOptions({ readAudioFile: async () => { read = true; return new Uint8Array([1]); } }));

    await expect(provider.cloneVoice({ voiceSamplePath: "/managed/a.wav", projectId: "p", sampleId: "s", voiceName: "" }))
      .rejects.toMatchObject({ code: "not-configured" });
    expect(read).toBe(false);
  });

  it.each([[401, "unauthorized"], [403, "unauthorized"], [500, "clone-failed"]] as const)(
    "maps IVC HTTP %s to %s without leaking credentials or paths",
    async (status, code) => {
      const provider = new ElevenLabsTtsProvider(defaultOptions({
        readAudioFile: async () => new Uint8Array([1]),
        uploadVoiceSample: async () => ({ status, json: async () => ({ detail: "el-secret /managed/a.wav raw-body" }) }),
      }));
      await expect(provider.cloneVoice({ voiceSamplePath: "/managed/a.wav", projectId: "p", sampleId: "s", voiceName: "授权" }))
        .rejects.toSatisfy((error: unknown) => error instanceof AiProviderError
          && error.code === code
          && !error.message.includes("el-secret")
          && !error.message.includes("/managed/a.wav"));
    },
  );

  it("maps ElevenLabs invalid_audio detail to a safe sample diagnostic", async () => {
    const provider = new ElevenLabsTtsProvider(defaultOptions({
      readAudioFile: async () => new Uint8Array([1]),
      uploadVoiceSample: async () => ({
        status: 400,
        json: async () => ({
          detail: {
            code: "invalid_audio",
            message: "el-secret /managed/a.wav could not be decoded",
          },
        }),
      }),
    }));

    await expect(provider.cloneVoice({ voiceSamplePath: "/managed/a.wav", projectId: "p", sampleId: "s", voiceName: "授权" }))
      .rejects.toSatisfy((error: unknown) => error instanceof AiProviderError
        && error.code === "clone-failed"
        && error.message === "ElevenLabs 返回 HTTP 400：样本音频无效或已损坏。"
        && !error.message.includes("el-secret")
        && !error.message.includes("/managed/a.wav"));
  });

  it("surfaces a sanitized ElevenLabs detail message when the error code is unknown", async () => {
    const provider = new ElevenLabsTtsProvider(defaultOptions({
      readAudioFile: async () => new Uint8Array([1]),
      uploadVoiceSample: async () => ({
        status: 400,
        json: async () => ({
          detail: {
            code: "voice_sample_quality_too_low",
            message: "Audio must contain at least 30 seconds of clear speech. el-secret /managed/a.wav",
          },
        }),
      }),
    }));

    await expect(provider.cloneVoice({ voiceSamplePath: "/managed/a.wav", projectId: "p", sampleId: "s", voiceName: "授权" }))
      .rejects.toSatisfy((error: unknown) => error instanceof AiProviderError
        && error.code === "clone-failed"
        && error.message === "ElevenLabs 返回 HTTP 400：服务端说明：Audio must contain at least 30 seconds of clear speech. [已隐藏] [已隐藏]"
        && !error.message.includes("el-secret")
        && !error.message.includes("/managed/a.wav"));
  });

  it("compensates an explicitly requested remote delete", async () => {
    const deleted: string[] = [];
    const provider = new ElevenLabsTtsProvider(defaultOptions({
      deleteRemoteVoice: async ({ voiceId }: { voiceId: string }) => { deleted.push(voiceId); return { status: 204 }; },
    }));
    await expect(provider.deleteRemoteVoice("remote-voice")).resolves.toBeUndefined();
    expect(deleted).toEqual(["remote-voice"]);
  });

  it("returns unauthorized on 401", async () => {
    const provider = new ElevenLabsTtsProvider(
      defaultOptions({
        fetchBinary: async () => ({
          status: 401,
          arrayBuffer: async () => new ArrayBuffer(0),
        }),
      }),
    );

    await expect(
      provider.synthesizeSpeech({
        voiceId: "pNInz6obpgDQGcFmaJgB",
        script: "测试",
        projectId: "proj-1",
        outputPath: "/tmp/proj-1/speech.mp3",
      }),
    ).rejects.toSatisfy((error: unknown) => {
      if (!(error instanceof AiProviderError)) return false;
      expect(error.code).toBe("unauthorized");
      expect(error.message).toContain("401");
      expect(error.message).not.toContain("el-secret");
      return true;
    });
  });

  it("returns unauthorized on 403", async () => {
    const provider = new ElevenLabsTtsProvider(
      defaultOptions({
        fetchBinary: async () => ({
          status: 403,
          arrayBuffer: async () => new ArrayBuffer(0),
        }),
      }),
    );

    await expect(
      provider.synthesizeSpeech({
        voiceId: "pNInz6obpgDQGcFmaJgB",
        script: "测试",
        projectId: "proj-1",
        outputPath: "/tmp/proj-1/speech.mp3",
      }),
    ).rejects.toSatisfy((error: unknown) => {
      if (!(error instanceof AiProviderError)) return false;
      expect(error.code).toBe("unauthorized");
      return true;
    });
  });

  it("returns synthesis-failed on other non-2xx status", async () => {
    const provider = new ElevenLabsTtsProvider(
      defaultOptions({
        fetchBinary: async () => ({
          status: 500,
          arrayBuffer: async () => new ArrayBuffer(0),
        }),
      }),
    );

    await expect(
      provider.synthesizeSpeech({
        voiceId: "pNInz6obpgDQGcFmaJgB",
        script: "测试",
        projectId: "proj-1",
        outputPath: "/tmp/proj-1/speech.mp3",
      }),
    ).rejects.toSatisfy((error: unknown) => {
      if (!(error instanceof AiProviderError)) return false;
      expect(error.code).toBe("synthesis-failed");
      expect(error.message).toContain("500");
      expect(error.message).not.toContain("el-secret");
      return true;
    });
  });

  it("returns network error when fetch throws", async () => {
    const provider = new ElevenLabsTtsProvider(
      defaultOptions({
        fetchBinary: async () => {
          throw new Error("connection reset");
        },
      }),
    );

    await expect(
      provider.synthesizeSpeech({
        voiceId: "pNInz6obpgDQGcFmaJgB",
        script: "测试",
        projectId: "proj-1",
        outputPath: "/tmp/proj-1/speech.mp3",
      }),
    ).rejects.toSatisfy((error: unknown) => {
      if (!(error instanceof AiProviderError)) return false;
      expect(error.code).toBe("network");
      return true;
    });
  });

  it("returns synthesis-failed when writeFile throws", async () => {
    const provider = new ElevenLabsTtsProvider(
      defaultOptions({
        writeFile: async () => {
          throw new Error("disk full");
        },
        fetchBinary: async () => ({
          status: 200,
          arrayBuffer: async () => new Uint8Array([0xff]).buffer,
        }),
      }),
    );

    await expect(
      provider.synthesizeSpeech({
        voiceId: "pNInz6obpgDQGcFmaJgB",
        script: "测试",
        projectId: "proj-1",
        outputPath: "/tmp/proj-1/speech.mp3",
      }),
    ).rejects.toSatisfy((error: unknown) => {
      if (!(error instanceof AiProviderError)) return false;
      expect(error.code).toBe("synthesis-failed");
      expect(error.message).not.toContain("/tmp/proj-1/speech.mp3");
      return true;
    });
  });

  it("returns synthesis-failed when readDuration throws", async () => {
    const provider = new ElevenLabsTtsProvider(
      defaultOptions({
        readDuration: async () => {
          throw new Error("ffprobe failed");
        },
        fetchBinary: async () => ({
          status: 200,
          arrayBuffer: async () => new Uint8Array([0xff]).buffer,
        }),
      }),
    );

    await expect(
      provider.synthesizeSpeech({
        voiceId: "pNInz6obpgDQGcFmaJgB",
        script: "测试",
        projectId: "proj-1",
        outputPath: "/tmp/proj-1/speech.mp3",
      }),
    ).rejects.toSatisfy((error: unknown) => {
      if (!(error instanceof AiProviderError)) return false;
      expect(error.code).toBe("synthesis-failed");
      return true;
    });
  });

  it("returns synthesis-failed when duration is zero", async () => {
    const provider = new ElevenLabsTtsProvider(
      defaultOptions({
        readDuration: async () => 0,
        fetchBinary: async () => ({
          status: 200,
          arrayBuffer: async () => new Uint8Array([0xff]).buffer,
        }),
      }),
    );

    await expect(
      provider.synthesizeSpeech({
        voiceId: "pNInz6obpgDQGcFmaJgB",
        script: "测试",
        projectId: "proj-1",
        outputPath: "/tmp/proj-1/speech.mp3",
      }),
    ).rejects.toSatisfy((error: unknown) => {
      if (!(error instanceof AiProviderError)) return false;
      expect(error.code).toBe("synthesis-failed");
      return true;
    });
  });

  it("does not leak api key or full path in error messages", async () => {
    const provider = new ElevenLabsTtsProvider(
      defaultOptions({
        fetchBinary: async () => {
          throw new Error("el-secret /tmp/proj-1/speech.mp3 response body");
        },
      }),
    );

    await expect(
      provider.synthesizeSpeech({
        voiceId: "pNInz6obpgDQGcFmaJgB",
        script: "测试",
        projectId: "proj-1",
        outputPath: "/tmp/proj-1/speech.mp3",
      }),
    ).rejects.toSatisfy((error: unknown) => {
      if (!(error instanceof AiProviderError)) return false;
      const message = error.message;
      expect(message).not.toContain("el-secret");
      expect(message).not.toContain("/tmp/proj-1/speech.mp3");
      expect(message).not.toContain("response body");
      return true;
    });
  });
});
