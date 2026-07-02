import type { LocalStoreDb } from "./db.js";
import { createLocalStoreMigrationSql } from "./schema.js";

export async function migrateLocalStore(db: LocalStoreDb): Promise<void> {
  const sql = createLocalStoreMigrationSql();
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    await db.execute(statement);
  }
}
