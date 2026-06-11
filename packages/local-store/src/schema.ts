export const LOCAL_STORE_SCHEMA_TABLES = [
  "provider_configs",
  "content_drafts",
  "video_projects",
  "publish_accounts",
  "workflow_tasks",
] as const;

export const LOCAL_STORE_MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS provider_configs (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    label TEXT NOT NULL,
    base_url TEXT,
    model TEXT,
    enabled INTEGER NOT NULL DEFAULT 1,
    credential_ref TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS content_drafts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    source_video_path TEXT,
    extracted_text TEXT,
    rewritten_text TEXT,
    target_platforms_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS video_projects (
    id TEXT PRIMARY KEY,
    draft_id TEXT NOT NULL,
    audio_path TEXT,
    avatar_video_path TEXT,
    final_video_path TEXT,
    cover_path TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (draft_id) REFERENCES content_drafts(id)
  );`,
  `CREATE TABLE IF NOT EXISTS publish_accounts (
    id TEXT PRIMARY KEY,
    platform_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    status TEXT NOT NULL,
    last_login_at TEXT,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS workflow_tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    stage_id TEXT NOT NULL,
    status TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
] as const;

export function createLocalStoreMigrationSql(): string {
  return LOCAL_STORE_MIGRATIONS.join("\n\n");
}
