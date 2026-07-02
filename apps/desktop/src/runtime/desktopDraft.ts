import {
  WORKFLOW_STAGES,
  createApiKeyProviderConfig,
  createDefaultWorkflow,
  createProjectDraft,
  sanitizeProviderConfigForStorage,
  type ApiKeyProviderConfig,
  type ProjectDraft,
  type PublishPlatform,
  type Workflow,
  type WorkflowStageId,
  type WorkflowStageStatus,
} from "@mirax/core";
import { SUPPORTED_PLATFORM_PROFILES } from "@mirax/provider-publish";

export const DESKTOP_DRAFT_STORAGE_KEY = "mirax-ai.desktop-draft.v1";

export interface DesktopDraft {
  project: ProjectDraft;
  providerConfig: ApiKeyProviderConfig;
  activeStageId: WorkflowStageId;
  workflow: Workflow;
  transcriptText: string;
}

export interface PersistedDesktopDraft {
  project: ProjectDraft;
  providerConfig: Omit<ApiKeyProviderConfig, "apiKey">;
  activeStageId?: WorkflowStageId;
  workflow?: Workflow;
  transcriptText?: string;
}

export function createDefaultDesktopDraft(): DesktopDraft {
  return {
    project: createProjectDraft({
      name: "未命名项目",
      targetPlatforms: ["douyin", "xiaohongshu"],
      sourceVideoPath: "",
      voiceSamplePath: "",
      notes: "",
    }),
    providerConfig: createApiKeyProviderConfig({
      id: "main-ai",
      label: "主模型配置",
      provider: "openai",
      apiKey: "",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4.1",
    }),
    activeStageId: "transcribe",
    workflow: createDefaultWorkflow("demo-project"),
    transcriptText: "",
  };
}

export function sanitizeDesktopDraftForStorage(draft: DesktopDraft): PersistedDesktopDraft {
  return {
    project: draft.project,
    providerConfig: sanitizeProviderConfigForStorage(draft.providerConfig),
    activeStageId: draft.activeStageId,
    workflow: draft.workflow,
    transcriptText: draft.transcriptText,
  };
}

function sanitizeActiveStageId(value: unknown): WorkflowStageId {
  if (typeof value === "string" && WORKFLOW_STAGES.includes(value as WorkflowStageId)) {
    return value as WorkflowStageId;
  }
  return "transcribe";
}

function sanitizeWorkflow(value: unknown, defaultWorkflow: Workflow): Workflow {
  if (!value || typeof value !== "object") {
    return defaultWorkflow;
  }

  const saved = value as Partial<Workflow>;
  const savedStages = saved.stages;
  if (!Array.isArray(savedStages) || savedStages.length !== WORKFLOW_STAGES.length) {
    return defaultWorkflow;
  }

  const validStatuses: WorkflowStageStatus[] = ["pending", "running", "completed", "failed", "skipped"];
  const nextStages = savedStages.map((stage, index) => {
    const id = WORKFLOW_STAGES[index];
    const status = validStatuses.includes(stage.status as WorkflowStageStatus)
      ? (stage.status as WorkflowStageStatus)
      : "pending";
    return {
      ...stage,
      id,
      status,
    };
  });

  return {
    projectId: saved.projectId ?? defaultWorkflow.projectId,
    stages: nextStages,
    createdAt: saved.createdAt ?? defaultWorkflow.createdAt,
    updatedAt: saved.updatedAt ?? defaultWorkflow.updatedAt,
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
      ? createApiKeyProviderConfig({
          ...sanitizeProviderConfigForStorage({
            ...defaults.providerConfig,
            id: saved.providerConfig.id ?? defaults.providerConfig.id,
            label: saved.providerConfig.label ?? defaults.providerConfig.label,
            provider: saved.providerConfig.provider ?? defaults.providerConfig.provider,
            baseUrl: saved.providerConfig.baseUrl ?? defaults.providerConfig.baseUrl,
            model: saved.providerConfig.model ?? defaults.providerConfig.model,
            enabled: saved.providerConfig.enabled ?? defaults.providerConfig.enabled,
          }),
          apiKey: "",
        })
      : defaults.providerConfig,
    activeStageId: sanitizeActiveStageId(saved.activeStageId),
    workflow: sanitizeWorkflow(saved.workflow, defaults.workflow),
    transcriptText: typeof saved.transcriptText === "string" ? saved.transcriptText : defaults.transcriptText,
  };
}

function sanitizePlatforms(platforms: PublishPlatform[] | undefined): PublishPlatform[] {
  const allowed = new Set(SUPPORTED_PLATFORM_PROFILES.map((profile) => profile.id));
  const nextPlatforms = (platforms ?? []).filter((platform): platform is PublishPlatform => allowed.has(platform));
  return nextPlatforms.length > 0 ? nextPlatforms : ["douyin"];
}
