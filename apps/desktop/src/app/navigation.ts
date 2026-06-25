import type { WorkflowStageId } from "@mirax/core";

export type AppView =
  | "workbench"
  | "voices"
  | "avatars"
  | "materials"
  | "tasks"
  | "accounts"
  | "settings";

export type SettingsSection =
  | "general"
  | "ai-services"
  | "local-dependencies"
  | "output-storage"
  | "prompt-templates"
  | "data"
  | "updates-support";

export interface NavigationState {
  view: AppView;
  settingsSection: SettingsSection;
  returnToStage?: WorkflowStageId;
}

export function createNavigationState(): NavigationState {
  return {
    view: "workbench",
    settingsSection: "general",
  };
}

export function navigateTo(
  state: NavigationState,
  view: AppView,
  returnToStage?: WorkflowStageId,
): void {
  state.view = view;
  if (returnToStage !== undefined) {
    state.returnToStage = returnToStage;
  }
}

export function openSettingsSection(
  state: NavigationState,
  section?: SettingsSection,
): void {
  state.view = "settings";
  if (section !== undefined) {
    state.settingsSection = section;
  }
}

export function returnToWorkbench(state: NavigationState): void {
  state.view = "workbench";
  state.returnToStage = undefined;
}
