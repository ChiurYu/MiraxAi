import { reactive, ref, watch } from "vue";
import {
  DESKTOP_DRAFT_STORAGE_KEY,
  createDefaultDesktopDraft,
  restoreDesktopDraft,
  sanitizeDesktopDraftForStorage,
  type DesktopDraft,
} from "../runtime/desktopDraft.js";

export interface UseWorkbenchDraftOptions {
  storage?: Storage;
}

export function useWorkbenchDraft(options: UseWorkbenchDraftOptions = {}) {
  const storage = options.storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
  const draft = reactive<DesktopDraft>(createDefaultDesktopDraft());
  const saveStatus = ref("未保存");

  function restore() {
    if (!storage) {
      saveStatus.value = "无可用存储";
      return;
    }

    try {
      const raw = storage.getItem(DESKTOP_DRAFT_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const saved = JSON.parse(raw) as Partial<DesktopDraft>;
      const restored = restoreDesktopDraft(saved);
      Object.assign(draft.project, restored.project);
      Object.assign(draft.providerConfig, restored.providerConfig);
      saveStatus.value = "已恢复草稿";
    } catch {
      saveStatus.value = "草稿读取失败";
    }
  }

  function persist() {
    if (!storage) {
      saveStatus.value = "无可用存储";
      return;
    }

    try {
      const payload = sanitizeDesktopDraftForStorage(draft);
      storage.setItem(DESKTOP_DRAFT_STORAGE_KEY, JSON.stringify(payload));
      saveStatus.value = "草稿已保存";
    } catch {
      saveStatus.value = "草稿保存失败";
    }
  }

  watch(
    [() => draft.project, () => draft.providerConfig],
    () => {
      persist();
    },
    { deep: true },
  );

  restore();

  return {
    draft,
    saveStatus,
    restore,
    persist,
  };
}
