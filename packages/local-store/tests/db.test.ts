import { describe, expect, it } from "vitest";
import { FakeLocalStoreDb, migrateLocalStore } from "../src/index.js";
import { LOCAL_STORE_MIGRATIONS } from "../src/schema.js";

describe("migrateLocalStore", () => {
  it("executes every migration statement", async () => {
    const db = new FakeLocalStoreDb();
    await migrateLocalStore(db);

    const executeCalls = db.calls.filter((c) => c.sql.startsWith("CREATE TABLE"));
    expect(executeCalls).toHaveLength(LOCAL_STORE_MIGRATIONS.length);
  });

  it("creates provider_secrets table", async () => {
    const db = new FakeLocalStoreDb();
    await migrateLocalStore(db);

    expect(db.calls.some((c) => c.sql.includes("CREATE TABLE IF NOT EXISTS provider_secrets"))).toBe(true);
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
});
