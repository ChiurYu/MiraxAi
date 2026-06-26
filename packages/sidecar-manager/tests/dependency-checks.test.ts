import { describe, expect, it } from "vitest";
import {
  checkSidecarDependencies,
  detectFfmpeg,
  detectPlaywright,
  detectService,
  startSidecarDependency,
  stopSidecarDependency,
} from "../src/index.js";

describe("sidecar dependency checks", () => {
  it("returns actionable Chinese messages for missing local dependencies", () => {
    const results = checkSidecarDependencies({});

    expect(results).toEqual([
      expect.objectContaining({ key: "ffmpeg", ok: false, state: "missing" }),
      expect.objectContaining({ key: "playwright", ok: false, state: "missing" }),
      expect.objectContaining({ key: "python", ok: false, state: "missing" }),
      expect.objectContaining({ key: "heygem", ok: false, state: "missing" }),
      expect.objectContaining({ key: "cosyvoice", ok: false, state: "missing" }),
    ]);

    for (const result of results) {
      expect(result.message).toBeTruthy();
      // 状态 message 不应暴露任何具体路径或 URL
      expect(result.message).not.toMatch(/\//);
      expect(result.message).not.toMatch(/\\/);
    }
  });

  it("marks configured-but-not-probed dependencies as configured", () => {
    const results = checkSidecarDependencies({
      ffmpegPath: "/usr/local/bin/ffmpeg",
      hasPlaywrightBrowser: true,
      pythonServiceUrl: "http://127.0.0.1:8000",
      heygemServiceUrl: "http://127.0.0.1:8383",
      cosyVoiceServiceUrl: "http://127.0.0.1:9880",
    });

    expect(results).toEqual([
      expect.objectContaining({ key: "ffmpeg", ok: true, state: "configured" }),
      expect.objectContaining({ key: "playwright", ok: true, state: "ready" }),
      expect.objectContaining({ key: "python", ok: true, state: "configured" }),
      expect.objectContaining({ key: "heygem", ok: true, state: "configured" }),
      expect.objectContaining({ key: "cosyvoice", ok: true, state: "configured" }),
    ]);
  });

  it("reports malformed service URLs as unavailable without leaking the value", () => {
    const results = checkSidecarDependencies({
      pythonServiceUrl: "not-a-url",
      heygemServiceUrl: "ftp://127.0.0.1:8383",
      cosyVoiceServiceUrl: "http://[invalid",
    });

    const python = results.find((r) => r.key === "python")!;
    const heygem = results.find((r) => r.key === "heygem")!;
    const cosyvoice = results.find((r) => r.key === "cosyvoice")!;

    expect(python.state).toBe("unavailable");
    expect(python.message).toContain("格式不正确");
    expect(heygem.state).toBe("unavailable");
    expect(cosyvoice.state).toBe("unavailable");

    for (const result of [python, heygem, cosyvoice]) {
      expect(result.message).not.toContain("not-a-url");
      expect(result.message).not.toContain("ftp://");
      expect(result.message).not.toContain("[invalid");
    }
  });

  it("uses optional probes to distinguish ready from unavailable", () => {
    const results = checkSidecarDependencies(
      {
        ffmpegPath: "/usr/local/bin/ffmpeg",
        pythonServiceUrl: "http://127.0.0.1:8000",
        heygemServiceUrl: "http://127.0.0.1:8383",
      },
      {
        ffmpegExists: () => true,
        serviceHealthy: (url) => url.endsWith(":8000"),
      },
    );

    expect(results.find((r) => r.key === "ffmpeg")?.state).toBe("ready");
    expect(results.find((r) => r.key === "python")?.state).toBe("ready");
    expect(results.find((r) => r.key === "heygem")?.state).toBe("unavailable");
  });

  it("does not expose absolute paths in detection messages", () => {
    const result = detectFfmpeg("/Users/bob/secret/ffmpeg");

    expect(result.state).toBe("configured");
    expect(result.message).not.toContain("/Users/bob/secret/ffmpeg");
  });

  it("exposes per-dependency detectors", () => {
    expect(detectFfmpeg("").state).toBe("missing");
    expect(detectPlaywright(false).state).toBe("missing");
    expect(detectService("cosyvoice", "").state).toBe("missing");
    expect(detectService("python", "http://localhost:9000").state).toBe("configured");
    expect(detectService("heygem", "bad-url").state).toBe("unavailable");
  });

  it("refuses to start or stop real dependencies in MVP", async () => {
    await expect(startSidecarDependency("ffmpeg")).rejects.toThrow("启动尚未接入");
    await expect(stopSidecarDependency("cosyvoice")).rejects.toThrow("停止尚未接入");
  });
});
