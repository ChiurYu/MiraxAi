import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  FakeLocalStoreDb,
  createAppSettingsRepository,
  createProviderConfigRepository,
  createProviderSecretsRepository,
  createSidecarConfigRepository,
  createWorkbenchDraftRepository,
  createTaskHistoryRepository,
  createVoiceSampleStorageRootRepository,
  createVoiceSampleRepository,
  createProjectVoiceCloneRepository,
  replaceActiveProjectVoiceClone,
  migrateLocalStore,
  type LocalStoreDb,
  type ProjectVoiceCloneRecord,
} from "../src/index.js";

function getNodeSqlite() {
  const mod = (process as unknown as { getBuiltinModule(id: string): unknown }).getBuiltinModule("node:sqlite");
  return mod as { DatabaseSync: typeof import("node:sqlite").DatabaseSync };
}

class NodeSqliteDb implements LocalStoreDb {
  private db = new (getNodeSqlite().DatabaseSync)(":memory:");

  async execute(sql: string, bind?: unknown[]): Promise<void> {
    if (bind && bind.length > 0) {
      const stmt = this.db.prepare(sql);
      stmt.run(...bind);
    } else {
      this.db.exec(sql);
    }
  }

  async select<T>(sql: string, bind?: unknown[]): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    return (bind && bind.length > 0 ? stmt.all(...bind) : stmt.all()) as T[];
  }
}

class AlternatingNodeSqliteDb implements LocalStoreDb {
  private readonly databases: [InstanceType<typeof import("node:sqlite").DatabaseSync>, InstanceType<typeof import("node:sqlite").DatabaseSync>];
  private index = 0;

  constructor(path: string) {
    const { DatabaseSync } = getNodeSqlite();
    this.databases = [new DatabaseSync(path), new DatabaseSync(path)];
  }

  private next(): InstanceType<typeof import("node:sqlite").DatabaseSync> {
    const database = this.databases[this.index % this.databases.length];
    this.index += 1;
    return database;
  }

  async execute(sql: string, bind?: unknown[]): Promise<void> {
    const database = this.next();
    if (bind && bind.length > 0) database.prepare(sql).run(...bind);
    else database.exec(sql);
  }

  async select<T>(sql: string, bind?: unknown[]): Promise<T[]> {
    const statement = this.next().prepare(sql);
    return (bind && bind.length > 0 ? statement.all(...bind) : statement.all()) as T[];
  }

  close(): void {
    for (const database of this.databases) database.close();
  }
}

