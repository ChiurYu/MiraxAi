export interface LocalStoreDb {
  execute(sql: string, bind?: unknown[]): Promise<void>;
  select<T>(sql: string, bind?: unknown[]): Promise<T[]>;
}
