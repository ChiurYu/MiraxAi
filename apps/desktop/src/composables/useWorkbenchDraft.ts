import { reactive, ref, watch } from "vue";
import { createWorkbenchDraftRepository, type LocalStoreDb } from "@mirax/local-store";
import {
  DESKTOP_DRAFT_STORAGE_KEY,
  createDefaultDesktopDraft,
  restoreDesktopDraft,
  sanitizeDesktopDraftForStorage,
  type DesktopDraft,
} from "../runtime/desktopDraft.js";

export interface UseWorkbenchDraftOptions {
  storage?: Storage;
  db?: LocalStoreDb;
  persistDelayMs?: number;
}

const WORKBENCH_DRAFT_ID = "default";

let sharedDb: LocalStoreDb | undefined;

export function setWorkbenchDraftDb(db: LocalStoreDb | undefined): void {
  sharedDb = db;
}

export function getWorkbenchDraftDb(): LocalStoreDb | undefined {
  return sharedDb;
}

export function useWorkbenchDraft(options: UseWorkbenchDraftOptions = {}) {
  const storage = options.storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
  const db = options.db ?? sharedDb;
  const persistDelayMs = options.persistDelayMs ?? 180;
  const draft = reactive<DesktopDraft>(createDefaultDesktopDraft());
  const saveStatus = ref("未保存");
  let pendingPersist: ReturnType<typeof setTimeout> | undefined;

  let suppressSaveStatus = false;
  let pendingPersistPromise: Promise<void> | undefined;

  async function restoreFromDb(): Promise<boolean> {
    if (!db) return false;
    try {
      const repo = createWorkbenchDraftRepository(db);
      const record = await repo.getById(WORKBENCH_DRAFT_ID);
      if (!record) return false;

      const saved = JSON.parse(record.payloadJson) as Partial<DesktopDraft>;
      const restored = restoreDesktopDraft(saved);
      Object.assign(draft.project, restored.project);
      Object.assign(draft.providerConfig, restored.providerConfig);
      draft.activeStageId = restored.activeStageId;
      draft.workflow = restored.workflow;
      draft.transcriptText = restored.transcriptText;
      draft.activeGoal = restored.activeGoal;
      draft.activePreset = restored.activePreset;
      draft.targetLength = restored.targetLength;
      draft.speechArtifact = restored.speechArtifact;
      saveStatus.value = "已恢复草稿";

      if (!saved.project?.id) {
        await persistToDb();
      }

      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("SQLite 草稿恢复失败，尝试 localStorage", error);
      return false;
    }
  }

  async function restoreFromStorage(): Promise<boolean> {
    if (!storage) return false;
    try {
      const raw = storage.getItem(DESKTOP_DRAFT_STORAGE_KEY);
      if (!raw) return false;

      const saved = JSON.parse(raw) as Partial<DesktopDraft>;
      const restored = restoreDesktopDraft(saved);
      Object.assign(draft.project, restored.project);
      Object.assign(draft.providerConfig, restored.providerConfig);
      draft.activeStageId = restored.activeStageId;
      draft.workflow = restored.workflow;
      draft.transcriptText = restored.transcriptText;
      draft.activeGoal = restored.activeGoal;
      draft.activePreset = restored.activePreset;
      draft.targetLength = restored.targetLength;
      draft.speechArtifact = restored.speechArtifact;
      saveStatus.value = "已恢复草稿";

      if (db && !saved.project?.id) {
        await persistToDb();
      }

      return true;
    } catch {
      saveStatus.value = "草稿读取失败";
      return false;
    }
  }

  async function restore() {
    suppressSaveStatus = true;
    try {
      const restoredFromDb = await restoreFromDb();
      if (restoredFromDb) return;

      const restoredFromStorage = await restoreFromStorage();
      if (!restoredFromStorage && !storage) {
        saveStatus.value = "无可用存储";
      }
    } finally {
      if (pendingPersistPromise) {
        await pendingPersistPromise;
      }
      suppressSaveStatus = false;
    }
  }

  async function persistToDb(): Promise<boolean> {
    if (!db) return false;
    try {
      const repo = createWorkbenchDraftRepository(db);
      const payload = sanitizeDesktopDraftForStorage(draft);
      await repo.save({
        id: WORKBENCH_DRAFT_ID,
        payloadJson: JSON.stringify(payload),
        updatedAt: new Date().toISOString(),
      });
      if (!suppressSaveStatus) {
        saveStatus.value = "草稿已保存";
      }
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("SQLite 草稿保存失败，回退 localStorage", error);
      return false;
    }
  }

  function persistToStorage(): boolean {
    if (!storage) {
      saveStatus.value = "无可用存储";
      return false;
    }
    try {
      const payload = sanitizeDesktopDraftForStorage(draft);
      storage.setItem(DESKTOP_DRAFT_STORAGE_KEY, JSON.stringify(payload));
      if (!suppressSaveStatus) {
        saveStatus.value = "草稿已保存";
      }
      return true;
    } catch {
      saveStatus.value = "草稿保存失败";
      return false;
    }
  }

  async function persist() {
    pendingPersistPromise = (async () => {
      if (pendingPersist !== undefined) {
        clearTimeout(pendingPersist);
        pendingPersist = undefined;
      }
      const persistedToDb = await persistToDb();
      if (persistedToDb) return;
      persistToStorage();
    })();
    await pendingPersistPromise;
    pendingPersistPromise = undefined;
  }

  function schedulePersist() {
    if (persistDelayMs <= 0) {
      void persist();
      return;
    }
    if (pendingPersist !== undefined) {
      clearTimeout(pendingPersist);
    }
    pendingPersist = setTimeout(() => {
      pendingPersist = undefined;
      void persist();
    }, persistDelayMs);
  }

  watch(
    [() => draft.project, () => draft.providerConfig, () => draft.activeStageId, () => draft.workflow, () => draft.transcriptText, () => draft.activeGoal, () => draft.activePreset, () => draft.targetLength, () => draft.speechArtifact],
    () => {
      schedulePersist();
    },
    { deep: true },
  );

  const ready = restore();

  return {
    draft,
    saveStatus,
    restore,
    persist,
    ready,
  };
}
