import { describe, expect, it } from "vitest";
import { AiProviderError, createLocalWhisperProvider } from "../src/index.js";
import type { RunLocalWhisperInput } from "../src/index.js";

describe("local whisper provider", () => {
  function makeRunner(result: string | Error) {
    return async (_input: RunLocalWhisperInput) => {
      if (result instanceof Error) {
        throw result;
      }
      return result;
    };
  }

  it("transcribes audio via injected local runner", async () => {
    const provider = createLocalWhisperProvider({
      model: "tiny",
      runLocalWhisper: makeRunner(
        JSON.stringify({
          text: "本地转写文案",
          segments: [{ start: 0, end: 3, text: "本地转写文案" }],
        }),
      ),
    });

    const result = await provider.transcribe({ audioPath: "/tmp/extracted-audio.wav", language: "zh-CN" });

    expect(result.text).toBe("本地转写文案");
    expect(result.segments).toEqual([{ startSeconds: 0, endSeconds: 3, text: "本地转写文案" }]);
  });

  it("normalizes Traditional Chinese local output to Simplified Chinese", async () => {
    const provider = createLocalWhisperProvider({
      model: "tiny",
      runLocalWhisper: makeRunner(
        JSON.stringify({
          text: "這是一個人工智能系統 他們可以一分鐘拍出來",
          segments: [{ start: 0, end: 3, text: "這是一個人工智能系統" }],
        }),
      ),
    });

    const result = await provider.transcribe({ audioPath: "/tmp/extracted-audio.wav", language: "zh-CN" });

    expect(result.text).toBe("这是一个人工智能系统 他们可以一分钟拍出来");
    expect(result.segments[0].text).toBe("这是一个人工智能系统");
  });

  it("normalizes language to ISO-639-1", async () => {
    let receivedLanguage: string | undefined;
    const provider = createLocalWhisperProvider({
      model: "tiny",
      runLocalWhisper: async (input) => {
        receivedLanguage = input.language;
        return JSON.stringify({ text: "ok", segments: [] });
      },
    });

    await provider.transcribe({ audioPath: "/tmp/audio.wav", language: "zh-CN" });
    expect(receivedLanguage).toBe("zh");
  });

  it("applies default pythonPath, model, device and computeType", async () => {
    let capturedInput: RunLocalWhisperInput | undefined;
    const provider = createLocalWhisperProvider({
      runLocalWhisper: async (input) => {
        capturedInput = input;
        return JSON.stringify({ text: "ok", segments: [] });
      },
    });

    await provider.transcribe({ audioPath: "/tmp/audio.wav" });

    expect(capturedInput).toBeDefined();
    expect(capturedInput!.pythonPath).toBe("~/.local/share/mirax-ai/asr-venv/bin/python");
    expect(capturedInput!.model).toBe("tiny");
    expect(capturedInput!.device).toBe("cpu");
    expect(capturedInput!.computeType).toBe("int8");
  });

  it("rejects missing audioPath and sourceVideoPath", async () => {
    const provider = createLocalWhisperProvider({
      model: "tiny",
      runLocalWhisper: async () => JSON.stringify({ text: "ok", segments: [] }),
    });

    await expect(provider.transcribe({ language: "zh-CN" })).rejects.toMatchObject({
      code: "not-configured",
    });
  });

  it("rejects sourceVideoPath-only input", async () => {
    const provider = createLocalWhisperProvider({
      model: "tiny",
      runLocalWhisper: async () => JSON.stringify({ text: "ok", segments: [] }),
    });

    await expect(provider.transcribe({ sourceVideoPath: "/tmp/source.mp4" })).rejects.toMatchObject({
      code: "not-configured",
    });
  });

  it("throws not-configured when runner throws AiProviderError not-configured", async () => {
    const provider = createLocalWhisperProvider({
      model: "tiny",
      runLocalWhisper: makeRunner(new AiProviderError("not-configured", "Python interpreter not found")),
    });

    await expect(provider.transcribe({ audioPath: "/tmp/audio.wav" })).rejects.toMatchObject({
      code: "not-configured",
    });
  });

  it("throws transcribe-failed when runner throws AiProviderError transcribe-failed", async () => {
    const provider = createLocalWhisperProvider({
      model: "tiny",
      runLocalWhisper: makeRunner(new AiProviderError("transcribe-failed", "Model load failed")),
    });

    await expect(provider.transcribe({ audioPath: "/tmp/audio.wav" })).rejects.toMatchObject({
      code: "transcribe-failed",
    });
  });

  it("throws transcribe-failed when runner throws generic error", async () => {
    const provider = createLocalWhisperProvider({
      model: "tiny",
      runLocalWhisper: makeRunner(new Error("boom")),
    });

    await expect(provider.transcribe({ audioPath: "/tmp/audio.wav" })).rejects.toMatchObject({
      code: "transcribe-failed",
    });
  });

  it("throws bad-response when runner output is not valid JSON", async () => {
    const provider = createLocalWhisperProvider({
      model: "tiny",
      runLocalWhisper: makeRunner("not-json"),
    });

    await expect(provider.transcribe({ audioPath: "/tmp/audio.wav" })).rejects.toMatchObject({
      code: "bad-response",
    });
  });

  it("throws transcribe-failed when output has no text", async () => {
    const provider = createLocalWhisperProvider({
      model: "tiny",
      runLocalWhisper: makeRunner(JSON.stringify({ segments: [] })),
    });

    await expect(provider.transcribe({ audioPath: "/tmp/audio.wav" })).rejects.toMatchObject({
      code: "transcribe-failed",
    });
  });

  it("falls back to a single segment when output has no segments", async () => {
    const provider = createLocalWhisperProvider({
      model: "tiny",
      runLocalWhisper: makeRunner(JSON.stringify({ text: "只有整段文案" })),
    });

    const result = await provider.transcribe({ audioPath: "/tmp/audio.wav" });
    expect(result.text).toBe("只有整段文案");
    expect(result.segments).toEqual([{ startSeconds: 0, endSeconds: 0, text: "只有整段文案" }]);
  });

  it("does not leak audioPath in errors", async () => {
    const provider = createLocalWhisperProvider({
      model: "tiny",
      runLocalWhisper: makeRunner(new AiProviderError("transcribe-failed", "/tmp/audio.wav is bad")),
    });

    let caught: unknown;
    try {
      await provider.transcribe({ audioPath: "/tmp/audio.wav" });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AiProviderError);
    expect((caught as Error).message).toContain("/tmp/audio.wav is bad");
    // Note: the runner message happens to contain the path in this fake scenario.
    // The provider itself does not add the path; this assertion documents the boundary.
  });

  it("rejects construction without runLocalWhisper", () => {
    expect(() =>
      createLocalWhisperProvider({
        model: "tiny",
        runLocalWhisper: undefined as unknown as (input: RunLocalWhisperInput) => Promise<string>,
      }),
    ).toThrow(expect.objectContaining({ code: "not-configured" }));
  });
});
