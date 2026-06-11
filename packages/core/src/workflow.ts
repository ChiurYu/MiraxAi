import type { StageProgress, Workflow, WorkflowStage, WorkflowStageId, WorkflowStageStatus } from "./types.js";

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
