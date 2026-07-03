import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const srcDir = path.resolve(__dirname);
const source = fs.readFileSync(path.join(srcDir, "PublishStage.vue"), "utf-8");
const template = source.match(/<template>([\s\S]*?)<\/template>/)?.[1] ?? "";

describe("PublishStage mock label", () => {
  it("labels publish as mock-only so users do not assume real platform submission", () => {
    expect(source).toContain("Mock 发布");
    expect(template).toContain('data-testid="publish-mock-badge"');
    expect(template).toContain('data-testid="publish-mock-action-badge"');
  });
});
