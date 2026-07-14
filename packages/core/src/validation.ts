import type { ApiKeyProviderConfig, AppSettings, AppTheme, ProjectDraft, PublishMetadata, PublishPlatform } from "./types.js";

export type ProviderConfigMetadata = Omit<ApiKeyProviderConfig, "apiKey">;

export function createApiKeyProviderConfig(config: Omit<ApiKeyProviderConfig, "enabled"> & { enabled?: boolean }): ApiKeyProviderConfig {
  return {
    ...config,
    enabled: config.enabled ?? true,
  };
}

export function sanitizeProviderConfigForStorage(config: ApiKeyProviderConfig): ProviderConfigMetadata {
  return {
    id: config.id,
    label: config.label,
    provider: config.provider,
    baseUrl: sanitizeBaseUrlForStorage(config.baseUrl),
    pythonPath: config.pythonPath,
    model: config.model,
    voiceId: config.voiceId,
    enabled: config.enabled,
  };
}

/**
 * 只保留 baseUrl 的协议、主机、端口与路径，剔除 username / password / query / hash。
 * 如果 URL 非法，直接返回 undefined，由 `validateProviderConfig` 在保存时给出错误提示。
 */
export function sanitizeBaseUrlForStorage(baseUrl: string | undefined): string | undefined {
  if (!baseUrl) {
    return undefined;
  }

  try {
    const url = new URL(baseUrl);
    const pathname = url.pathname === "/" ? "" : url.pathname;
    return `${url.origin}${pathname}`;
  } catch {
    return undefined;
  }
}

export function validateProviderConfig(config: ApiKeyProviderConfig): string[] {
  const errors: string[] = [];

  if (!config.label.trim()) {
    errors.push("请填写配置名称");
  }

  if ((config.provider === "openai" || config.provider === "custom" || config.provider === "elevenlabs-tts" || config.provider === "bailian-qwen-tts" || config.provider === "bailian-cosyvoice") && !config.apiKey.trim()) {
    errors.push("请填写 API Key");
  }

  if (config.baseUrl && !isHttpUrl(config.baseUrl)) {
    errors.push("Base URL 格式不正确");
  }

  return errors;
}

export function createProjectDraft(draft: Partial<ProjectDraft> & Pick<ProjectDraft, "name" | "targetPlatforms">): ProjectDraft {
  return {
    id: draft.id ?? generateUuid(),
    name: draft.name.trim(),
    targetPlatforms: draft.targetPlatforms,
    sourceVideoPath: draft.sourceVideoPath,
    voiceSamplePath: draft.voiceSamplePath,
    notes: draft.notes,
    audioPath: draft.audioPath,
    avatarVideoPath: draft.avatarVideoPath,
    finalVideoPath: draft.finalVideoPath,
    coverPath: draft.coverPath,
  };
}

function generateUuid(): string {
  // 简单的 UUID v4 实现，不引入外部依赖。
  const hex = "0123456789abcdef";
  let uuid = "";
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += "-";
    } else if (i === 14) {
      uuid += "4";
    } else if (i === 19) {
      uuid += hex[(Math.random() * 4) | 8];
    } else {
      uuid += hex[(Math.random() * 16) | 0];
    }
  }
  return uuid;
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

const APP_THEMES: AppTheme[] = ["light", "dark", "system"];

export function createDefaultAppSettings(id = "default"): AppSettings {
  return {
    id,
    theme: "system",
    outputPaths: {
      baseOutput: "/Users/Shared/MiraxAI",
      audioOutput: "/Users/Shared/MiraxAI/audio",
      videoOutput: "/Users/Shared/MiraxAI/video",
      draftOutput: "/Users/Shared/MiraxAI/drafts",
      exportOutput: "/Users/Shared/MiraxAI/export",
      thumbsOutput: "/Users/Shared/MiraxAI/thumbs",
    },
    rewriteProviderConfigId: undefined,
    activeVoiceSampleStorageRootId: undefined,
  };
}

export function validateAppSettings(settings: AppSettings): string[] {
  const errors: string[] = [];

  if (!settings.id.trim()) {
    errors.push("设置 ID 不能为空");
  }

  if (!APP_THEMES.includes(settings.theme)) {
    errors.push("主题值无效");
  }

  const paths = settings.outputPaths;
  if (!paths.baseOutput.trim()) {
    errors.push("基础输出目录不能为空");
  }

  return errors;
}

export function createDefaultPublishMetadata(): PublishMetadata {
  return {
    title: "",
    description: "",
    tags: [],
    mode: "draft",
  };
}

export function validatePublishMetadata(metadata: PublishMetadata, platforms: PublishPlatform[]): string[] {
  const errors: string[] = [];

  if (!metadata.title.trim()) {
    errors.push("请填写标题");
  }

  if (!metadata.description.trim()) {
    errors.push("请填写描述");
  }

  if (platforms.length === 0) {
    errors.push("至少选择一个发布平台");
  }

  if (metadata.mode !== "direct" && metadata.mode !== "draft") {
    errors.push("发布方式无效");
  }

  return errors;
}
