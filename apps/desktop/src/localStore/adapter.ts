import Database from "@tauri-apps/plugin-sql";
import type { LocalStoreDb } from "@mirax/local-store";

export class TauriLocalStoreDb implements LocalStoreDb {
  private constructor(private db: Database) {}

  static async load(path: string): Promise<TauriLocalStoreDb> {
    const db = await Database.load(path);
    return new TauriLocalStoreDb(db);
  }

  async execute(sql: string, bind?: unknown[]): Promise<void> {
    await this.db.execute(sql, bind ?? []);
  }

  async select<T>(sql: string, bind?: unknown[]): Promise<T[]> {
    return await this.db.select<T[]>(sql, bind ?? []);
  }
}
