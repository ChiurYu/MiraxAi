import { describe, expect, it } from "vitest";
import { LOCAL_STORE_SCHEMA_TABLES, createLocalStoreMigrationSql } from "../src/index.js";

describe("local store schema", () => {
  it("contains every MVP repository table", () => {
    const sql = createLocalStoreMigrationSql();

    for (const table of LOCAL_STORE_SCHEMA_TABLES) {
      expect(sql).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }
  });

  it("stores publish account credentials only by reference", () => {
    const sql = createLocalStoreMigrationSql();
    const publishAccountsSql = extractTableSql(sql, "publish_accounts");

    expect(publishAccountsSql).toContain("credential_ref TEXT");
    expect(publishAccountsSql).not.toContain("cookie");
    expect(publishAccountsSql).not.toContain("token");
    expect(publishAccountsSql).not.toContain("password");
  });

  it("stores publish task failure and retry fields", () => {
    const sql = createLocalStoreMigrationSql();
    const publishTasksSql = extractTableSql(sql, "publish_tasks");

    expect(publishTasksSql).toContain("error_code TEXT");
    expect(publishTasksSql).toContain("error_message TEXT");
    expect(publishTasksSql).toContain("failed_at TEXT");
    expect(publishTasksSql).toContain("retry_count INTEGER NOT NULL DEFAULT 0");
  });

  it("stores provider api_key only in provider_secrets, not provider_configs", () => {
    const sql = createLocalStoreMigrationSql();
    const providerConfigsSql = extractTableSql(sql, "provider_configs");
    const providerSecretsSql = extractTableSql(sql, "provider_secrets");

    expect(sql).toContain("CREATE TABLE IF NOT EXISTS provider_secrets");
    expect(providerSecretsSql).toContain("credential_ref TEXT PRIMARY KEY");
    expect(providerSecretsSql).toContain("api_key TEXT NOT NULL");
    expect(providerConfigsSql).not.toContain("api_key");
    expect(providerConfigsSql).not.toContain("apikey");
  });

  it("creates voice_sample_storage_roots table", () => {
    const sql = createLocalStoreMigrationSql();
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS voice_sample_storage_roots");
    expect(sql).toContain("path TEXT NOT NULL");
  });

  it("creates voice_samples table with consent audit", () => {
    const sql = createLocalStoreMigrationSql();
    const tableSql = extractTableSql(sql, "voice_samples");
    expect(tableSql).toContain("storage_root_id TEXT NOT NULL");
    expect(tableSql).toContain("relative_path TEXT NOT NULL");
    expect(tableSql).toContain("original_file_name TEXT NOT NULL");
    expect(tableSql).toContain("mime_type TEXT NOT NULL");
    expect(tableSql).toContain("size_bytes INTEGER NOT NULL");
    expect(tableSql).toContain("consented_at TEXT NOT NULL");
    expect(tableSql).toContain("consent_policy_version TEXT NOT NULL");
    expect(tableSql).toContain("state TEXT NOT NULL");
  });

  it("creates project_voice_clones table with remote state", () => {
    const sql = createLocalStoreMigrationSql();
    const tableSql = extractTableSql(sql, "project_voice_clones");
    expect(tableSql).toContain("project_id TEXT NOT NULL");
    expect(tableSql).toContain("sample_id TEXT NOT NULL");
    expect(tableSql).toContain("provider_config_id TEXT NOT NULL");
    expect(tableSql).toContain("provider TEXT NOT NULL");
    expect(tableSql).toContain("remote_voice_id TEXT");
    expect(tableSql).toContain("request_started_at TEXT");
    expect(tableSql).toContain("remote_created_at TEXT");
    expect(tableSql).toContain("state TEXT NOT NULL");
  });

  it("declares a partial unique index for one active clone per project", () => {
    const sql = createLocalStoreMigrationSql();
    expect(sql).toContain(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_project_voice_clones_one_active ON project_voice_clones(project_id) WHERE state = 'active'"
    );
  });

  it("activates a remote-created clone and replaces the old active clone in one SQLite statement", () => {
    const sql = createLocalStoreMigrationSql();
    expect(sql).toContain("CREATE TRIGGER IF NOT EXISTS trg_project_voice_clone_activate");
    expect(sql).toContain("BEFORE UPDATE OF state ON project_voice_clones");
    expect(sql).toContain("OLD.state = 'remote-created'");
    expect(sql).toContain("UPDATE project_voice_clones SET state = 'replaced'");
  });
});

function extractTableSql(sql: string, tableName: string): string {
  const start = sql.indexOf(`CREATE TABLE IF NOT EXISTS ${tableName}`);
  if (start === -1) return "";

  // 找到下一个 CREATE TABLE 或字符串结尾
  const nextCreate = sql.indexOf("CREATE TABLE IF NOT EXISTS", start + 1);
  const end = nextCreate === -1 ? sql.length : nextCreate;
  return sql.slice(start, end);
}
