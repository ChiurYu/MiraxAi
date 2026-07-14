import type { LocalStoreDb } from "./db.js";

export interface RecordedCall {
  sql: string;
  bind?: unknown[];
}

export class FakeLocalStoreDb implements LocalStoreDb {
  calls: RecordedCall[] = [];
  failNext = false;
  private nextFailureScope: string | undefined;
  private selectResponses = new Map<string, Record<string, unknown>[]>();
  private tableColumns = new Map<string, Set<string>>();

  setNextFailure(scope?: string): void {
    this.failNext = true;
    this.nextFailureScope = scope;
  }

  async execute(sql: string, bind?: unknown[]): Promise<void> {
    if (this.failNext && this.matchesFailureScope(sql)) {
      this.failNext = false;
      this.nextFailureScope = undefined;
      const message = sql.toLowerCase().includes("update project_voice_clones set state = 'active'")
        ? "simulated activation failure"
        : "simulated db failure";
      throw new Error(message);
    }
    this.calls.push({ sql, bind });
    this.trackSchemaChange(sql);
  }

  async select<T>(sql: string, bind?: unknown[]): Promise<T[]> {
    if (this.failNext && this.matchesFailureScope(sql)) {
      this.failNext = false;
      this.nextFailureScope = undefined;
      throw new Error("simulated db failure");
    }
    this.calls.push({ sql, bind });

    const pragmaMatch = sql.match(/PRAGMA\s+table_info\s*\(\s*([^)]+)\s*\)/i);
    if (pragmaMatch) {
      const tableName = pragmaMatch[1].trim().replace(/^["']|["']$/g, "");
      const columns = this.tableColumns.get(tableName) ?? new Set<string>();
      return Array.from(columns).map((name) => ({ name })) as T[];
    }

    return (this.selectResponses.get(sql) ?? []) as T[];
  }

  private matchesFailureScope(sql: string): boolean {
    if (!this.nextFailureScope) return true;
    const lower = sql.toLowerCase();
    if (this.nextFailureScope === "activation") {
      return lower.includes("update project_voice_clones set state = 'active'");
    }
    return true;
  }

  whenSelect<T extends Record<string, unknown>>(sql: string, rows: T[]): void {
    this.selectResponses.set(sql, rows as Record<string, unknown>[]);
  }

  clear(): void {
    this.calls = [];
    this.selectResponses.clear();
    this.failNext = false;
    this.nextFailureScope = undefined;
    // 保留 tableColumns，以便测试在清空调用记录后仍能验证幂等迁移。
  }

  private trackSchemaChange(sql: string): void {
    const createMatch = sql.match(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(\w+)\s*\(([\s\S]*?)\)\s*;?\s*$/i);
    if (createMatch) {
      const tableName = createMatch[1];
      // 模拟真实 SQLite：IF NOT EXISTS 对已存在表不覆盖 schema。
      if (this.tableColumns.has(tableName)) return;

      const body = createMatch[2];
      const columns = new Set<string>();
      for (const line of body.split(",")) {
        const columnMatch = line.match(/^\s*(\w+)\s+/);
        if (columnMatch) {
          columns.add(columnMatch[1]);
        }
      }
      this.tableColumns.set(tableName, columns);
      return;
    }

    const alterMatch = sql.match(/ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+(\w+)/i);
    if (alterMatch) {
      const tableName = alterMatch[1];
      const columnName = alterMatch[2];
      const columns = this.tableColumns.get(tableName) ?? new Set<string>();
      columns.add(columnName);
      this.tableColumns.set(tableName, columns);
    }
  }
}
