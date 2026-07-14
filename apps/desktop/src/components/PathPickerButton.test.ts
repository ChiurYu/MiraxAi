import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const srcDir = path.resolve(__dirname);
const source = fs.readFileSync(path.join(srcDir, "PathPickerButton.vue"), "utf-8");
const template = source.match(/<template>([\s\S]*?)<\/template>/)?.[1] ?? "";
const script = source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)?.[1] ?? "";

describe("PathPickerButton directory-only boundary", () => {
  it("exposes a directory prop", () => {
    expect(script).toContain("directory?: boolean");
    expect(script).toContain('directory: false');
  });

  it("binds input readonly to the directory prop so manual typing cannot submit paths", () => {
    const inputMatch = template.match(/<input[\s\S]*?\/?\s*>/);
    expect(inputMatch).toBeTruthy();
    const inputTag = inputMatch![0];
    expect(inputTag).toContain(':readonly="directory"');
  });

  it("keeps the input handler for non-directory mode", () => {
    const inputMatch = template.match(/<input[\s\S]*?\/?\s*>/);
    expect(inputMatch).toBeTruthy();
    const inputTag = inputMatch![0];
    expect(inputTag).toContain('@input="onInputChange"');
  });

  it("only emits selected from the Tauri dialog when directory mode is active", () => {
    expect(script).toContain("commitValue(selected)");
    expect(script).toContain("directory: props.directory");
  });

  it("does not fall back to browser prompt in directory mode", () => {
    const fallbackBlock = script.match(/if \(!isTauriAvailable\(\)\) \{[\s\S]*?\n  \}/)?.[0] ?? "";
    expect(fallbackBlock).toContain('if (props.directory)');
    expect(fallbackBlock).toContain('window.prompt');
  });
});
