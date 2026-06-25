import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const srcDir = path.resolve(__dirname, "../..");

function read(filePath: string): string {
  return fs.readFileSync(path.join(srcDir, filePath), "utf-8");
}

function extractTemplate(source: string): string {
  const match = source.match(/<template>([\s\S]*?)<\/template>/);
  return match ? match[1] : "";
}

describe("Workbench WB-01 layout contracts", () => {
  const topBar = read("components/app/TopBar.vue");
  const topBarTemplate = extractTemplate(topBar);
  const frame = read("components/workbench/WorkbenchStageFrame.vue");
  const frameTemplate = extractTemplate(frame);
  const preview = read("components/workbench/stages/MaterialParsingPreview.vue");
  const previewTemplate = extractTemplate(preview);

  it("Workbench topbar does not render progress pill", () => {
    expect(topBarTemplate).not.toMatch(/progress-pill/);
  });

  it("Workbench topbar does not render 清空数据", () => {
    expect(topBarTemplate).not.toMatch(/清空数据/);
  });

  it("Workbench topbar does not render 运行全部", () => {
    expect(topBarTemplate).not.toMatch(/运行全部/);
  });

  it("Workbench topbar does not render 运行下一步", () => {
    expect(topBarTemplate).not.toMatch(/运行下一步/);
  });

  it("Workbench topbar does not reuse generic icon-button", () => {
    expect(topBarTemplate).not.toMatch(/icon-button/);
  });

  it("Workbench topbar uses Lucide Cloud for autosaved state", () => {
    expect(topBarTemplate).toMatch(/<Cloud /);
    expect(topBarTemplate).not.toMatch(/CloudCheck/);
    expect(topBar).not.toMatch(/components\/icons\/CloudCheck/);
  });

  it("Workbench topbar avoids non-functional chrome icons", () => {
    expect(topBarTemplate).not.toMatch(/ArrowLeft/);
    expect(topBarTemplate).not.toMatch(/Bell/);
    expect(topBarTemplate).not.toMatch(/HelpCircle/);
    expect(topBarTemplate).not.toMatch(/UserRound/);
    expect(topBar).toMatch(/toggleTheme/);
  });

  it("WorkbenchStageFrame does not render duplicate stage header", () => {
    expect(frameTemplate).not.toMatch(/stage-controls-header/);
    expect(frameTemplate).not.toMatch(/stage-number/);
    expect(frameTemplate).not.toMatch(/stage-heading/);
  });

  it("MaterialParsingPreview renders exactly one 9:16 placeholder", () => {
    const phoneMatches = previewTemplate.match(/preview-phone/g) ?? [];
    expect(phoneMatches).toHaveLength(1);
  });
});
