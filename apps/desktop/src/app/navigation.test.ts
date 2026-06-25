import { describe, expect, it } from "vitest";
import {
  createNavigationState,
  navigateTo,
  openSettingsSection,
  returnToWorkbench,
} from "./navigation";

describe("navigation state", () => {
  it("defaults to workbench with general settings section", () => {
    const state = createNavigationState();
    expect(state).toMatchObject({ view: "workbench", settingsSection: "general" });
    expect(state.returnToStage).toBeUndefined();
  });

  it("switches between all 7 top-level views", () => {
    const state = createNavigationState();

    navigateTo(state, "voices");
    expect(state.view).toBe("voices");

    navigateTo(state, "avatars");
    expect(state.view).toBe("avatars");

    navigateTo(state, "materials");
    expect(state.view).toBe("materials");

    navigateTo(state, "tasks");
    expect(state.view).toBe("tasks");

    navigateTo(state, "accounts");
    expect(state.view).toBe("accounts");

    navigateTo(state, "settings");
    expect(state.view).toBe("settings");

    navigateTo(state, "workbench");
    expect(state.view).toBe("workbench");
  });

  it("keeps settings section and workbench return stage", () => {
    const state = createNavigationState();
    navigateTo(state, "voices", "voice-clone");
    expect(state.returnToStage).toBe("voice-clone");

    openSettingsSection(state, "prompt-templates");
    expect(state).toMatchObject({ view: "settings", settingsSection: "prompt-templates" });

    returnToWorkbench(state);
    expect(state.view).toBe("workbench");
  });

  it("preserves the last settings section when reopening settings", () => {
    const state = createNavigationState();
    openSettingsSection(state, "ai-services");
    expect(state.settingsSection).toBe("ai-services");

    navigateTo(state, "workbench");
    openSettingsSection(state);
    expect(state.settingsSection).toBe("ai-services");
  });
});
