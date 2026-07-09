import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.resolve(__dirname, "AiServicesSettings.vue"), "utf-8");

describe("AiServicesSettings connection test wiring", () => {
  it("tests real service modes for Whisper, CosyVoice and HeyGem", () => {
    expect(source).toContain('mode: "whisper"');
    expect(source).toContain('mode: "cosyvoice"');
    expect(source).toContain('mode: "heygem"');
    expect(source).not.toContain(': ({ mode: "mock" } as const)');
  });

  it("supports local-whisper mode with probe runner", () => {
    expect(source).toContain('mode: "local-whisper"');
    expect(source).toContain("probe_local_whisper");
    expect(source).toContain("probe: async");
  });

  it("uses configured pythonPath for local-whisper connection test", () => {
    expect(source).toContain("config.pythonPath?.trim()");
    expect(source).toContain("DEFAULT_PYTHON_PATH");
  });

  it("shows python path input only for local-whisper", () => {
    expect(source).toContain("Python 解释器路径");
    expect(source).toContain('v-if="isLocalWhisper"');
    expect(source).toContain("editingConfig.pythonPath");
  });

  it("auto-loads default pythonPath hint for local-whisper", () => {
    expect(source).toContain("自动加载默认本地环境路径");
    expect(source).toContain("可手动覆盖");
  });

  it("uses a model dropdown for local-whisper", () => {
    expect(source).toContain("LOCAL_WHISPER_MODEL_OPTIONS");
    expect(source).toContain('v-if="isLocalWhisper"');
    expect(source).toContain('<select');
  });

  it("exposes tiny and base options for local-whisper", () => {
    expect(source).toContain('value: "tiny"');
    expect(source).toContain('value: "base"');
    expect(source).toContain("tiny：速度快");
    expect(source).toContain("base：中文质量更好");
  });

  it("shows tiny / base model trade-off hint for local-whisper", () => {
    expect(source).toContain("tiny：速度快");
    expect(source).toContain("base：中文质量更好");
    expect(source).toContain("CPU 上会明显变慢");
  });

  it("does not test a custom provider through the default OpenAI URL when baseUrl is missing", () => {
    expect(source).toContain('config.provider === "custom" && !config.baseUrl?.trim()');
    expect(source).toContain("Custom provider Base URL 不能为空。");
  });
});

describe("AiServicesSettings readiness display wiring", () => {
  it("uses a readiness helper instead of enabled alone", () => {
    expect(source).toContain("getProviderReadiness");
  });

  it("renders disabled / needs-config / untested states", () => {
    expect(source).toContain("已停用");
    expect(source).toContain("需要配置");
    expect(source).toContain("待测试");
  });

  it("filters needs-config from enabled providers with missing required fields", () => {
    expect(source).toContain('filter.value === "needs-config"');
    expect(source).toContain('"needs-config"');
  });
});

describe("AiServicesSettings connection-passed status", () => {
  it("tracks verified status through useAppSettings", () => {
    expect(source).toContain("markProviderVerified");
    expect(source).toContain("clearProviderVerified");
    expect(source).toContain("isProviderVerified");
  });

  it("only labels providers connected after a successful test", () => {
    expect(source).toContain("isProviderVerified");
    expect(source).toContain("连接正常");
  });

  it("clears verified state when a provider is saved, toggled or deleted", () => {
    expect(source).toContain("clearProviderVerified");
  });
});

describe("AiServicesSettings connection-failed status", () => {
  it("tracks failed connection test IDs through useAppSettings", () => {
    expect(source).toContain("markProviderFailed");
    expect(source).toContain("clearProviderFailed");
    expect(source).toContain("isProviderFailed");
    expect(source).not.toContain("failedConfigIds");
  });

  it("renders a connection-failed state label", () => {
    expect(source).toContain("连接失败");
    expect(source).toContain('.provider-status.failed');
  });

  it("includes failed providers in the failed filter", () => {
    expect(source).toContain('filter.value === "failed"');
  });

  it("clears the failed state on a successful retry", () => {
    expect(source).toContain("clearProviderFailed(config.id)");
  });
});

describe("AiServicesSettings API key editing boundary", () => {
  it("does not present restored empty API keys as reusable saved secrets", () => {
    expect(source).toContain("apiKeyFieldName");
    expect(source).toContain('autocomplete="new-password"');
    expect(source).toContain("已保存在本机，可留空保留，输入新值则替换");
    expect(source).not.toContain('autocomplete="off"');
  });
});

describe("rewrite provider selection UI", () => {
  it("shows '设为文案改写' action for openai/custom providers", () => {
    expect(source).toContain("设为文案改写");
  });

  it("shows active rewrite provider badge", () => {
    expect(source).toContain("文案改写使用中");
  });

  it("only shows the active rewrite badge when connection has passed", () => {
    expect(source).toContain("isActiveRewriteProvider(config) && isConnectionPassed(config)");
    expect(source).not.toContain("isActiveEnabledRewriteProvider");
  });

  it("shows a non-ready badge for active rewrite providers that are not connected", () => {
    expect(source).toContain("文案改写未就绪");
    expect(source).toContain('v-else-if="isActiveRewriteProvider(config)"');
  });

  it("shows a stop action for the active rewrite provider", () => {
    expect(source).toContain("停止文案改写");
    expect(source).toContain("setRewriteProviderConfigId(undefined)");
  });

  it("calls setRewriteProviderConfigId when selecting", () => {
    expect(source).toContain("setRewriteProviderConfigId(config.id)");
  });
});

describe("AiServicesSettings rewrite provider action states", () => {
  it("only enables '设为文案改写' when connection has passed", () => {
    expect(source).toContain("isConnectionPassed(config)");
    expect(source).toContain("设为文案改写");
    expect(source).toContain("setRewriteProviderConfigId(config.id)");
  });

  it("shows disabled '先测试连接' for enabled but unverified rewrite providers", () => {
    expect(source).toContain("先测试连接");
    expect(source).toContain('getProviderReadiness(config) === \'ready\'');
    expect(source).toContain("!isProviderVerified(config.id)");
  });

  it("shows disabled '需补全配置' for rewrite providers missing required fields", () => {
    expect(source).toContain("需补全配置");
    expect(source).toContain('getProviderReadiness(config) === \'needs-config\'');
  });

  it("does not show a rewrite action for disabled providers", () => {
    expect(source).not.toContain('getProviderReadiness(config) === "disabled"');
  });
});
