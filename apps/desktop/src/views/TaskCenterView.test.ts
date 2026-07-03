import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const srcDir = path.resolve(__dirname);
const source = fs.readFileSync(path.join(srcDir, "TaskCenterView.vue"), "utf-8");
const template = source.match(/<template>([\s\S]*?)<\/template>/)?.[1] ?? "";

describe("TaskCenterView mock label", () => {
  it("labels task center as local mock tasks so users do not assume real platform tasks", () => {
    expect(source).toContain("本地模拟任务");
    expect(template).toContain('data-testid="task-center-mock-badge"');
  });
});
