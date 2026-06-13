import { describe, expect, it } from "vitest";
import {
  WORKFLOW_STAGES,
  createDefaultWorkflow,
  getNextStage,
  getStageProgress,
  updateStageStatus,
} from "../src/index.js";

describe("workflow domain", () => {
  it("creates the default short-video generation workflow in product order", () => {
    const workflow = createDefaultWorkflow("project-1");

    expect(workflow.projectId).toBe("project-1");
    expect(workflow.stages.map((stage) => stage.id)).toEqual(WORKFLOW_STAGES);
    expect(workflow.stages[0]).toMatchObject({
      id: "transcribe",
      title: "对标视频文案提取",
      status: "pending",
    });
    expect(workflow.stages.at(-1)).toMatchObject({
      id: "publish",
      title: "多平台发布",
      status: "pending",
    });
  });

  it("moves a stage forward without mutating the original workflow", () => {
    const workflow = createDefaultWorkflow("project-1");
    const running = updateStageStatus(workflow, "rewrite", "running");
    const completed = updateStageStatus(running, "rewrite", "completed");

    expect(workflow.stages.find((stage) => stage.id === "rewrite")?.status).toBe("pending");
    expect(running.stages.find((stage) => stage.id === "rewrite")?.status).toBe("running");
    expect(completed.stages.find((stage) => stage.id === "rewrite")?.status).toBe("completed");
  });

  it("calculates progress from completed stages and finds the next actionable stage", () => {
    const workflow = createDefaultWorkflow("project-1");
    const withProgress = updateStageStatus(
      updateStageStatus(workflow, "transcribe", "completed"),
      "rewrite",
      "completed",
    );

    expect(getStageProgress(withProgress)).toEqual({ completed: 2, total: 8, percent: 25 });
    expect(getNextStage(withProgress)?.id).toBe("voice-clone");
  });
});
