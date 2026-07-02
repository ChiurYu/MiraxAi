import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const srcDir = path.resolve(__dirname);
const source = fs.readFileSync(path.join(srcDir, "ContentReviewStage.vue"), "utf-8");
const template = source.match(/<template>([\s\S]*?)<\/template>/)?.[1] ?? "";
const script = source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)?.[1] ?? "";

describe("ContentReviewStage UI contracts", () => {
  it("derives readiness from the shared helper", () => {
    expect(script).toContain('import { deriveContentReviewReadiness, fileName } from "./contentReviewReadiness.js"');
    expect(script).toContain("deriveContentReviewReadiness({");
    expect(script).toContain("readinessItems.value.every((item) => item.ok)");
  });

  it("renders readiness list from the same readinessItems", () => {
    const listBlock = template.match(/<ul class="readiness-list">([\s\S]*?)<\/ul>/)?.[1] ?? "";
    expect(listBlock).toContain("v-for=\"item in readinessItems\"");
    expect(listBlock).toContain(":class=\"{ ok: item.ok }\"");
  });

  it("renders review summary from the same readinessItems", () => {
    const summaryBlock = template.match(/<div class="review-summary">([\s\S]*?)<\/div>/)?.[1] ?? "";
    expect(summaryBlock).toContain("v-for=\"item in readinessItems\"");
    expect(summaryBlock).toContain("{{ item.name }}");
    expect(summaryBlock).toContain("{{ item.value }}");
  });

  it("does not fake account readiness", () => {
    expect(source).not.toContain("账号状态正常");
    expect(source).not.toContain('id: "accounts"');
  });

  it("disables confirm until all readiness items and video are ready", () => {
    expect(script).toContain("const confirmDisabled = computed(() => props.running || !allReady.value || !props.videoPath)");
  });
});
