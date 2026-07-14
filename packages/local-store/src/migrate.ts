import type { LocalStoreDb } from "./db.js";
import { LOCAL_STORE_MIGRATIONS } from "./schema.js";

const DEFAULT_ELEVENLABS_VOICE_ID = "pNInz6obpgDQGcFmaJgB";

export async function migrateLocalStore(db: LocalStoreDb): Promise<void> {
  const statements = LOCAL_STORE_MIGRATIONS.map((statement) => statement.trim());

  // 先执行 CREATE TABLE，确保表存在后再查列信息。
  for (const statement of statements) {
    if (statement.toLowerCase().startsWith("create table")) {
      await db.execute(statement);
    }
  }

  // Trigger 必须作为完整 SQL 执行；不能按分号拆分其 BEGIN...END 主体。
  for (const statement of statements) {
    if (statement.toLowerCase().startsWith("create trigger")) {
      await db.execute(statement);
    }
  }

  const appSettingsColumns = await getTableColumnNames(db, "app_settings");
  const providerConfigsColumns = await getTableColumnNames(db, "provider_configs");

  // 仅对缺失列执行 ALTER TABLE；不再依赖错误对象中的 duplicate column name 文本。
  for (const statement of statements) {
    const lower = statement.toLowerCase();
    if (!lower.startsWith("alter table")) continue;

    const alterMatch = statement.match(/ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+(\w+)/i);
    if (!alterMatch) continue;

    const tableName = alterMatch[1];
    const columnName = alterMatch[2];
    const existingColumns =
      tableName === "app_settings"
        ? appSettingsColumns
        : tableName === "provider_configs"
          ? providerConfigsColumns
          : new Set<string>();

    if (existingColumns.has(columnName)) continue;

    await db.execute(statement);
  }

  // 在建表和加列完成后，再执行 CREATE INDEX（partial unique index 等）。
  for (const statement of statements) {
    const lower = statement.toLowerCase();
    if (lower.startsWith("create ") && lower.includes("index")) {
      await db.execute(statement);
    }
  }

  // voice_id 列保证已存在后，安全 backfill 旧 ElevenLabs 配置。
  // 不触碰 provider_secrets，不读取 API Key。
  await db.execute(
    "UPDATE provider_configs SET voice_id = ? WHERE provider = 'elevenlabs-tts' AND (voice_id IS NULL OR voice_id = '')",
    [DEFAULT_ELEVENLABS_VOICE_ID],
  );
}

async function getTableColumnNames(db: LocalStoreDb, tableName: string): Promise<Set<string>> {
  const rows = await db.select<{ name: string }>(`PRAGMA table_info(${tableName})`);
  return new Set(rows.map((row) => row.name));
}
