import { describe, expect, it } from "vitest";
import {
  FakeLocalStoreDb,
  createAppSettingsRepository,
  createProviderConfigRepository,
  createProviderSecretsRepository,
  createSidecarConfigRepository,
  createWorkbenchDraftRepository,
  createTaskHistoryRepository,
} from "../src/index.js";

describe("createAppSettingsRepository", () => {
  it("saves settings with correct SQL and bind parameters", async () => {
    const db = new FakeLocalStoreDb();
    const repo = createAppSettingsRepository(db);

    await repo.save({
      id: "default",
      theme: "dark",
      outputPathsJson: JSON.stringify({ baseOutput: "/tmp/mirax" }),
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const call = db.calls[0];
    expect(call.sql).toContain("INSERT OR REPLACE INTO app_settings");
    expect(call.bind).toContain("dark");
    expect(call.bind).toContain('{"baseOutput":"/tmp/mirax"}');
  });

  it("maps select rows to camelCase records", async () => {
    const db = new FakeLocalStoreDb();
    db.whenSelect(
      `SELECT id, theme, output_paths_json as outputPathsJson, created_at as createdAt, updated_at as updatedAt FROM app_settings WHERE id = ?`,
      [
        {
          id: "default",
          theme: "light",
          outputPathsJson: "{}",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    );
    const repo = createAppSettingsRepository(db);
    const record = await repo.getById("default");

    expect(record?.theme).toBe("light");
    expect(record?.outputPathsJson).toBe("{}");
  });
});

describe("createSidecarConfigRepository", () => {
  it("saves sidecar config with correct boolean mapping", async () => {
    const db = new FakeLocalStoreDb();
    const repo = createSidecarConfigRepository(db);

    await repo.save({
      id: "default",
      ffmpegPath: "/opt/ffmpeg",
      hasPlaywrightBrowser: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const call = db.calls[0];
    expect(call.sql).toContain("INSERT OR REPLACE INTO sidecar_configs");
    expect(call.bind).toContain(1);
    expect(call.bind).toContain("/opt/ffmpeg");
  });
});

describe("createProviderConfigRepository", () => {
  it("saves provider metadata without apiKey", async () => {
    const db = new FakeLocalStoreDb();
    const repo = createProviderConfigRepository(db);

    await repo.save({
      id: "p1",
      provider: "openai",
      label: "主模型",
      baseUrl: "https://api.example.com",
      model: "gpt-4",
      enabled: true,
      credentialRef: "p1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const call = db.calls[0];
    expect(call.sql).toContain("INSERT OR REPLACE INTO provider_configs");
    expect(call.sql).not.toContain("api_key");
    expect(call.bind).not.toContain("sk-secret");
    expect(call.bind).toContain("p1");
    expect(call.bind).toContain(1);
  });

  it("defaults credentialRef to id", async () => {
    const db = new FakeLocalStoreDb();
    const repo = createProviderConfigRepository(db);

    await repo.save({
      id: "p2",
      provider: "custom",
      label: "自定义",
      enabled: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const call = db.calls[0];
    expect(call.bind).toContain("p2");
  });

  it("deletes provider metadata by id", async () => {
    const db = new FakeLocalStoreDb();
    const repo = createProviderConfigRepository(db);

    await repo.deleteById("p1");

    const call = db.calls[0];
    expect(call.sql).toContain("DELETE FROM provider_configs");
    expect(call.bind).toEqual(["p1"]);
  });
});

describe("createProviderSecretsRepository", () => {
  it("saves secret with api_key", async () => {
    const db = new FakeLocalStoreDb();
    const repo = createProviderSecretsRepository(db);

    await repo.save({
      credentialRef: "p1",
      apiKey: "sk-secret",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const call = db.calls[0];
    expect(call.sql).toContain("INSERT OR REPLACE INTO provider_secrets");
    expect(call.bind).toContain("sk-secret");
  });

  it("deletes secret by credential_ref", async () => {
    const db = new FakeLocalStoreDb();
    const repo = createProviderSecretsRepository(db);

    await repo.deleteByCredentialRef("p1");

    const call = db.calls[0];
    expect(call.sql).toContain("DELETE FROM provider_secrets");
    expect(call.bind).toEqual(["p1"]);
  });

  it("maps select rows to camelCase records", async () => {
    const db = new FakeLocalStoreDb();
    db.whenSelect(
      `SELECT credential_ref as credentialRef, api_key as apiKey, created_at as createdAt, updated_at as updatedAt FROM provider_secrets WHERE credential_ref = ? LIMIT 1`,
      [
        {
          credentialRef: "p1",
          apiKey: "sk-secret",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    );
    const repo = createProviderSecretsRepository(db);
    const record = await repo.getByCredentialRef("p1");

    expect(record?.apiKey).toBe("sk-secret");
  });
});

describe("createWorkbenchDraftRepository", () => {
  it("saves draft payload with correct SQL and bind parameters", async () => {
    const db = new FakeLocalStoreDb();
    const repo = createWorkbenchDraftRepository(db);

    await repo.save({
      id: "default",
      payloadJson: JSON.stringify({ project: { name: "测试" } }),
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const call = db.calls[0];
    expect(call.sql).toContain("INSERT OR REPLACE INTO workbench_drafts");
    expect(call.bind).toContain("default");
    expect(call.bind).toContain(JSON.stringify({ project: { name: "测试" } }));
  });

  it("maps select rows to camelCase record", async () => {
    const db = new FakeLocalStoreDb();
    db.whenSelect(
      `SELECT id, payload_json as payloadJson, updated_at as updatedAt FROM workbench_drafts WHERE id = ?`,
      [
        {
          id: "default",
          payloadJson: "{}",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    );
    const repo = createWorkbenchDraftRepository(db);
    const record = await repo.getById("default");

    expect(record?.id).toBe("default");
    expect(record?.payloadJson).toBe("{}");
  });

  it("deletes draft by id", async () => {
    const db = new FakeLocalStoreDb();
    const repo = createWorkbenchDraftRepository(db);

    await repo.deleteById("default");

    const call = db.calls[0];
    expect(call.sql).toContain("DELETE FROM workbench_drafts");
    expect(call.bind).toEqual(["default"]);
  });
});

describe("createTaskHistoryRepository", () => {
  it("saves history with correct SQL and bind parameters", async () => {
    const db = new FakeLocalStoreDb();
    const repo = createTaskHistoryRepository(db);

    await repo.save({
      id: "h1",
      projectId: "p1",
      title: "发布任务 p1",
      taskIdsJson: JSON.stringify(["t1"]),
      videoPath: "/tmp/final.mp4",
      platformsJson: JSON.stringify(["douyin"]),
      status: "submitted",
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    const call = db.calls[0];
    expect(call.sql).toContain("INSERT OR REPLACE INTO task_history");
    expect(call.bind).toContain("h1");
    expect(call.bind).toContain("submitted");
  });

  it("maps list rows to camelCase records", async () => {
    const db = new FakeLocalStoreDb();
    db.whenSelect(
      `SELECT id, project_id as projectId, title, task_ids_json as taskIdsJson, video_path as videoPath, platforms_json as platformsJson, status, created_at as createdAt FROM task_history ORDER BY created_at DESC`,
      [
        {
          id: "h1",
          projectId: "p1",
          title: "发布任务 p1",
          taskIdsJson: JSON.stringify(["t1"]),
          videoPath: "/tmp/final.mp4",
          platformsJson: JSON.stringify(["douyin"]),
          status: "submitted",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    );
    const repo = createTaskHistoryRepository(db);
    const records = await repo.list();

    expect(records[0]?.id).toBe("h1");
    expect(records[0]?.status).toBe("submitted");
  });

  it("deletes history by id", async () => {
    const db = new FakeLocalStoreDb();
    const repo = createTaskHistoryRepository(db);

    await repo.deleteById("h1");

    const call = db.calls[0];
    expect(call.sql).toContain("DELETE FROM task_history");
    expect(call.bind).toEqual(["h1"]);
  });
});
