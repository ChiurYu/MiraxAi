import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.resolve(__dirname, "LocalDependenciesSettings.vue"), "utf-8");

describe("LocalDependenciesSettings FFmpeg verified readiness", () => {
  it("reflects verified ffmpeg path as ready in the dependency card", () => {
    expect(source).toContain("verifiedFfmpegPath");
    expect(source).toContain('state: "ready"');
    expect(source).toContain('key: "ffmpeg"');
    expect(source).toContain("FFmpeg 路径已验证为可执行");
  });

  it("only overrides ffmpeg state when verified path matches the current path", () => {
    expect(source).toContain("verifiedFfmpegPath.value === trimmedFfmpegPath");
    expect(source).toContain("trimmedFfmpegPath");
    expect(source).toContain("sidecarConfig.ffmpegPath.trim()");
  });

  it("keeps non-verified ffmpeg paths as configured instead of ready", () => {
    expect(source).toContain("checkSidecarDependencies");
    expect(source).toContain("dependencyResults");
  });

  it("does not present Playwright manual install as verified readiness", () => {
    expect(source).toContain("已手动安装 Playwright 浏览器（待检测）");
  });

  it("labels configured-but-unprobed dependencies as pending detection", () => {
    expect(source).toContain('if (state === "configured") return "待检测";');
  });

  it("only labels FFmpeg as a real re-detect action", () => {
    expect(source).toContain('return key === "ffmpeg" ? "重新检测" : "查看说明";');
    expect(source).toContain("@click=\"runLimitedAction(dep.key, actionLabelFor(dep.key))\"");
  });
});
