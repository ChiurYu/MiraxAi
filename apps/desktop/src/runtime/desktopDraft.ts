import {
  createApiKeyProviderConfig,
  createProjectDraft,
  sanitizeProviderConfigForStorage,
  type ApiKeyProviderConfig,
  type ProjectDraft,
  type PublishPlatform,
} from "@mirax/core";
import { SUPPORTED_PLATFORM_PROFILES } from "@mirax/provider-publish";

export const DESKTOP_DRAFT_STORAGE_KEY = "mirax-ai.desktop-draft.v1";

export interface DesktopDraft {
  project: ProjectDraft;
  providerConfig: ApiKeyProviderConfig;
}

export interface PersistedDesktopDraft {
  project: ProjectDraft;
  providerConfig: Omit<ApiKeyProviderConfig, "apiKey">;
}

export function createDefaultDesktopDraft(): DesktopDraft {
  return {
    project: createProjectDraft({
      name: "轻奢女包口播 0611",
      targetPlatforms: ["douyin", "xiaohongshu"],
      sourceVideoPath: "/素材/对标视频.mp4",
      voiceSamplePath: "/素材/声音样本.wav",
      notes: "强调通勤、大容量、上身质感。",
    }),
    providerConfig: createApiKeyProviderConfig({
      id: "main-ai",
      label: "主模型配置",
      provider: "openai",
      apiKey: "",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4.1",
    }),
  };
}

export function sanitizeDesktopDraftForStorage(draft: DesktopDraft): PersistedDesktopDraft {
  return {
    project: draft.project,
    providerConfig: sanitizeProviderConfigForStorage(draft.providerConfig),
  };
}

export function restoreDesktopDraft(saved: Partial<PersistedDesktopDraft>): DesktopDraft {
  const defaults = createDefaultDesktopDraft();

  return {
    project: saved.project
      ? {
          name: saved.project.name ?? defaults.project.name,
          sourceVideoPath: saved.project.sourceVideoPath ?? defaults.project.sourceVideoPath,
          voiceSamplePath: saved.project.voiceSamplePath ?? defaults.project.voiceSamplePath,
          notes: saved.project.notes ?? defaults.project.notes,
          targetPlatforms: sanitizePlatforms(saved.project.targetPlatforms),
        }
      : defaults.project,
    providerConfig: saved.providerConfig
      ? {
          ...defaults.providerConfig,
          id: saved.providerConfig.id ?? defaults.providerConfig.id,
          label: saved.providerConfig.label ?? defaults.providerConfig.label,
          provider: saved.providerConfig.provider ?? defaults.providerConfig.provider,
          baseUrl: saved.providerConfig.baseUrl ?? defaults.providerConfig.baseUrl,
          model: saved.providerConfig.model ?? defaults.providerConfig.model,
          enabled: saved.providerConfig.enabled ?? defaults.providerConfig.enabled,
        }
      : defaults.providerConfig,
  };
}

function sanitizePlatforms(platforms: PublishPlatform[] | undefined): PublishPlatform[] {
  const allowed = new Set(SUPPORTED_PLATFORM_PROFILES.map((profile) => profile.id));
  const nextPlatforms = (platforms ?? []).filter((platform): platform is PublishPlatform => allowed.has(platform));
  return nextPlatforms.length > 0 ? nextPlatforms : ["douyin"];
}
