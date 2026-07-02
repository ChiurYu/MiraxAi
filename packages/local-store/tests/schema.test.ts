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
});

function extractTableSql(sql: string, tableName: string): string {
  const start = sql.indexOf(`CREATE TABLE IF NOT EXISTS ${tableName}`);
  if (start === -1) return "";

  // 找到下一个 CREATE TABLE 或字符串结尾
  const nextCreate = sql.indexOf("CREATE TABLE IF NOT EXISTS", start + 1);
  const end = nextCreate === -1 ? sql.length : nextCreate;
  return sql.slice(start, end);
}
