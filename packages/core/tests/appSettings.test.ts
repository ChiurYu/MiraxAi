import { describe, expect, it } from "vitest";
import { createDefaultAppSettings, validateAppSettings } from "../src/validation.js";

describe("AppSettings", () => {
  it("creates default settings with all output paths", () => {
    const settings = createDefaultAppSettings();

    expect(settings.id).toBe("default");
    expect(settings.theme).toBe("system");
    expect(settings.outputPaths.baseOutput).toBeTruthy();
    expect(settings.outputPaths.audioOutput).toContain("audio");
  });

  it("validates empty id and base output path", () => {
    const settings = createDefaultAppSettings();
    settings.id = "";
    settings.outputPaths.baseOutput = "";

    const errors = validateAppSettings(settings);

    expect(errors).toContain("设置 ID 不能为空");
    expect(errors).toContain("基础输出目录不能为空");
  });

  it("rejects invalid theme", () => {
    const settings = createDefaultAppSettings();
    (settings as { theme: string }).theme = "invalid";

    const errors = validateAppSettings(settings);

    expect(errors).toContain("主题值无效");
  });
});
