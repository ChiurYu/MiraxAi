import { computed, ref } from "vue";
import {
  createDefaultStageModes,
  createDefaultWorkflow,
  getNextStage,
  getStageProgress,
  updateStageStatus,
  WORKFLOW_STAGES,
  type Workflow,
  type WorkflowStage,
  type WorkflowStageId,
  type WorkflowStageRuntimeMode,
  type WorkflowStageStatus,
} from "@mirax/core";

export interface WorkflowLogEntry {
  id: number;
  stage: string;
  message: string;
}

export interface UseWorkflowRuntimeOptions {
  projectId: string;
  /**
   * 阶段执行器。
   *
   * 产物传递边界：
   * - 执行器负责把当前阶段的产物路径写入 `ProjectDraft` 或返回给调用方；
   * - 执行器内部应校验前置产物是否 `ready`，缺失时抛出诚实错误；
   * - 错误会被 `processStage` 捕获并标记阶段为 `failed`，message 进入日志。
   *
   * 当前 Task 不改动 mock executor 行为，真实能力接入时通过 stageId 路由到
   * 真实 provider / media renderer，并在失败时回传 `MediaRendererError`。
   */
  executor: (stageId: WorkflowStageId, title: string) => Promise<string>;
  /**
   * 每个阶段的运行时能力模式。
   *
   * - 未提供的阶段默认 `mock`。
   * - 设置为 `real` 时，executor 应路由到真实 provider / sidecar；若真实能力
   *   尚未接入，必须返回诚实错误，不得自动 fallback 到 mock 伪造成功。
   * - `not-connected` 用于真实 provider 已配置但依赖未就绪（sidecar 缺失、连接
   *   测试失败）的场景，UI 应明确提示“真实能力未接入”。
   */
  stageModes?: Partial<Record<WorkflowStageId, WorkflowStageRuntimeMode>>;
}

export function useWorkflowRuntime(options: UseWorkflowRuntimeOptions) {
  const workflow = ref<Workflow>(createDefaultWorkflow(options.projectId));
  const activeStageId = ref<WorkflowStageId>("transcribe");
  const running = ref(false);
  const runningMode = ref<"single" | "all" | null>(null);
  const logs = ref<WorkflowLogEntry[]>([]);
  const stageModes = ref<Record<WorkflowStageId, WorkflowStageRuntimeMode>>({
    ...createDefaultStageModes(),
    ...options.stageModes,
  });

  function getStageMode(stageId: WorkflowStageId): WorkflowStageRuntimeMode {
    return stageModes.value[stageId] ?? "mock";
  }

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

  function stageIndex(stageId: WorkflowStageId): number {
    return WORKFLOW_STAGES.indexOf(stageId);
  }

  function areDependenciesCompleted(stageId: WorkflowStageId): boolean {
    const targetIndex = stageIndex(stageId);
    const previousRequired = workflow.value.stages.filter((s) => {
      const index = stageIndex(s.id);
      return index < targetIndex && s.required && s.id !== "review";
    });
    return previousRequired.every((s) => s.status === "completed" || s.status === "skipped");
  }

  function canGoToStage(stageId: WorkflowStageId): boolean {
    if (running.value) return false;
    const target = workflow.value.stages.find((s) => s.id === stageId);
    if (!target) return false;
    if (stageId === activeStageId.value) return true;
    if (target.status === "completed" || target.status === "skipped") return true;
    return areDependenciesCompleted(stageId);
  }

  function goToStage(stageId: WorkflowStageId) {
    if (!canGoToStage(stageId)) return;
    activeStageId.value = stageId;
  }

  function goToNextStage() {
    const currentIndex = stageIndex(activeStageId.value);
    const nextId = WORKFLOW_STAGES[currentIndex + 1];
    if (nextId) {
      goToStage(nextId);
    }
  }

  function goToPreviousStage() {
    const currentIndex = stageIndex(activeStageId.value);
    const prevId = WORKFLOW_STAGES[currentIndex - 1];
    if (prevId) {
      goToStage(prevId);
    }
  }

  function markStageDirty(stageId: WorkflowStageId) {
    const targetIndex = stageIndex(stageId);
    let nextWorkflow = workflow.value;
    for (let i = targetIndex; i < WORKFLOW_STAGES.length; i++) {
      const id = WORKFLOW_STAGES[i];
      const stage = nextWorkflow.stages.find((s) => s.id === id);
      if (stage && (stage.status === "completed" || stage.status === "skipped" || stage.status === "failed")) {
        nextWorkflow = updateStageStatus(nextWorkflow, id, "pending");
      }
    }
    workflow.value = nextWorkflow;
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
      // 错误处理边界：真实能力接入后，这里可能收到 MediaRendererError 等结构化错误。
      // 目前只提取 message 写入日志，并保持阶段输入可见以便用户重试。
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
    } catch (error) {
      if (error instanceof Error && error.message === "PUBLISH_CANCELLED") {
        throw error;
      }
      // 普通失败已由 processStage 标记为 failed 并写入日志，不再向外抛。
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
    } catch (error) {
      if (error instanceof Error && error.message === "PUBLISH_CANCELLED") {
        throw error;
      }
      // processStage 已更新状态与日志；普通错误在此处吞掉，保持卡片级 UX。
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
    stageModes,
    progress,
    nextStage,
    activeStage,
    stageStatus,
    getStageMode,
    runNextStage,
    runAllStages,
    runStage,
    resetWorkflow,
    addLog,
    canGoToStage,
    goToStage,
    goToNextStage,
    goToPreviousStage,
    markStageDirty,
  };
}
