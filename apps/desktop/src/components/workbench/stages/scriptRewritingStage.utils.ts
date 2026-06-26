import type { WorkflowStageRuntimeMode, WorkflowStageStatus } from "@mirax/core";

/**
 * 判断 rewrite 阶段是否应在 `status` 从 running 变为 completed 时记录版本。
 *
 * 红线：
 * - `not-connected` 模式（真实 provider 已配置但依赖未就绪）完成时不记录版本；
 * - 只有 `mock` 或 `real` 成功完成时才保存会话级版本。
 */
export function shouldRecordVersion(
  prev: WorkflowStageStatus,
  next: WorkflowStageStatus,
  script: string,
  mode?: WorkflowStageRuntimeMode,
): boolean {
  return (
    prev === "running" &&
    next === "completed" &&
    script.trim().length > 0 &&
    (mode === "mock" || mode === "real" || mode === undefined)
  );
}
