export const LOCAL_STORE_SCHEMA_TABLES = [
  "provider_configs",
  "provider_secrets",
  "content_drafts",
  "video_projects",
  "publish_accounts",
  "workflow_tasks",
  "app_settings",
  "sidecar_configs",
  "publish_tasks",
  "workbench_drafts",
  "task_history",
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
  `CREATE TABLE IF NOT EXISTS provider_secrets (
    credential_ref TEXT PRIMARY KEY,
    api_key TEXT NOT NULL,
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
    credential_ref TEXT,
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
  `CREATE TABLE IF NOT EXISTS app_settings (
    id TEXT PRIMARY KEY,
    theme TEXT NOT NULL,
    output_paths_json TEXT NOT NULL,
    rewrite_provider_config_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS sidecar_configs (
    id TEXT PRIMARY KEY,
    ffmpeg_path TEXT,
    python_service_url TEXT,
    cosy_voice_service_url TEXT,
    heygem_service_url TEXT,
    has_playwright_browser INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS publish_tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    platform_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    status TEXT NOT NULL,
    video_path TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    tags_json TEXT NOT NULL,
    mode TEXT NOT NULL,
    error_code TEXT,
    error_message TEXT,
    failed_at TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS workbench_drafts (
    id TEXT PRIMARY KEY,
    payload_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS task_history (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    task_ids_json TEXT NOT NULL,
    video_path TEXT NOT NULL,
    platforms_json TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  );`,
  `ALTER TABLE app_settings ADD COLUMN rewrite_provider_config_id TEXT;`,
] as const;

export function createLocalStoreMigrationSql(): string {
  return LOCAL_STORE_MIGRATIONS.join("\n\n");
}
