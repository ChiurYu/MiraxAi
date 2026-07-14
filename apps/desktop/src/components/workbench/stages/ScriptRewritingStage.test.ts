import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { shouldRecordVersion } from "./scriptRewritingStage.utils.js";

const srcDir = path.resolve(__dirname);
const source = fs.readFileSync(path.join(srcDir, "ScriptRewritingStage.vue"), "utf-8");
const template = source.match(/<template>([\s\S]*?)<\/template>/)?.[1] ?? "";

describe("ScriptRewritingStage version recording", () => {
  it("records a version when mock mode completes with non-empty script", () => {
    expect(shouldRecordVersion("running", "completed", "改写文案", "mock")).toBe(true);
  });

  it("records a version when real mode completes with non-empty script", () => {
    expect(shouldRecordVersion("running", "completed", "改写文案", "real")).toBe(true);
  });

  it("does not record a version when not-connected mode completes", () => {
    expect(shouldRecordVersion("running", "completed", "改写文案", "not-connected")).toBe(false);
  });

  it("does not record a version when the script is empty", () => {
    expect(shouldRecordVersion("running", "completed", "   ", "mock")).toBe(false);
  });

  it("does not record a version when status was not running", () => {
    expect(shouldRecordVersion("pending", "completed", "改写文案", "mock")).toBe(false);
  });

  it("does not record a version when status did not become completed", () => {
    expect(shouldRecordVersion("running", "failed", "改写文案", "mock")).toBe(false);
  });
});

describe("ScriptRewritingStage UI contracts", () => {
  it("renders a mock result badge in mock mode", () => {
    expect(source).toContain("Mock 结果");
  });

  it("renders an honest not-connected hint", () => {
    expect(source).toContain("真实 LLM 未连接");
    expect(source).toContain("请在设置中配置并启用 OpenAI-compatible provider");
  });

  it("renders a real-mode info hint", () => {
    expect(source).toContain("真实 LLM 模式：将使用设置中启用的 provider 发起真实调用。");
  });

  it("renders an error banner", () => {
    expect(template).toContain("status-banner status-error");
  });

  it("accepts an optional statusMessage prop", () => {
    const script = source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)?.[1] ?? "";
    expect(script).toContain("statusMessage?: string");
  });

  it("renders statusMessage in a visible feedback banner", () => {
    expect(template).toContain("rewrite-feedback");
    expect(template).toMatch(/v-if="rewriteFeedbackMessage"/);
  });

  it("shows a visible rewrite feedback banner near the generate button", () => {
    expect(source).toContain("rewriteFeedbackMessage");
    expect(template).toContain("rewrite-feedback");
    expect(source).toContain("正在生成改写文案，请稍等...");
  });

  it("does not render apiKey, baseUrl, token or sk- literals in the template", () => {
    const lower = template.toLowerCase();
    expect(lower).not.toContain("apikey");
    expect(lower).not.toContain("baseurl");
    expect(lower).not.toContain("sk-");
    expect(lower).not.toContain("token");
  });

  it("disables the result box and generate button in not-connected mode", () => {
    // The textarea disabled state is bound to running || isNotConnected.
    expect(template).toMatch(/:disabled="running \|\| isNotConnected"/);
    // The generate button disabled state is bound to !canRun, which includes isNotConnected.
    expect(template).toMatch(/:disabled="!canRun"/);
  });

  it("makes the transcript textarea editable", () => {
    const transcriptBlock = template.match(/<textarea[\s\S]*?class="transcript-box"[\s\S]*?\/?>/)?.[0] ?? "";
    expect(transcriptBlock).not.toContain("readonly");
    expect(transcriptBlock).toContain("@input=\"emit('update:transcriptText'");
  });

  it("emits update:transcriptText from the component", () => {
    const script = source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)?.[1] ?? "";
    expect(script).toContain('"update:transcriptText": [value: string]');
  });

  it("emits run with activeGoal, activePreset and targetLength options", () => {
    const script = source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)?.[1] ?? "";
    expect(script).toContain("run: [options: { activeGoal: string; activePreset: string; targetLength: number }]");
    expect(script).toContain('emit("run", { activeGoal: activeGoal.value, activePreset: activePreset.value, targetLength: targetLength.value })');
  });

  it("renders an explicit adopt button", () => {
    expect(template).toContain("采用此文案");
  });

  it("emits adopt from the component", () => {
    const script = source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)?.[1] ?? "";
    expect(script).toContain("adopt: []");
    expect(script).toContain('emit("adopt")');
  });

  it("disables the adopt button unless the stage is completed with a script", () => {
    expect(template).toMatch(/:disabled="!canAdopt"/);
    const script = source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)?.[1] ?? "";
    expect(script).toContain('props.status === "completed"');
    expect(script).toContain("rewrittenScript.value.trim().length > 0");
  });

  it("accepts activeGoal, activePreset and targetLength as controlled props", () => {
    const script = source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)?.[1] ?? "";
    expect(script).toContain("activeGoal: string");
    expect(script).toContain("activePreset: string");
    expect(script).toContain("targetLength: number");
  });

  it("emits update:activeGoal, update:activePreset and update:targetLength", () => {
    const script = source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)?.[1] ?? "";
    expect(script).toContain('"update:activeGoal": [value: string]');
    expect(script).toContain('"update:activePreset": [value: string]');
    expect(script).toContain('"update:targetLength": [value: number]');
  });
});
