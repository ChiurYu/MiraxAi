import { describe, expect, it } from "vitest";
import { createDefaultSidecarConfig, validateSidecarConfig } from "../src/config.js";

describe("SidecarConfig", () => {
  it("creates default config with empty paths", () => {
    const config = createDefaultSidecarConfig();

    expect(config.id).toBe("default");
    expect(config.ffmpegPath).toBe("");
    expect(config.hasPlaywrightBrowser).toBe(false);
  });

  it("validates empty id", () => {
    const config = createDefaultSidecarConfig();
    config.id = "";

    const errors = validateSidecarConfig(config);

    expect(errors).toContain("配置 ID 不能为空");
  });

  it("accepts valid config", () => {
    const config = createDefaultSidecarConfig("prod");
    config.ffmpegPath = "/usr/local/bin/ffmpeg";

    const errors = validateSidecarConfig(config);

    expect(errors).toHaveLength(0);
  });
});
