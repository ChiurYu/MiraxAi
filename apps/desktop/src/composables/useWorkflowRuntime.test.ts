import { describe, expect, it, vi } from "vitest";
import { useWorkflowRuntime } from "./useWorkflowRuntime.js";

describe("useWorkflowRuntime", () => {
  it("initializes with all pending stages", () => {
    const runtime = useWorkflowRuntime({ projectId: "demo", executor: vi.fn() });

    expect(runtime.workflow.value.projectId).toBe("demo");
    expect(runtime.workflow.value.stages).toHaveLength(8);
    expect(runtime.workflow.value.stages.every((stage) => stage.status === "pending")).toBe(true);
    expect(runtime.progress.value.percent).toBe(0);
  });

  it("runNextStage executes the first pending stage and marks it completed", async () => {
    const executor = vi.fn().mockResolvedValue("extracted 3 segments");
    const runtime = useWorkflowRuntime({ projectId: "demo", executor });

    await runtime.runNextStage();

    expect(executor).toHaveBeenCalledWith("transcribe", "对标视频文案提取");
    expect(runtime.workflow.value.stages[0].status).toBe("completed");
    expect(runtime.progress.value.completed).toBe(1);
    expect(runtime.logs.value[0].message).toBe("extracted 3 segments");
  });

  it("marks stage failed and stops runAllStages on executor error", async () => {
    const executor = vi.fn().mockRejectedValue(new Error("network error"));
    const runtime = useWorkflowRuntime({ projectId: "demo", executor });

    await runtime.runAllStages();

    expect(runtime.workflow.value.stages[0].status).toBe("failed");
    expect(runtime.workflow.value.stages[1].status).toBe("pending");
    expect(runtime.logs.value[0].message).toContain("network error");
  });

  it("allows retrying a failed stage", async () => {
    const executor = vi.fn().mockRejectedValueOnce(new Error("fail")).mockResolvedValueOnce("ok");
    const runtime = useWorkflowRuntime({ projectId: "demo", executor });

    await runtime.runNextStage();
    expect(runtime.workflow.value.stages[0].status).toBe("failed");

    await runtime.runStage("transcribe");
    expect(runtime.workflow.value.stages[0].status).toBe("completed");
    expect(executor).toHaveBeenCalledTimes(2);
  });

  it("does not run a stage that is already running or completed", async () => {
    const executor = vi.fn().mockResolvedValue("ok");
    const runtime = useWorkflowRuntime({ projectId: "demo", executor });

    await runtime.runStage("transcribe");
    await runtime.runStage("transcribe");

    expect(executor).toHaveBeenCalledTimes(1);
  });

  it("resetWorkflow clears status and logs", async () => {
    const executor = vi.fn().mockResolvedValue("ok");
    const runtime = useWorkflowRuntime({ projectId: "demo", executor });

    await runtime.runNextStage();
    runtime.resetWorkflow();

    expect(runtime.workflow.value.stages.every((stage) => stage.status === "pending")).toBe(true);
    expect(runtime.logs.value).toHaveLength(0);
    expect(runtime.activeStageId.value).toBe("transcribe");
  });

  it("propagates PUBLISH_CANCELLED by resetting stage to pending", async () => {
    const executor = vi.fn().mockRejectedValue(new Error("PUBLISH_CANCELLED"));
    const runtime = useWorkflowRuntime({ projectId: "demo", executor });

    await expect(runtime.runStage("publish")).rejects.toThrow("PUBLISH_CANCELLED");
    expect(runtime.workflow.value.stages.find((s) => s.id === "publish")?.status).toBe("pending");
  });
});
