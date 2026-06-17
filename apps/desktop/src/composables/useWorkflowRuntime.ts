import { computed, ref } from "vue";
import {
  createDefaultWorkflow,
  getNextStage,
  getStageProgress,
  updateStageStatus,
  type Workflow,
  type WorkflowStage,
  type WorkflowStageId,
  type WorkflowStageStatus,
} from "@mirax/core";

export interface WorkflowLogEntry {
  id: number;
  stage: string;
  message: string;
}

export interface UseWorkflowRuntimeOptions {
  projectId: string;
  executor: (stageId: WorkflowStageId, title: string) => Promise<string>;
}

export function useWorkflowRuntime(options: UseWorkflowRuntimeOptions) {
  const workflow = ref<Workflow>(createDefaultWorkflow(options.projectId));
  const activeStageId = ref<WorkflowStageId>("transcribe");
  const running = ref(false);
  const runningMode = ref<"single" | "all" | null>(null);
  const logs = ref<WorkflowLogEntry[]>([]);

  const progress = computed(() => getStageProgress(workflow.value));
  const nextStage = computed(() => getNextStage(workflow.value));
  const activeStage = computed(() => workflow.value.stages.find((stage) => stage.id === activeStageId.value));
  const stageStatus = computed(
    () => Object.fromEntries(workflow.value.stages.map((stage) => [stage.id, stage.status])) as Record<WorkflowStageId, WorkflowStageStatus>,
  );

  function addLog(stage: string, message: string) {
    logs.value.unshift({ id: Date.now() + logs.value.length, stage, message });
  }

  function resetFailedStage(stageId: WorkflowStageId) {
    if (stageStatus.value[stageId] === "failed") {
      workflow.value = updateStageStatus(workflow.value, stageId, "pending");
    }
  }

  async function processStage(stageId: WorkflowStageId, title: string): Promise<string> {
    resetFailedStage(stageId);
    activeStageId.value = stageId;
    workflow.value = updateStageStatus(workflow.value, stageId, "running");
    addLog(title, "开始执行");

    try {
      const message = await options.executor(stageId, title);
      workflow.value = updateStageStatus(workflow.value, stageId, "completed");
      addLog(title, message);
      return message;
    } catch (error) {
      if (error instanceof Error && error.message === "PUBLISH_CANCELLED") {
        workflow.value = updateStageStatus(workflow.value, stageId, "pending");
        addLog(title, "已取消发布");
        throw error;
      }

      const message = error instanceof Error ? error.message : "执行失败";
      workflow.value = updateStageStatus(workflow.value, stageId, "failed");
      addLog(title, message);
      throw error;
    }
  }

  async function runNextStage() {
    const stage = nextStage.value;
    if (!stage || running.value) {
      return;
    }

    running.value = true;
    runningMode.value = "single";

    try {
      await processStage(stage.id, stage.title);
    } finally {
      running.value = false;
      runningMode.value = null;
    }
  }

  async function runAllStages() {
    if (running.value) {
      return;
    }

    running.value = true;
    runningMode.value = "all";

    try {
      let stage = getNextStage(workflow.value);
      while (stage) {
        try {
          await processStage(stage.id, stage.title);
        } catch {
          break;
        }

        if (stageStatus.value[stage.id] !== "completed") {
          break;
        }

        stage = getNextStage(workflow.value);
      }
    } finally {
      running.value = false;
      runningMode.value = null;
    }
  }

  async function runStage(stageId: WorkflowStageId) {
    if (running.value) {
      return;
    }

    const status = stageStatus.value[stageId];
    if (status === "completed" || status === "running") {
      return;
    }

    const stage = workflow.value.stages.find((s) => s.id === stageId);
    if (!stage) {
      return;
    }

    running.value = true;
    runningMode.value = "single";

    try {
      await processStage(stageId, stage.title);
    } catch {
      // processStage already updates status and logs; swallow here to keep UX on card.
    } finally {
      running.value = false;
      runningMode.value = null;
    }
  }

  function resetWorkflow() {
    workflow.value = createDefaultWorkflow(options.projectId);
    activeStageId.value = "transcribe";
    logs.value = [];
  }

  return {
    workflow,
    activeStageId,
    running,
    runningMode,
    logs,
    progress,
    nextStage,
    activeStage,
    stageStatus,
    runNextStage,
    runAllStages,
    runStage,
    resetWorkflow,
    addLog,
  };
}
