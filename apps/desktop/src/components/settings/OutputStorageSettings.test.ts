import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.join(__dirname, "OutputStorageSettings.vue"), "utf-8");
const template = source.match(/<template>([\s\S]*?)<\/template>/)?.[1] ?? "";

describe("OutputStorageSettings voice sample root", () => {
  it("leaves the selected-directory status to PathPickerButton", () => {
    expect(template).not.toContain('class="voice-root-status status-selected"');
    expect(template).not.toContain("已选择：{{ selectedVoiceSampleRootName }}");
  });

  it("updates the shared in-memory root id after SQLite accepts a directory", () => {
    expect(source).toContain("appSettings.activeVoiceSampleStorageRootId = voiceStorage.activeRoot.value?.id");
  });
});
