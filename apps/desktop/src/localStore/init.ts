import { type LocalStoreDb, migrateLocalStore } from "@mirax/local-store";
import {
  setInitialAppSettingsSnapshot,
  setLocalStoreDb as setAppSettingsLocalStoreDb,
} from "../composables/useAppSettings.js";
import { TauriLocalStoreDb } from "./adapter.js";
import { loadAppSettingsSnapshotFromDb } from "./loadSnapshot.js";

export async function initLocalStore(): Promise<LocalStoreDb | undefined> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    return undefined;
  }

  try {
    const db = await TauriLocalStoreDb.load("sqlite:mirax.db");
    await migrateLocalStore(db);

    const snapshot = await loadAppSettingsSnapshotFromDb(db);
    const hasAnyData =
      snapshot.appSettings || snapshot.sidecarConfig || (snapshot.providerConfigs?.length ?? 0) > 0;

    if (hasAnyData) {
      setInitialAppSettingsSnapshot(snapshot);
    }

    setAppSettingsLocalStoreDb(db);
    return db;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("SQLite 初始化失败，回退到 localStorage", error);
    return undefined;
  }
}
