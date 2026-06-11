import { describe, expect, it } from "vitest";
import { checkSidecarDependencies } from "../src/index.js";

describe("sidecar dependency checks", () => {
  it("returns actionable Chinese messages for missing local dependencies", () => {
    const results = checkSidecarDependencies({});

    expect(results).toEqual([
      expect.objectContaining({ key: "ffmpeg", ok: false, message: "请先配置 FFmpeg 可执行文件路径" }),
      expect.objectContaining({ key: "playwright", ok: false, message: "请先安装 Playwright 浏览器用于自动发布" }),
      expect.objectContaining({ key: "python", ok: false, message: "请配置 Python 本地服务地址" }),
      expect.objectContaining({ key: "heygem", ok: false, message: "请配置 HeyGem 服务地址" }),
      expect.objectContaining({ key: "cosyvoice", ok: false, message: "请配置 CosyVoice 服务地址" }),
    ]);
  });

  it("accepts configured paths and http service URLs", () => {
    const results = checkSidecarDependencies({
      ffmpegPath: "/usr/local/bin/ffmpeg",
      hasPlaywrightBrowser: true,
      pythonServiceUrl: "http://127.0.0.1:8000",
      heygemServiceUrl: "http://127.0.0.1:8383",
      cosyVoiceServiceUrl: "http://127.0.0.1:9880",
    });

    expect(results.every((result) => result.ok)).toBe(true);
  });
});
