import type { LocalStoreDb } from "./db.js";

export interface RecordedCall {
  sql: string;
  bind?: unknown[];
}

export class FakeLocalStoreDb implements LocalStoreDb {
  calls: RecordedCall[] = [];
  private selectResponses = new Map<string, Record<string, unknown>[]>();

  async execute(sql: string, bind?: unknown[]): Promise<void> {
    this.calls.push({ sql, bind });
  }

  async select<T>(sql: string, bind?: unknown[]): Promise<T[]> {
    this.calls.push({ sql, bind });
    return (this.selectResponses.get(sql) ?? []) as T[];
  }

  whenSelect<T extends Record<string, unknown>>(sql: string, rows: T[]): void {
    this.selectResponses.set(sql, rows as Record<string, unknown>[]);
  }

  clear(): void {
    this.calls = [];
    this.selectResponses.clear();
  }
}
