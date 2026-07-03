import type { LocalStoreDb } from "./db.js";
import { createLocalStoreMigrationSql } from "./schema.js";

export async function migrateLocalStore(db: LocalStoreDb): Promise<void> {
  const sql = createLocalStoreMigrationSql();
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const tableInfo = await db.select<{ name: string }>("PRAGMA table_info(app_settings)");
  const hasRewriteColumn = tableInfo.some((col) => col.name === "rewrite_provider_config_id");

  for (const statement of statements) {
    if (
      hasRewriteColumn &&
      statement.toLowerCase().includes("alter table") &&
      statement.toLowerCase().includes("rewrite_provider_config_id")
    ) {
      continue;
    }
    try {
      await db.execute(statement);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.toLowerCase().includes("duplicate column name")) {
        continue;
      }
      throw error;
    }
  }
}
