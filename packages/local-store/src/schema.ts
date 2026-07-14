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
  "voice_sample_storage_roots",
  "voice_samples",
  "project_voice_clones",
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
  `CREATE TABLE IF NOT EXISTS voice_sample_storage_roots (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL,
    created_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS voice_samples (
    id TEXT PRIMARY KEY,
    storage_root_id TEXT NOT NULL,
    relative_path TEXT NOT NULL,
    original_file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    consented_at TEXT NOT NULL,
    consent_policy_version TEXT NOT NULL,
    state TEXT NOT NULL,
    created_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS project_voice_clones (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    sample_id TEXT NOT NULL,
    provider_config_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    remote_voice_id TEXT,
    request_started_at TEXT,
    remote_created_at TEXT,
    state TEXT NOT NULL,
    created_at TEXT NOT NULL
  );`,
  `ALTER TABLE app_settings ADD COLUMN rewrite_provider_config_id TEXT;`,
  `ALTER TABLE provider_configs ADD COLUMN python_path TEXT;`,
  `ALTER TABLE provider_configs ADD COLUMN voice_id TEXT;`,
  `ALTER TABLE app_settings ADD COLUMN active_voice_sample_storage_root_id TEXT;`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_project_voice_clones_one_active ON project_voice_clones(project_id) WHERE state = 'active';`,
  `CREATE TRIGGER IF NOT EXISTS trg_project_voice_clone_activate
    BEFORE UPDATE OF state ON project_voice_clones
    WHEN NEW.state = 'active' AND OLD.state = 'remote-created'
    BEGIN
      UPDATE project_voice_clones SET state = 'replaced'
      WHERE project_id = NEW.project_id AND state = 'active' AND id <> NEW.id;
    END;`,
] as const;

export function createLocalStoreMigrationSql(): string {
  return LOCAL_STORE_MIGRATIONS.join("\n\n");
}
