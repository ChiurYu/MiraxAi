import { ref, type Ref } from "vue";
import { createDefaultAppSettings } from "@mirax/core";
import {
  createAppSettingsRepository,
  createVoiceSampleStorageRootRepository,
  type LocalStoreDb,
  type VoiceSampleStorageRootRecord,
} from "@mirax/local-store";

export interface UseVoiceSampleStorageOptions {
  db?: LocalStoreDb;
}

export interface VoiceSampleStorageError {
  code: "local-store-unavailable" | "no-active-root" | "root-in-use";
  message: string;
}

export interface VoiceSampleStorage {
  roots: Ref<VoiceSampleStorageRootRecord[]>;
  activeRoot: Ref<VoiceSampleStorageRootRecord | undefined>;
  selectRoot(path: string): Promise<void>;
  requireActiveWritableRoot(): Promise<VoiceSampleStorageRootRecord>;
  removeRoot(id: string): Promise<void>;
}

function createError(code: VoiceSampleStorageError["code"], message: string): VoiceSampleStorageError {
  return { code, message };
}

export function useVoiceSampleStorage(options: UseVoiceSampleStorageOptions): VoiceSampleStorage {
  const db = options.db;
  const roots = ref<VoiceSampleStorageRootRecord[]>([]);
  const activeRoot = ref<VoiceSampleStorageRootRecord | undefined>(undefined);

  function assertDb(): LocalStoreDb {
    if (!db) {
      throw createError("local-store-unavailable", "本地 SQLite 不可用");
    }
    return db;
  }

  async function loadRoots(): Promise<void> {
    const localDb = assertDb();
    const repo = createVoiceSampleStorageRootRepository(localDb);
    roots.value = await repo.list();
  }

  async function loadActiveRoot(): Promise<void> {
    const localDb = assertDb();
    const settingsRepo = createAppSettingsRepository(localDb);
    const rootRepo = createVoiceSampleStorageRootRepository(localDb);

    const [settings, allRoots] = await Promise.all([settingsRepo.getById("default"), rootRepo.list()]);
    roots.value = allRoots;

    if (settings?.activeVoiceSampleStorageRootId) {
      activeRoot.value = allRoots.find((root) => root.id === settings.activeVoiceSampleStorageRootId);
    }
  }

  async function selectRoot(path: string): Promise<void> {
    const localDb = assertDb();
    const rootRepo = createVoiceSampleStorageRootRepository(localDb);
    const settingsRepo = createAppSettingsRepository(localDb);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const record: VoiceSampleStorageRootRecord = { id, path, createdAt: now };

    await rootRepo.save(record);

    const existingSettings = await settingsRepo.getById("default");
    const defaultPaths = createDefaultAppSettings().outputPaths;
    await settingsRepo.save({
      id: "default",
      theme: existingSettings?.theme ?? "system",
      outputPathsJson: existingSettings?.outputPathsJson ?? JSON.stringify(defaultPaths),
      rewriteProviderConfigId: existingSettings?.rewriteProviderConfigId,
      activeVoiceSampleStorageRootId: id,
      createdAt: existingSettings?.createdAt ?? now,
      updatedAt: now,
    });

    if (!roots.value.some((root) => root.id === id)) {
      roots.value.push(record);
    }
    activeRoot.value = record;
  }

  async function requireActiveWritableRoot(): Promise<VoiceSampleStorageRootRecord> {
    assertDb();
    if (!activeRoot.value) {
      await loadActiveRoot();
    }
    if (activeRoot.value) {
      return activeRoot.value;
    }
    throw createError("no-active-root", "未选择声音样本存储目录");
  }

  async function removeRoot(id: string): Promise<void> {
    const localDb = assertDb();
    const settingsRepo = createAppSettingsRepository(localDb);

    const referenced = await localDb.select<{ id: string }>(
      "SELECT id FROM voice_samples WHERE storage_root_id = ?",
      [id],
    );
    if (referenced.length > 0) {
      throw createError("root-in-use", "该目录仍被已托管的声音样本引用");
    }

    await localDb.execute("DELETE FROM voice_sample_storage_roots WHERE id = ?", [id]);

    if (activeRoot.value?.id === id) {
      activeRoot.value = undefined;
      const existingSettings = await settingsRepo.getById("default");
      if (existingSettings) {
        await settingsRepo.save({
          ...existingSettings,
          activeVoiceSampleStorageRootId: undefined,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    roots.value = roots.value.filter((root) => root.id !== id);
    await loadRoots();
  }

  if (db) {
    void loadActiveRoot().catch(() => undefined);
  }

  return {
    roots,
    activeRoot,
    selectRoot,
    requireActiveWritableRoot,
    removeRoot,
  };
}
