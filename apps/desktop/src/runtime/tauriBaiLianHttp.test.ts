import { describe, expect, it, vi } from "vitest";
import { createTauriBaiLianFetchBinary, createTauriBaiLianFetchJson, type TauriBaiLianInvoke } from "./tauriBaiLianHttp.js";

describe("createTauriBaiLianFetchJson", () => {
  it("sends a BaiLian JSON POST through the native command and parses its returned JSON", async () => {
    const invoke = vi.fn<TauriBaiLianInvoke>().mockResolvedValue({
      status: 200,
      body: JSON.stringify({ output: { voice: "qwen-voice-1" } }),
      diagnostic: { code: "InvalidParameter", message: "已脱敏说明", requestId: "request-123" },
    });
    const request = createTauriBaiLianFetchJson(invoke);

    const response = await request(
      "https://workspace.cn-beijing.maas.aliyuncs.com/api/v1/services/audio/tts/customization",
      {
        method: "POST",
        headers: { Authorization: "Bearer bailian-test-key", "Content-Type": "application/json" },
        body: JSON.stringify({ model: "qwen-voice-enrollment" }),
      },
    );

    expect(invoke).toHaveBeenCalledWith("bailian_json_post", {
      url: "https://workspace.cn-beijing.maas.aliyuncs.com/api/v1/services/audio/tts/customization",
      apiKey: "bailian-test-key",
      body: JSON.stringify({ model: "qwen-voice-enrollment" }),
    });
    expect(response.status).toBe(200);
    expect(response.diagnostic).toEqual({ code: "InvalidParameter", message: "已脱敏说明", requestId: "request-123" });
    await expect(response.json()).resolves.toEqual({ output: { voice: "qwen-voice-1" } });
  });
});

describe("createTauriBaiLianFetchBinary", () => {
  it("downloads a temporary BaiLian result through the native command", async () => {
    const invoke = vi.fn<TauriBaiLianInvoke>().mockResolvedValue([1, 2, 3]);
    const request = createTauriBaiLianFetchBinary(invoke);
    const url = "http://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/audio.wav?Expires=123&Signature=signed";

    const response = await request(url, { method: "GET", headers: {} });

    expect(invoke).toHaveBeenCalledWith("bailian_audio_get", { url });
    expect(response.status).toBe(200);
    await expect(response.arrayBuffer()).resolves.toEqual(new Uint8Array([1, 2, 3]).buffer);
  });
});
