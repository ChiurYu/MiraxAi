import type {
  ProjectDraft,
  StageProgress,
  Workflow,
  WorkflowStage,
  WorkflowStageId,
  WorkflowStageRuntimeMode,
  WorkflowStageStatus,
} from "./types.js";

export const WORKFLOW_STAGES: WorkflowStageId[] = [
  "transcribe",
  "rewrite",
  "voice-clone",
  "speech",
  "avatar",
  "compose",
  "review",
  "publish",
];

/**
 * 阶段执行的前置依赖与产物。
 *
 * 说明：
 * - `stageInputs`：逻辑上必须先完成的工作台阶段（用于真实接入时的人工/自动检查点）。
 * - `artifactInputs`：当前阶段执行前必须在 `ProjectDraft` 中存在的产物或源素材字段。
 * - `outputs`：当前阶段产生并供下游消费的产物标识；部分产物为 session 级（如 `transcriptText`、`voiceId`），不在 `ProjectDraft` 中。
 */
export interface StagePrerequisites {
  stageInputs: WorkflowStageId[];
  artifactInputs: (keyof ProjectDraft)[];
  outputs: string[];
}

export const STAGE_PREREQUISITES: Record<WorkflowStageId, StagePrerequisites> = {
  transcribe: {
    stageInputs: [],
    artifactInputs: ["sourceVideoPath"],
    outputs: ["transcriptText"],
  },
  rewrite: {
    stageInputs: ["transcribe"],
    artifactInputs: [],
    outputs: ["notes"],
  },
  "voice-clone": {
    stageInputs: [],
    artifactInputs: ["voiceSamplePath"],
    outputs: ["voiceId", "voiceName"],
  },
  speech: {
    stageInputs: ["rewrite", "voice-clone"],
    artifactInputs: ["notes"],
    outputs: ["audioPath"],
  },
  avatar: {
    stageInputs: ["speech"],
    artifactInputs: ["audioPath"],
    outputs: ["avatarVideoPath"],
  },
  compose: {
    stageInputs: ["avatar", "speech"],
    artifactInputs: ["avatarVideoPath", "audioPath"],
    outputs: ["finalVideoPath", "coverPath", "subtitlePath"],
  },
  review: {
    stageInputs: ["compose"],
    artifactInputs: ["finalVideoPath", "coverPath"],
    outputs: [],
  },
  publish: {
    stageInputs: ["compose"],
    artifactInputs: ["finalVideoPath"],
    outputs: ["publishTaskIds"],
  },
};

/**
 * 从 mock 切换到真实能力的推荐顺序。
 *
 * 排序原则：
 * 1. 先替换纯文本阶段（rewrite），风险最低、回滚最容易。
 * 2. 再替换语音/数字人/视频渲染阶段，逐步引入本地 sidecar 与真实 provider。
 * 3. `transcribe` 依赖 FFmpeg + Whisper，放在 speech/voice-clone 之后，避免一开始就要处理本地视频。
 * 4. `review` 无真实能力切换，仅做状态校验。
 * 5. `publish` 见 Task 6，不在本 Task 实现。
 */
export const RECOMMENDED_REALIZATION_ORDER: WorkflowStageId[] = [
  "rewrite",
  "speech",
  "voice-clone",
  "transcribe",
  "avatar",
  "compose",
  "review",
  "publish",
];

export function getStagePrerequisites(stageId: WorkflowStageId): StagePrerequisites {
  return STAGE_PREREQUISITES[stageId];
}

export function getRecommendedRealizationOrder(): WorkflowStageId[] {
  return [...RECOMMENDED_REALIZATION_ORDER];
}

/** 默认所有阶段均使用 mock provider / renderer；真实能力仅作为可配置开关存在。 */
export function createDefaultStageModes(): Record<WorkflowStageId, WorkflowStageRuntimeMode> {
  return Object.fromEntries(WORKFLOW_STAGES.map((id) => [id, "mock"])) as Record<
    WorkflowStageId,
    WorkflowStageRuntimeMode
  >;
}

const STAGE_TEMPLATES: Record<WorkflowStageId, Omit<WorkflowStage, "status">> = {
  transcribe: {
    id: "transcribe",
    title: "对标视频文案提取",
    description: "从对标视频中提取口播文案和结构信息。",
    required: true,
  },
  rewrite: {
    id: "rewrite",
    title: "爆款文案仿写",
    description: "结合产品资料生成可编辑的口播脚本。",
    required: true,
  },
  "voice-clone": {
    id: "voice-clone",
    title: "声音克隆",
    description: "根据用户上传样本生成项目声音配置。",
    required: true,
  },
  speech: {
    id: "speech",
    title: "语音合成",
    description: "将脚本文案合成为音频素材。",
    required: true,
  },
  avatar: {
    id: "avatar",
    title: "数字人口播",
    description: "驱动数字人生成口播视频片段。",
    required: true,
  },
  compose: {
    id: "compose",
    title: "视频合成",
    description: "合成字幕、背景音乐、封面和成片。",
    required: true,
  },
  review: {
    id: "review",
    title: "人工复核",
    description: "发布前检查文案、画面、音频和平台参数。",
    required: false,
  },
  publish: {
    id: "publish",
    title: "多平台发布",
    description: "提交到用户配置的平台账号。",
    required: true,
  },
};

export function createDefaultWorkflow(projectId: string, now = new Date()): Workflow {
  const timestamp = now.toISOString();

  return {
    projectId,
    stages: WORKFLOW_STAGES.map((id) => ({
      ...STAGE_TEMPLATES[id],
      status: "pending",
    })),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function updateStageStatus(
  workflow: Workflow,
  stageId: WorkflowStageId,
  status: WorkflowStageStatus,
  now = new Date(),
): Workflow {
  return {
    ...workflow,
    updatedAt: now.toISOString(),
    stages: workflow.stages.map((stage) => (stage.id === stageId ? { ...stage, status } : stage)),
  };
}

export function getStageProgress(workflow: Workflow): StageProgress {
  const total = workflow.stages.length;
  const completed = workflow.stages.filter((stage) => stage.status === "completed" || stage.status === "skipped").length;

  return {
    completed,
    total,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

export function getNextStage(workflow: Workflow): WorkflowStage | undefined {
  return workflow.stages.find((stage) => stage.status === "pending" || stage.status === "failed");
}
