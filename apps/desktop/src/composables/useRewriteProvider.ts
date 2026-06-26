import type { ApiKeyProviderConfig, WorkflowStageRuntimeMode } from "@mirax/core";
import { AiProviderError, createOpenAiCompatibleProvider, type AiProvider } from "@mirax/provider-ai";

export interface RewriteProviderSelectionInput {
  stageMode: WorkflowStageRuntimeMode;
  providerConfigs: ApiKeyProviderConfig[];
  mockProvider: AiProvider;
}

export type RewriteProviderSelectionResult =
  | { ok: true; provider: AiProvider }
  | { ok: false; error: AiProviderError };

/**
 * 为 rewrite 阶段选择 mock 或 real provider。
 *
 * 边界：
 * - mock 模式直接返回 mockProvider。
 * - not-connected 模式返回结构化 not-connected 错误，不尝试调用真实服务。
 * - real 模式只在存在启用且合法的 OpenAI-compatible 配置时构造真实 provider；
 *   任一条件不满足返回 not-configured，不静默 fallback 到 mock。
 */
export function selectRewriteProvider(input: RewriteProviderSelectionInput): RewriteProviderSelectionResult {
  if (input.stageMode === "mock") {
    return { ok: true, provider: input.mockProvider };
  }

  if (input.stageMode === "not-connected") {
    return {
      ok: false,
      error: new AiProviderError("not-connected", "Rewrite 真实 LLM 未连接。"),
    };
  }

  const config = input.providerConfigs.find(
    (c) => c.enabled && (c.provider === "openai" || c.provider === "custom"),
  );
  if (!config) {
    const hasEnabled = input.providerConfigs.some((c) => c.enabled);
    return {
      ok: false,
      error: new AiProviderError(
        "not-configured",
        hasEnabled ? "当前启用的 provider 不适用于文案改写，请启用 openai 或 custom。" : "未启用任何 LLM provider。",
      ),
    };
  }

  if (!config.apiKey.trim()) {
    return {
      ok: false,
      error: new AiProviderError("not-configured", "LLM provider API key 为空。"),
    };
  }

  if (!config.model?.trim()) {
    return {
      ok: false,
      error: new AiProviderError("not-configured", "LLM provider model 为空。"),
    };
  }

  if (config.provider === "custom" && !config.baseUrl?.trim()) {
    return {
      ok: false,
      error: new AiProviderError("not-configured", "Custom LLM provider 必须提供 baseUrl。"),
    };
  }

  try {
    const provider = createOpenAiCompatibleProvider({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      model: config.model!,
    });
    return { ok: true, provider };
  } catch (error) {
    if (error instanceof AiProviderError) {
      return { ok: false, error };
    }
    return {
      ok: false,
      error: new AiProviderError("not-configured", "创建 LLM provider 失败。"),
    };
  }
}
