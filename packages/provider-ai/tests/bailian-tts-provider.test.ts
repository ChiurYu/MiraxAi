import { describe, expect, it } from "vitest";
import { AiProviderError, BaiLianTtsProvider } from "../src/index.js";

const baseUrl = "https://workspace.cn-beijing.maas.aliyuncs.com/api/v1";

describe("BaiLianTtsProvider", () => {
  it("creates a Qwen voice with a local data URI and returns output.voice", async () => {
    let endpoint = "";
    let headers: Record<string, string> = {};
    let body: Record<string, any> = {};
    const provider = new BaiLianTtsProvider({
      kind: "qwen",
      apiKey: "bailian-secret",
      baseUrl,
      model: "qwen3-tts-vc-2026-01-22",
      readAudioFile: async () => new Uint8Array([1, 2, 3]),
      fetchJson: async (url, init) => {
        endpoint = url;
        headers = init.headers;
        body = JSON.parse(init.body ?? "{}");
        return { status: 200, json: async () => ({ output: { voice: "qwen-voice-1" } }) };
      },
    });

    await expect(provider.cloneVoice({
      projectId: "project-1",
      sampleId: "sample-1",
      voiceName: "中文声音",
      voiceSamplePath: "/safe/managed/sample.mp3",
    })).resolves.toEqual({ voiceId: "qwen-voice-1", samplePath: "/safe/managed/sample.mp3" });

    expect(endpoint).toBe(`${baseUrl}/services/audio/tts/customization`);
    expect(headers.Authorization).toBe("Bearer bailian-secret");
    expect(body).toMatchObject({
      model: "qwen-voice-enrollment",
      input: {
        action: "create",
        target_model: "qwen3-tts-vc-2026-01-22",
        preferred_name: "mirax_voice",
      },
    });
    expect(body.input.audio.data).toBe("data:audio/mpeg;base64,AQID");
  });

  it("creates a CosyVoice voice with only the one-shot HTTPS OSS URL", async () => {
    let body: Record<string, any> = {};
    let reads = 0;
    const provider = new BaiLianTtsProvider({
      kind: "cosyvoice",
      apiKey: "bailian-secret",
      baseUrl,
      model: "cosyvoice-v3.5-flash",
      readAudioFile: async () => {
        reads += 1;
        return new Uint8Array([1]);
      },
      fetchJson: async (_url, init) => {
        body = JSON.parse(init.body ?? "{}");
        return { status: 200, json: async () => ({ output: { voice_id: "cosy-voice-1" } }) };
      },
    });

    const ossUrl = "https://bucket.oss-cn-beijing.aliyuncs.com/sample.wav?Expires=123&Signature=temporary";
    await expect(provider.cloneVoice({
      projectId: "project-1",
      sampleId: "sample-1",
      voiceName: "中文声音",
      voiceSamplePath: "/safe/managed/sample.wav",
      externalSampleUrl: ossUrl,
    })).resolves.toMatchObject({ voiceId: "cosy-voice-1" });

    expect(reads).toBe(0);
    expect(body).toEqual({
      model: "voice-enrollment",
      input: {
        action: "create_voice",
        target_model: "cosyvoice-v3.5-flash",
        prefix: "miraxvoice",
        url: ossUrl,
      },
    });
  });

  it("rejects a non-HTTPS CosyVoice source URL before making a request", async () => {
    let calls = 0;
    const provider = new BaiLianTtsProvider({
      kind: "cosyvoice", apiKey: "bailian-secret", baseUrl, model: "cosyvoice-v3.5-flash",
      fetchJson: async () => {
        calls += 1;
        return { status: 200, json: async () => ({}) };
      },
    });

    await expect(provider.cloneVoice({ projectId: "project-1", voiceName: "声音", voiceSamplePath: "/safe/sample.wav", externalSampleUrl: "http://oss.example.com/sample.wav" }))
      .rejects.toMatchObject({ code: "not-configured" });
    expect(calls).toBe(0);
  });

  it("downloads the temporary Qwen audio URL into the requested local output path", async () => {
    let downloadedUrl = "";
    let writtenPath = "";
    let writtenBytes: Uint8Array | undefined;
    const provider = new BaiLianTtsProvider({
      kind: "qwen", apiKey: "bailian-secret", baseUrl, model: "qwen3-tts-vc-2026-01-22",
      fetchJson: async (url, init) => {
        expect(url).toBe(`${baseUrl}/services/aigc/multimodal-generation/generation`);
        expect(JSON.parse(init.body ?? "{}")).toEqual({ model: "qwen3-tts-vc-2026-01-22", input: { text: "你好", voice: "qwen-voice-1" } });
        return { status: 200, json: async () => ({ output: { audio: { url: "http://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/temporary.wav?Expires=123&Signature=signed" } } }) };
      },
      fetchBinary: async (url) => {
        downloadedUrl = url;
        return { status: 200, arrayBuffer: async () => new Uint8Array([9, 8, 7]).buffer };
      },
      writeFile: async (path, data) => { writtenPath = path; writtenBytes = data; },
      readDuration: async () => 1.25,
    });

    await expect(provider.synthesizeSpeech({ projectId: "project-1", voiceId: "qwen-voice-1", script: "你好", outputPath: "/audio/project-1/speech.wav" }))
      .resolves.toEqual({ audioPath: "/audio/project-1/speech.wav", durationSeconds: 1.25 });
    expect(downloadedUrl).toBe("http://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/temporary.wav?Expires=123&Signature=signed");
    expect(writtenPath).toBe("/audio/project-1/speech.wav");
    expect(writtenBytes).toEqual(new Uint8Array([9, 8, 7]));
  });

  it("rejects non-BaiLian HTTP audio result hosts", async () => {
    const provider = new BaiLianTtsProvider({
      kind: "qwen", apiKey: "bailian-secret", baseUrl, model: "qwen3-tts-vc-2026-01-22",
      fetchJson: async () => ({ status: 200, json: async () => ({ output: { audio: { url: "http://127.0.0.1/private.wav" } } }) }),
      fetchBinary: async () => ({ status: 200, arrayBuffer: async () => new ArrayBuffer(1) }),
      writeFile: async () => undefined,
      readDuration: async () => 1,
    });

    await expect(provider.synthesizeSpeech({ projectId: "project-1", voiceId: "voice-1", script: "你好", outputPath: "/audio/speech.wav" }))
      .rejects.toMatchObject({ code: "synthesis-failed" });
  });

  it("includes a safe BaiLian diagnostic in an HTTP failure", async () => {
    const provider = new BaiLianTtsProvider({
      kind: "qwen", apiKey: "bailian-secret", baseUrl, model: "qwen3-tts-vc-2026-01-22",
      readAudioFile: async () => new Uint8Array([1]),
      fetchJson: async () => ({
        status: 400,
        diagnostic: { code: "InvalidParameter", message: "音频时长不能超过 60 秒", requestId: "request-123" },
        json: async () => ({}),
      }),
    });

    await expect(provider.cloneVoice({
      projectId: "project-1", voiceName: "声音", voiceSamplePath: "/safe/managed/sample.mp3",
    })).rejects.toMatchObject({
      code: "clone-failed",
      message: "百炼返回 HTTP 400（InvalidParameter）：音频时长不能超过 60 秒（请求 ID：request-123），声音克隆失败。",
    });
  });

  it("returns sanitized failures without exposing credentials, local paths, or OSS signed URLs", async () => {
    const provider = new BaiLianTtsProvider({
      kind: "cosyvoice", apiKey: "bailian-secret", baseUrl, model: "cosyvoice-v3.5-flash",
      fetchJson: async () => ({ status: 400, json: async () => ({ message: "https://bucket.oss.example.com/sample?signature=secret" }) }),
    });

    await expect(provider.cloneVoice({
      projectId: "project-1", voiceName: "声音", voiceSamplePath: "/Users/name/secret-sample.wav",
      externalSampleUrl: "https://bucket.oss.example.com/sample?signature=secret",
    })).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(AiProviderError);
      const message = (error as Error).message;
      expect(message).toContain("HTTP 400");
      expect(message).not.toContain("bailian-secret");
      expect(message).not.toContain("secret-sample");
      expect(message).not.toContain("signature=secret");
      return true;
    });
  });
});
