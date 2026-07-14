import { describe, expect, it } from "vitest";
import { FakeLocalStoreDb, migrateLocalStore } from "../src/index.js";
import { LOCAL_STORE_MIGRATIONS } from "../src/schema.js";

const DEFAULT_ELEVENLABS_VOICE_ID = "pNInz6obpgDQGcFmaJgB";

describe("migrateLocalStore", () => {
  it("executes every CREATE TABLE statement", async () => {
    const db = new FakeLocalStoreDb();
    await migrateLocalStore(db);

    const createCalls = db.calls.filter((c) => c.sql.startsWith("CREATE TABLE"));
    const createMigrations = LOCAL_STORE_MIGRATIONS.filter((s) => s.toLowerCase().startsWith("create table"));
    expect(createCalls).toHaveLength(createMigrations.length);
  });

  it("creates provider_secrets table", async () => {
    const db = new FakeLocalStoreDb();
    await migrateLocalStore(db);

    expect(db.calls.some((c) => c.sql.includes("CREATE TABLE IF NOT EXISTS provider_secrets"))).toBe(true);
  });

  it("adds python_path and voice_id columns on a fresh database", async () => {
    const db = new FakeLocalStoreDb();
    await migrateLocalStore(db);

    expect(db.calls.some((c) => c.sql.includes("ALTER TABLE provider_configs ADD COLUMN python_path"))).toBe(true);
    expect(db.calls.some((c) => c.sql.includes("ALTER TABLE provider_configs ADD COLUMN voice_id"))).toBe(true);
  });

  it("does not add rewrite_provider_config_id twice because it is already in CREATE TABLE", async () => {
    const db = new FakeLocalStoreDb();
    await migrateLocalStore(db);

    const rewriteAlterCalls = db.calls.filter((c) =>
      c.sql.includes("ALTER TABLE app_settings ADD COLUMN rewrite_provider_config_id"),
    );
    expect(rewriteAlterCalls).toHaveLength(0);
  });

  it("only runs missing ALTER statements on an existing old database", async () => {
    const db = new FakeLocalStoreDb();
    // 模拟已存在 python_path 的旧库：先建基础表，再手动加上 python_path。
    await db.execute(`CREATE TABLE IF NOT EXISTS provider_configs (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      label TEXT NOT NULL,
      base_url TEXT,
      model TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      credential_ref TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`);
    await db.execute("ALTER TABLE provider_configs ADD COLUMN python_path TEXT;");
    await db.execute(`CREATE TABLE IF NOT EXISTS app_settings (
      id TEXT PRIMARY KEY,
      theme TEXT NOT NULL,
      output_paths_json TEXT NOT NULL,
      rewrite_provider_config_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`);
    db.clear();

    await migrateLocalStore(db);

    const pythonPathAlters = db.calls.filter((c) => c.sql.includes("ALTER TABLE provider_configs ADD COLUMN python_path"));
    const voiceIdAlters = db.calls.filter((c) => c.sql.includes("ALTER TABLE provider_configs ADD COLUMN voice_id"));

    expect(pythonPathAlters).toHaveLength(0);
    expect(voiceIdAlters).toHaveLength(1);
  });

  it("is idempotent and does not rely on duplicate column name errors", async () => {
    const db = new FakeLocalStoreDb();
    await migrateLocalStore(db);
    const firstRunAlters = db.calls.filter((c) => c.sql.startsWith("ALTER TABLE")).length;
    expect(firstRunAlters).toBeGreaterThan(0);

    db.clear();
    await migrateLocalStore(db);
    const secondRunAlters = db.calls.filter((c) => c.sql.startsWith("ALTER TABLE")).length;

    expect(secondRunAlters).toBe(0);
  });

  it("creates voice clone tables and the active partial index idempotently", async () => {
    const db = new FakeLocalStoreDb();
    await migrateLocalStore(db);

    expect(db.calls.some((c) => c.sql.includes("CREATE TABLE IF NOT EXISTS voice_sample_storage_roots"))).toBe(true);
    expect(db.calls.some((c) => c.sql.includes("CREATE TABLE IF NOT EXISTS voice_samples"))).toBe(true);
    expect(db.calls.some((c) => c.sql.includes("CREATE TABLE IF NOT EXISTS project_voice_clones"))).toBe(true);
    expect(
      db.calls.some((c) =>
        /CREATE UNIQUE INDEX IF NOT EXISTS idx_project_voice_clones_one_active/i.test(c.sql),
      ),
    ).toBe(true);

    db.clear();
    await migrateLocalStore(db);

    expect(db.calls.some((c) => /ALTER TABLE/i.test(c.sql))).toBe(false);
    expect(
      db.calls.some((c) =>
        /CREATE UNIQUE INDEX IF NOT EXISTS idx_project_voice_clones_one_active/i.test(c.sql),
      ),
    ).toBe(true);
  });

  it("adds active_voice_sample_storage_root_id column on a fresh database", async () => {
    const db = new FakeLocalStoreDb();
    await migrateLocalStore(db);

    expect(
      db.calls.some((c) =>
        c.sql.includes("ALTER TABLE app_settings ADD COLUMN active_voice_sample_storage_root_id"),
      ),
    ).toBe(true);
  });

  it("does not add active_voice_sample_storage_root_id twice", async () => {
    const db = new FakeLocalStoreDb();
    await migrateLocalStore(db);
    db.clear();

    await migrateLocalStore(db);

    const alterCalls = db.calls.filter((c) =>
      c.sql.includes("ALTER TABLE app_settings ADD COLUMN active_voice_sample_storage_root_id"),
    );
    expect(alterCalls).toHaveLength(0);
  });

  it("does not overwrite existing non-empty voice_id values", async () => {
    const db = new FakeLocalStoreDb();
    await migrateLocalStore(db);

    const backfillCall = db.calls.find((c) => c.sql.startsWith("UPDATE provider_configs"));
    expect(backfillCall?.sql).toContain("voice_id IS NULL OR voice_id = ''");
  });

  it("never reads or writes provider_secrets during migration", async () => {
    const db = new FakeLocalStoreDb();
    await migrateLocalStore(db);

    const secretDmlCalls = db.calls.filter((c) => {
      const upper = c.sql.toUpperCase();
      return (
        upper.includes("PROVIDER_SECRETS") &&
        (upper.startsWith("INSERT") || upper.startsWith("UPDATE") || upper.startsWith("DELETE") || upper.startsWith("SELECT"))
      );
    });
    expect(secretDmlCalls).toHaveLength(0);
  });

  it("does not read or write api_key values during migration", async () => {
    const db = new FakeLocalStoreDb();
    await migrateLocalStore(db);

    const migrationCalls = db.calls.filter((c) => {
      const upper = c.sql.toUpperCase();
      return upper.startsWith("INSERT") || upper.startsWith("UPDATE") || upper.startsWith("DELETE") || upper.startsWith("SELECT");
    });
    const allSql = migrationCalls.map((c) => c.sql).join("\n");
    const allBinds = migrationCalls.flatMap((c) => c.bind ?? []);
    const allText = `${allSql}\n${JSON.stringify(allBinds)}`;

    expect(allText.toLowerCase()).not.toContain("api_key");
    expect(allText.toLowerCase()).not.toContain("apikey");
  });
});

