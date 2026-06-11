import type { ApiKeyProviderConfig, ProjectDraft } from "./types.js";

export function createApiKeyProviderConfig(config: Omit<ApiKeyProviderConfig, "enabled"> & { enabled?: boolean }): ApiKeyProviderConfig {
  return {
    ...config,
    enabled: config.enabled ?? true,
  };
}

export function validateProviderConfig(config: ApiKeyProviderConfig): string[] {
  const errors: string[] = [];

  if (!config.label.trim()) {
    errors.push("请填写配置名称");
  }

  if (!config.apiKey.trim()) {
    errors.push("请填写 API Key");
  }

  if (config.baseUrl && !isHttpUrl(config.baseUrl)) {
    errors.push("Base URL 格式不正确");
  }

  return errors;
}

export function createProjectDraft(draft: ProjectDraft): ProjectDraft {
  return {
    ...draft,
    name: draft.name.trim(),
  };
}

export function validateProjectDraft(draft: ProjectDraft): string[] {
  const errors: string[] = [];

  if (!draft.name.trim()) {
    errors.push("请填写项目名称");
  }

  if (draft.targetPlatforms.length === 0) {
    errors.push("至少选择一个发布平台");
  }

  return errors;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
