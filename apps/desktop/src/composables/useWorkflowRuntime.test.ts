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

  it("allows reviewing completed stages", async () => {
    const executor = vi.fn().mockResolvedValue("ok");
    const runtime = useWorkflowRuntime({ projectId: "demo", executor });

    await runtime.runStage("transcribe");
    runtime.goToStage("rewrite");
    await runtime.runStage("rewrite");

    runtime.goToStage("transcribe");
    expect(runtime.activeStageId.value).toBe("transcribe");
  });

  it("prevents skipping dependencies when navigating to pending stages", () => {
    const runtime = useWorkflowRuntime({ projectId: "demo", executor: vi.fn() });

    expect(runtime.canGoToStage("rewrite")).toBe(false);
    runtime.goToStage("rewrite");
    expect(runtime.activeStageId.value).toBe("transcribe");
  });

  it("supports previous/next navigation", async () => {
    const executor = vi.fn().mockResolvedValue("ok");
    const runtime = useWorkflowRuntime({ projectId: "demo", executor });

    await runtime.runStage("transcribe");
    runtime.goToNextStage();
    expect(runtime.activeStageId.value).toBe("rewrite");

    await runtime.runStage("rewrite");
    runtime.goToNextStage();
    expect(runtime.activeStageId.value).toBe("voice-clone");

    runtime.goToPreviousStage();
    expect(runtime.activeStageId.value).toBe("rewrite");
  });

  it("disables stage switching while running", async () => {
    let resolveExecutor: (value: string) => void;
    const executor = vi.fn().mockImplementation(() => new Promise<string>((resolve) => { resolveExecutor = resolve; }));
    const runtime = useWorkflowRuntime({ projectId: "demo", executor });

    const runPromise = runtime.runStage("transcribe");
    expect(runtime.running.value).toBe(true);

    runtime.goToStage("rewrite");
    expect(runtime.activeStageId.value).toBe("transcribe");

    resolveExecutor!("ok");
    await runPromise;
  });

  it("warns that downstream outputs need regeneration when an earlier stage changes", async () => {
    const executor = vi.fn().mockResolvedValue("ok");
    const runtime = useWorkflowRuntime({ projectId: "demo", executor });

    await runtime.runStage("transcribe");
    runtime.goToNextStage();
    await runtime.runStage("rewrite");
    runtime.goToNextStage();
    await runtime.runStage("voice-clone");

    runtime.markStageDirty("transcribe");

    expect(runtime.workflow.value.stages.find((s) => s.id === "transcribe")?.status).toBe("pending");
    expect(runtime.workflow.value.stages.find((s) => s.id === "rewrite")?.status).toBe("pending");
    expect(runtime.workflow.value.stages.find((s) => s.id === "voice-clone")?.status).toBe("pending");
    expect(runtime.workflow.value.stages.find((s) => s.id === "speech")?.status).toBe("pending");
    expect(runtime.workflow.value.stages.find((s) => s.id === "avatar")?.status).toBe("pending");
  });
});