describe("FakeLocalStoreDb", () => {
  it("records execute calls", async () => {
    const db = new FakeLocalStoreDb();
    await db.execute("INSERT INTO t (a) VALUES (?)", [1]);

    expect(db.calls).toEqual([{ sql: "INSERT INTO t (a) VALUES (?)", bind: [1] }]);
  });

  it("returns preset rows for select", async () => {
    const db = new FakeLocalStoreDb();
    db.whenSelect("SELECT * FROM t", [{ id: "1", name: "x" }]);

    const rows = await db.select("SELECT * FROM t");

    expect(rows).toEqual([{ id: "1", name: "x" }]);
  });

  it("records select calls", async () => {
    const db = new FakeLocalStoreDb();
    await db.select("SELECT * FROM t", [1]);

    expect(db.calls).toEqual([{ sql: "SELECT * FROM t", bind: [1] }]);
  });

  it("reflects CREATE TABLE columns in PRAGMA table_info", async () => {
    const db = new FakeLocalStoreDb();
    await db.execute(`CREATE TABLE IF NOT EXISTS t (id TEXT PRIMARY KEY, name TEXT);`);

    const columns = await db.select<{ name: string }>("PRAGMA table_info(t)");

    expect(columns.map((c) => c.name).sort()).toEqual(["id", "name"]);
  });

  it("reflects ALTER TABLE ADD COLUMN in PRAGMA table_info", async () => {
    const db = new FakeLocalStoreDb();
    await db.execute(`CREATE TABLE IF NOT EXISTS t (id TEXT PRIMARY KEY);`);
    await db.execute("ALTER TABLE t ADD COLUMN voice_id TEXT;");

    const columns = await db.select<{ name: string }>("PRAGMA table_info(t)");

    expect(columns.map((c) => c.name)).toContain("voice_id");
  });

  it("records BEGIN IMMEDIATE, COMMIT, ROLLBACK and CREATE UNIQUE INDEX", async () => {
    const db = new FakeLocalStoreDb();
    await db.execute("BEGIN IMMEDIATE");
    await db.execute("INSERT INTO t (a) VALUES (?)", [1]);
    await db.execute("COMMIT");
    await db.execute("ROLLBACK");
    await db.execute(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_test ON t(a) WHERE b = 'x'",
    );

    expect(db.calls.map((c) => c.sql)).toEqual([
      "BEGIN IMMEDIATE",
      "INSERT INTO t (a) VALUES (?)",
      "COMMIT",
      "ROLLBACK",
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_test ON t(a) WHERE b = 'x'",
    ]);
  });

  it("retains schema across clear()", async () => {
    const db = new FakeLocalStoreDb();
    await db.execute("CREATE TABLE IF NOT EXISTS t (id TEXT PRIMARY KEY);");
    await db.execute("ALTER TABLE t ADD COLUMN name TEXT;");
    db.clear();

    const columns = await db.select<{ name: string }>("PRAGMA table_info(t)");
    expect(columns.map((c) => c.name).sort()).toEqual(["id", "name"]);
  });

  it("injects deterministic failure for activation update", async () => {
    const db = new FakeLocalStoreDb();
    db.setNextFailure("activation");

    await expect(db.execute("UPDATE project_voice_clones SET state = 'active'")).rejects.toThrow(
      "simulated activation failure",
    );
    expect(db.calls).toHaveLength(0);
  });
});
