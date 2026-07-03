import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const srcDir = path.resolve(__dirname);
const source = fs.readFileSync(path.join(srcDir, "AccountManagementView.vue"), "utf-8");
const template = source.match(/<template>([\s\S]*?)<\/template>/)?.[1] ?? "";

describe("AccountManagementView mock label", () => {
  it("labels account management as mock accounts so users do not assume real OAuth", () => {
    expect(source).toContain("Mock 账号");
    expect(template).toContain('data-testid="account-mock-badge"');
  });
});