describe("createAppSettingsRepository", () => {
  it("saves settings with correct SQL and bind parameters", async () => {
    const db = new FakeLocalStoreDb();
    const repo = createAppSettingsRepository(db);

    await repo.save({
      id: "default",
      theme: "dark",
      outputPathsJson: JSON.stringify({ baseOutput: "/tmp/mirax" }),
      rewriteProviderConfigId: "openai-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const call = db.calls[0];
    expect(call.sql).toContain("INSERT OR REPLACE INTO app_settings");
    expect(call.bind).toContain("dark");
    expect(call.bind).toContain('{"baseOutput":"/tmp/mirax"}');
    expect(call.bind).toContain("openai-1");
  });

  it("maps select rows to camelCase records", async () => {
    const db = new FakeLocalStoreDb();
    db.whenSelect(
      `SELECT id, theme, output_paths_json as outputPathsJson, rewrite_provider_config_id as rewriteProviderConfigId, active_voice_sample_storage_root_id as activeVoiceSampleStorageRootId, created_at as createdAt, updated_at as updatedAt FROM app_settings WHERE id = ?`,
      [
        {
          id: "default",
          theme: "light",
          outputPathsJson: "{}",
          rewriteProviderConfigId: "openai-1",
          activeVoiceSampleStorageRootId: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    );
    const repo = createAppSettingsRepository(db);
    const record = await repo.getById("default");

    expect(record?.theme).toBe("light");
    expect(record?.outputPathsJson).toBe("{}");
    expect(record?.rewriteProviderConfigId).toBe("openai-1");
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
      pythonPath: undefined,
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

  it("saves local-whisper pythonPath", async () => {
    const db = new FakeLocalStoreDb();
    const repo = createProviderConfigRepository(db);

    await repo.save({
      id: "p-local",
      provider: "local-whisper",
      label: "本地 Whisper",
      pythonPath: "~/.local/share/mirax-ai/asr-venv/bin/python",
      model: "tiny",
      enabled: true,
      credentialRef: "p-local",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const call = db.calls[0];
    expect(call.sql).toContain("INSERT OR REPLACE INTO provider_configs");
    expect(call.sql).toContain("python_path");
    expect(call.bind).toContain("~/.local/share/mirax-ai/asr-venv/bin/python");
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

describe("createVoiceSampleStorageRootRepository", () => {
  it("saves a storage root", async () => {
    const db = new FakeLocalStoreDb();
    const repo = createVoiceSampleStorageRootRepository(db);

    await repo.save({
      id: "root-1",
      path: "/tmp/mirax-samples",
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    const call = db.calls[0];
    expect(call.sql).toContain("INSERT OR REPLACE INTO voice_sample_storage_roots");
    expect(call.bind).toContain("root-1");
    expect(call.bind).toContain("/tmp/mirax-samples");
  });
});

describe("createVoiceSampleRepository", () => {
  it("saves a voice sample with consent audit", async () => {
    const db = new FakeLocalStoreDb();
    const repo = createVoiceSampleRepository(db);

    await repo.save({
      id: "sample-1",
      storageRootId: "root-1",
      relativePath: "s1/voice.wav",
      originalFileName: "voice.wav",
      mimeType: "audio/wav",
      sizeBytes: 1024,
      consentedAt: "2026-01-01T00:00:00.000Z",
      consentPolicyVersion: "2026-07-11",
      state: "available",
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    const call = db.calls[0];
    expect(call.sql).toContain("INSERT OR REPLACE INTO voice_samples");
    expect(call.bind).toContain("sample-1");
    expect(call.bind).toContain("audio/wav");
  });
});

describe("createProjectVoiceCloneRepository", () => {
  function makeClone(overrides: Partial<ProjectVoiceCloneRecord>): ProjectVoiceCloneRecord {
    return {
      id: "clone-1",
      projectId: "project-1",
      sampleId: "sample-1",
      providerConfigId: "cfg-1",
      provider: "elevenlabs-tts",
      remoteVoiceId: "vc-123",
      requestStartedAt: "2026-01-01T00:00:00.000Z",
      remoteCreatedAt: "2026-01-01T00:00:01.000Z",
      state: "active",
      createdAt: "2026-01-01T00:00:00.000Z",
      ...overrides,
    };
  }

  it("findActiveByProjectId returns only active clones", async () => {
    const db = new FakeLocalStoreDb();
    db.whenSelect(
      `SELECT id, project_id as projectId, sample_id as sampleId, provider_config_id as providerConfigId, provider, remote_voice_id as remoteVoiceId, request_started_at as requestStartedAt, remote_created_at as remoteCreatedAt, state, created_at as createdAt FROM project_voice_clones WHERE project_id = ? AND state = 'active'`,
      [
        {
          id: "clone-1",
          projectId: "project-1",
          sampleId: "sample-1",
          providerConfigId: "cfg-1",
          provider: "elevenlabs-tts",
          remoteVoiceId: "vc-123",
          requestStartedAt: "2026-01-01T00:00:00.000Z",
          remoteCreatedAt: "2026-01-01T00:00:01.000Z",
          state: "active",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    );
    const repo = createProjectVoiceCloneRepository(db);
    const record = await repo.findActiveByProjectId("project-1");

    expect(record?.state).toBe("active");
  });

  it("findActiveByProjectId ignores pending-verification clones", async () => {
    const db = new FakeLocalStoreDb();
    db.whenSelect(
      `SELECT id, project_id as projectId, sample_id as sampleId, provider_config_id as providerConfigId, provider, remote_voice_id as remoteVoiceId, request_started_at as requestStartedAt, remote_created_at as remoteCreatedAt, state, created_at as createdAt FROM project_voice_clones WHERE project_id = ? AND state = 'active'`,
      [],
    );
    const repo = createProjectVoiceCloneRepository(db);
    const record = await repo.findActiveByProjectId("project-1");

    expect(record).toBeUndefined();
  });

  it("finds the latest recoverable remote clone for the same project and provider", async () => {
    const db = new FakeLocalStoreDb();
    const sql = `SELECT id, project_id as projectId, sample_id as sampleId, provider_config_id as providerConfigId, provider, remote_voice_id as remoteVoiceId, request_started_at as requestStartedAt, remote_created_at as remoteCreatedAt, state, created_at as createdAt FROM project_voice_clones WHERE project_id = ? AND provider_config_id = ? AND state = 'remote-created' AND remote_voice_id IS NOT NULL ORDER BY COALESCE(remote_created_at, created_at) DESC LIMIT 1`;
    db.whenSelect(sql, [makeClone({ id: "recoverable", state: "remote-created" })]);

    const record = await createProjectVoiceCloneRepository(db).findLatestRecoverable("project-1", "cfg-1");

    expect(record?.id).toBe("recoverable");
    expect(db.calls.at(-1)?.bind).toEqual(["project-1", "cfg-1"]);
  });

  it("saves a project voice clone", async () => {
    const db = new FakeLocalStoreDb();
    const repo = createProjectVoiceCloneRepository(db);

    await repo.save(makeClone({ state: "remote-created" }));

    const call = db.calls[0];
    expect(call.sql).toContain("INSERT OR REPLACE INTO project_voice_clones");
    expect(call.bind).toContain("clone-1");
    expect(call.bind).toContain("remote-created");
  });
});

describe("replaceActiveProjectVoiceClone", () => {
  it("uses one trigger-backed activation statement so pooled connections cannot split the transaction", async () => {
    const db = new FakeLocalStoreDb();
    const sql = "UPDATE project_voice_clones SET state = 'active' WHERE id = ? AND project_id = ? AND state = 'remote-created' RETURNING id";
    db.whenSelect(sql, [{ id: "clone-2" }]);

    await replaceActiveProjectVoiceClone(db, "project-1", "clone-2");

    expect(db.calls[0]).toEqual({
      sql,
      bind: ["clone-2", "project-1"],
    });
    expect(db.calls).toHaveLength(1);
    expect(db.calls.map((call) => call.sql)).not.toContain("BEGIN IMMEDIATE");
    expect(db.calls.map((call) => call.sql)).not.toContain("COMMIT");
  });

  it("preserves the old active clone when the trigger-backed activation statement fails", async () => {
    const db = new FakeLocalStoreDb();
    db.setNextFailure("activation");

    await expect(replaceActiveProjectVoiceClone(db, "project-1", "clone-2")).rejects.toThrow(
      "simulated db failure",
    );

    expect(db.calls.map((call) => call.sql)).not.toContain("BEGIN IMMEDIATE");
    expect(db.calls.map((call) => call.sql)).not.toContain("ROLLBACK");
  });
});

describe("replaceActiveProjectVoiceClone with real SQLite", () => {
  function makeClone(overrides: Partial<ProjectVoiceCloneRecord>): ProjectVoiceCloneRecord {
    return {
      id: "clone-1",
      projectId: "project-1",
      sampleId: "sample-1",
      providerConfigId: "cfg-1",
      provider: "elevenlabs-tts",
      remoteVoiceId: "vc-123",
      requestStartedAt: "2026-01-01T00:00:00.000Z",
      remoteCreatedAt: "2026-01-01T00:00:01.000Z",
      state: "active",
      createdAt: "2026-01-01T00:00:00.000Z",
      ...overrides,
    };
  }

  it("atomically replaces active clone on a real in-memory SQLite database", async () => {
    const db = new NodeSqliteDb();
    await migrateLocalStore(db);

    const repo = createProjectVoiceCloneRepository(db);
    await repo.save(makeClone({ id: "old", state: "active", remoteVoiceId: "vc-old" }));
    await repo.save(makeClone({ id: "new", state: "remote-created", remoteVoiceId: "vc-new" }));

    await replaceActiveProjectVoiceClone(db, "project-1", "new");

    const oldRecord = await repo.getById("old");
    const newRecord = await repo.getById("new");

    expect(oldRecord?.state).toBe("replaced");
    expect(newRecord?.state).toBe("active");
  });

  it("rolls back when the requested remote-created clone cannot be activated", async () => {
    const db = new NodeSqliteDb();
    await migrateLocalStore(db);
    const clones = createProjectVoiceCloneRepository(db);
    await clones.save({ id: "active-1", projectId: "project-1", sampleId: "sample-1", providerConfigId: "provider-1", provider: "elevenlabs-tts", state: "active", createdAt: "now" });

    await expect(replaceActiveProjectVoiceClone(db, "project-1", "missing-clone")).rejects.toThrow("activation");
    expect((await clones.getById("active-1"))?.state).toBe("active");
  });

  it("does not split activation across pooled SQLite connections", async () => {
    const directory = mkdtempSync(join(tmpdir(), "mirax-sqlite-pool-"));
    const db = new AlternatingNodeSqliteDb(join(directory, "mirax.db"));
    try {
      await migrateLocalStore(db);
      const clones = createProjectVoiceCloneRepository(db);
      await clones.save(makeClone({ id: "old", state: "active", remoteVoiceId: "vc-old" }));
      await clones.save(makeClone({ id: "new", state: "remote-created", remoteVoiceId: "vc-new" }));

      await replaceActiveProjectVoiceClone(db, "project-1", "new");

      expect((await clones.getById("old"))?.state).toBe("replaced");
      expect((await clones.getById("new"))?.state).toBe("active");
    } finally {
      db.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
