import { sanitizeBaseUrlForStorage, type ApiKeyProviderConfig, type WorkflowStageRuntimeMode } from "@mirax/core";
import { AiProviderError, createHeyGemProvider, type AiProvider } from "@mirax/provider-ai";
import { findEnabledAvatarProviderConfig } from "./useAppSettings.js";

export interface AvatarProviderSelectionInput {
  stageMode: WorkflowStageRuntimeMode;
  providerConfigs: ApiKeyProviderConfig[];
  mockProvider: AiProvider;
}

export type AvatarProviderSelectionResult =
  | { ok: true; provider: AiProvider }
  | { ok: false; error: AiProviderError };

export function selectAvatarProvider(input: AvatarProviderSelectionInput): AvatarProviderSelectionResult {
  if (input.stageMode === "mock") {
    return { ok: true, provider: input.mockProvider };
  }

  if (input.stageMode === "not-connected") {
    return {
      ok: false,
      error: new AiProviderError("not-connected", "Avatar 真实数字人未连接。"),
    };
  }

  const config = findEnabledAvatarProviderConfig(input.providerConfigs);
  if (!config) {
    const hasEnabled = input.providerConfigs.some((c) => c.enabled);
    return {
      ok: false,
      error: new AiProviderError(
        "not-configured",
        hasEnabled ? "当前启用的 provider 不适用于数字人生成，请启用 HeyGem。" : "未启用任何数字人 provider。",
      ),
    };
  }

  const sanitizedBaseUrl = config.baseUrl ? sanitizeBaseUrlForStorage(config.baseUrl.trim()) : undefined;
  if (!sanitizedBaseUrl) {
    return {
      ok: false,
      error: new AiProviderError("not-configured", "HeyGem provider 必须提供合法 baseUrl。"),
    };
  }

  try {
    return {
      ok: true,
      provider: createHeyGemProvider({
        baseUrl: sanitizedBaseUrl,
        apiKey: config.apiKey,
        model: config.model,
      }),
    };
  } catch (error) {
    if (error instanceof AiProviderError) {
      return { ok: false, error };
    }
    return {
      ok: false,
      error: new AiProviderError("not-configured", "创建数字人 provider 失败。"),
    };
  }
}

export function buildAvatarOutputPath(videoOutputRoot: string, projectId: string): string {
  return joinPath(videoOutputRoot, projectId, "avatar", "avatar.mp4");
}

function joinPath(...segments: string[]): string {
  return segments
    .map((segment) => segment.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/")
    .replace(/^/, segments[0]?.startsWith("/") ? "/" : "");
}
