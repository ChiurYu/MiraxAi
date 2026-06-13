import { describe, expect, it } from "vitest";
import { LOCAL_STORE_SCHEMA_TABLES, createLocalStoreMigrationSql } from "../src/index.js";

describe("local store schema", () => {
  it("contains every MVP repository table", () => {
    const sql = createLocalStoreMigrationSql();

    for (const table of LOCAL_STORE_SCHEMA_TABLES) {
      expect(sql).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }
  });
});
