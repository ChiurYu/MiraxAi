import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const srcDir = path.resolve(__dirname);
const source = fs.readFileSync(path.join(srcDir, "VideoCompositionStage.vue"), "utf-8");
const template = source.match(/<template>([\s\S]*?)<\/template>/)?.[1] ?? "";
const appSource = fs.readFileSync(path.resolve(srcDir, "../../..", "App.vue"), "utf-8");

describe("VideoCompositionStage UI contracts", () => {
  it("renders compose runtime mode states", () => {
    expect(source).toContain("Mock 合成");
    expect(source).toContain("真实合成未连接");
    expect(source).toContain("真实合成模式：将使用设置中的 FFmpeg 生成 finalVideoPath。");
  });

  it("renders a failed-state error banner", () => {
    expect(template).toContain("status-banner status-error");
  });

  it("App passes compose mode and safe error message into the stage", () => {
    expect(appSource).toContain(":mode=\"composeMode\"");
    expect(appSource).toContain(":error-message=\"composeErrorMessage\"");
  });

  it("App clears stale compose output before real composition", () => {
    expect(appSource).toContain("if (composeMode === \"real\") {");
    expect(appSource).toContain("generatedVideoPath.value = \"\";");
    expect(appSource).toContain("generatedCoverPath.value = \"\";");
  });

  it("guards convertFileSrc behind isTauriAvailable so web dev mode does not call it", () => {
    const script = source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)?.[1] ?? "";
    expect(script).toContain("function isTauriAvailable()");
    expect(script).toContain('"__TAURI_INTERNALS__" in window');

    const videoSrcBlock = script.match(/const videoSrc = computed\(\(\) => \{[\s\S]*?\n\}\);/)?.[0] ?? "";
    expect(videoSrcBlock).toContain("if (isTauriAvailable())");
    expect(videoSrcBlock).toContain('return convertFileSrc(props.videoPath, "asset")');
    expect(videoSrcBlock).toContain("return props.videoPath");
  });
});
