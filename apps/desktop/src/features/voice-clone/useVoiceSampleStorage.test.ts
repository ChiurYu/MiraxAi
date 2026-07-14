import { describe, expect, it } from "vitest";
import { FakeLocalStoreDb, createVoiceSampleRepository } from "@mirax/local-store";
import { useVoiceSampleStorage } from "./useVoiceSampleStorage.js";

function createFakeDb(): FakeLocalStoreDb {
  return new FakeLocalStoreDb();
}

describe("useVoiceSampleStorage", () => {
  it("returns local-store-unavailable when selecting a root without db", async () => {
    const storage = useVoiceSampleStorage({ db: undefined });

    await expect(storage.selectRoot("/tmp/samples")).rejects.toMatchObject({
      code: "local-store-unavailable",
    });
  });

  it("returns local-store-unavailable when requiring an active root without db", async () => {
    const storage = useVoiceSampleStorage({ db: undefined });

    await expect(storage.requireActiveWritableRoot()).rejects.toMatchObject({
      code: "local-store-unavailable",
    });
  });

  it("returns local-store-unavailable when removing a root without db", async () => {
    const storage = useVoiceSampleStorage({ db: undefined });

    await expect(storage.removeRoot("root-1")).rejects.toMatchObject({
      code: "local-store-unavailable",
    });
  });

  it("selectRoot persists a new root and sets it as active in SQLite", async () => {
    const db = createFakeDb();
    const storage = useVoiceSampleStorage({ db });

    await storage.selectRoot("/tmp/mirax-samples");

    const rootInsert = db.calls.find((c) => c.sql.includes("INSERT OR REPLACE INTO voice_sample_storage_roots"));
    expect(rootInsert).toBeTruthy();
    expect(rootInsert?.bind).toContain("/tmp/mirax-samples");

    const settingsUpdate = db.calls.find((c) =>
      c.sql.includes("INSERT OR REPLACE INTO app_settings") && c.sql.includes("active_voice_sample_storage_root_id"),
    );
    expect(settingsUpdate).toBeTruthy();
    expect(settingsUpdate?.bind?.some((b) => typeof b === "string" && /^[0-9a-f-]{36}$/i.test(b))).toBe(true);

    expect(storage.activeRoot.value?.path).toBe("/tmp/mirax-samples");
    expect(storage.roots.value).toHaveLength(1);
  });

  it("requireActiveWritableRoot returns the active root", async () => {
    const db = createFakeDb();
    const storage = useVoiceSampleStorage({ db });

    await storage.selectRoot("/tmp/mirax-samples");

    const active = await storage.requireActiveWritableRoot();
    expect(active.path).toBe("/tmp/mirax-samples");
  });

  it("loads the persisted active root before checking writability", async () => {
    const db = createFakeDb();
    db.whenSelect(
      "SELECT id, theme, output_paths_json as outputPathsJson, rewrite_provider_config_id as rewriteProviderConfigId, active_voice_sample_storage_root_id as activeVoiceSampleStorageRootId, created_at as createdAt, updated_at as updatedAt FROM app_settings WHERE id = ?",
      [{
        id: "default",
        theme: "system",
        outputPathsJson: "{}",
        activeVoiceSampleStorageRootId: "root-1",
        createdAt: "2026-07-13T00:00:00.000Z",
        updatedAt: "2026-07-13T00:00:00.000Z",
      }],
    );
    db.whenSelect(
      "SELECT id, path, created_at as createdAt FROM voice_sample_storage_roots",
      [{ id: "root-1", path: "/tmp/mirax-samples", createdAt: "2026-07-13T00:00:00.000Z" }],
    );

    const storage = useVoiceSampleStorage({ db });

    await expect(storage.requireActiveWritableRoot()).resolves.toMatchObject({
      id: "root-1",
      path: "/tmp/mirax-samples",
    });
  });

  it("requireActiveWritableRoot rejects when no active root is selected", async () => {
    const db = createFakeDb();
    const storage = useVoiceSampleStorage({ db });

    await expect(storage.requireActiveWritableRoot()).rejects.toMatchObject({
      code: "no-active-root",
    });
  });

  it("removeRoot rejects when the root is referenced by voice_samples", async () => {
    const db = createFakeDb();
    db.whenSelect("SELECT id FROM voice_samples WHERE storage_root_id = ?", [
      { id: "sample-1" },
    ]);
    const storage = useVoiceSampleStorage({ db });

    await expect(storage.removeRoot("root-1")).rejects.toMatchObject({
      code: "root-in-use",
    });
  });

  it("removeRoot deletes the root when it is not referenced", async () => {
    const db = createFakeDb();
    db.whenSelect("SELECT id FROM voice_samples WHERE storage_root_id = ?", []);
    const storage = useVoiceSampleStorage({ db });

    await storage.removeRoot("root-1");

    const deleteCall = db.calls.find((c) => c.sql.includes("DELETE FROM voice_sample_storage_roots"));
    expect(deleteCall?.bind).toEqual(["root-1"]);
  });

  it("does not leak real sample paths, api keys or provider_secrets in errors", async () => {
    const storage = useVoiceSampleStorage({ db: undefined });

    await expect(storage.selectRoot("/tmp/real-voice-sample.wav")).rejects.toMatchObject({
      code: "local-store-unavailable",
    });
  });
});
