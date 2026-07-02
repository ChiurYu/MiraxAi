# SQLite 本地存储骨架与 Provider 设置迁移设计

日期：2026-07-02  
任务 ID：`sqlite-local-store-backbone-and-provider-settings-v1`

## 1. 目标与边界

- SQLite 成为 Mirax AI 第一版本地系统数据的正式数据源。
- 本次优先迁移 settings 与 Provider 数据：
  - `app_settings`
  - `sidecar_configs`
  - `provider_configs`
  - `provider_secrets`
- `localStorage` 仅作为旧数据迁移 fallback：
  - 首次启动时，若 SQLite 无数据且 `localStorage` 有旧 settings snapshot，则导入 SQLite。
  - 导入后不再把 API Key 写回 `localStorage`。
- API Key 可以明文保存在本机 SQLite，但不得进入 snapshot、debug report、日志、Git 或导出数据。
- 不引入新的数据库抽象框架。
- 不改变 provider real/mock 路由规则：仍要求当前内存配置真实 ready 且测试 verified。

## 2. Schema 变更

### 2.1 `provider_configs`

保持现有字段：

- `id TEXT PRIMARY KEY`
- `provider TEXT NOT NULL`
- `label TEXT NOT NULL`
- `base_url TEXT`
- `model TEXT`
- `enabled INTEGER NOT NULL DEFAULT 1`
- `credential_ref TEXT`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`

`credential_ref` 默认等于 provider `id`，用于关联 `provider_secrets`。

### 2.2 `provider_secrets`（新增）

```sql
CREATE TABLE IF NOT EXISTS provider_secrets (
  credential_ref TEXT PRIMARY KEY,
  api_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

- `credential_ref` 与 `provider_configs.credential_ref` 一一对应。
- `api_key` 以明文形式存储，仅限本机 SQLite。
- 通过 repository 读写，不进入任何 UI 状态或导出路径。

## 3. LocalStoreDb 驱动接口

在 `packages/local-store/src/db.ts` 定义：

```ts
export interface LocalStoreDb {
  execute(sql: string, bind?: unknown[]): Promise<void>;
  select<T extends Record<string, unknown>>(sql: string, bind?: unknown[]): Promise<T[]>;
}
```

- Repository 函数全部接收 `db: LocalStoreDb`，不依赖 Tauri。
- 测试使用 `FakeLocalStoreDb` / `RecordingLocalStoreDb`：
  - 记录所有 `execute` / `select` 调用（SQL + bind 参数）。
  - 测试通过预设 rows 返回，验证 repository 的 SQL、参数映射、行映射、删除联动。
  - 不模拟完整 SQLite 语义，也不实现 SQL parser。
- 适配器层负责把 camelCase 记录映射到 snake_case 列。

## 4. Repository 工厂

在 `packages/local-store/src/repositories.ts` 已定义接口基础上，新增工厂函数：

- `createAppSettingsRepository(db)`
- `createSidecarConfigRepository(db)`
- `createProviderConfigRepository(db)`
- `createProviderSecretsRepository(db)`

### 4.1 Provider 记录

`ProviderConfigRecord` 增加可选字段：

```ts
export interface ProviderConfigRecord {
  id: string;
  provider: string;
  label: string;
  baseUrl?: string;
  model?: string;
  enabled: boolean;
  credentialRef?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 4.2 Provider Secrets Repository

```ts
export interface ProviderSecretsRecord {
  credentialRef: string;
  apiKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderSecretsRepository {
  getByCredentialRef(credentialRef: string): Promise<ProviderSecretsRecord | undefined>;
  save(record: ProviderSecretsRecord): Promise<void>;
  deleteByCredentialRef(credentialRef: string): Promise<void>;
}
```

## 5. 迁移

新增 `migrateLocalStore(db: LocalStoreDb): Promise<void>`：

- 执行 `createLocalStoreMigrationSql()` 中的所有 `CREATE TABLE IF NOT EXISTS` 语句。
- 幂等：重复执行不会报错或破坏数据。
- 不处理表结构升级（第一版无历史 SQLite 数据）。

## 6. Desktop 最小 SQLite Bridge

使用 Tauri v2 官方 `tauri-plugin-sql`（基于 `libsqlite3-sys`）。

### 6.1 依赖

- Rust：`tauri-plugin-sql = "2"`
- npm：`@tauri-apps/plugin-sql`

### 6.2 适配器

`apps/desktop/src/localStore/adapter.ts`：

```ts
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

  async select<T extends Record<string, unknown>>(sql: string, bind?: unknown[]): Promise<T[]> {
    return await this.db.select<T>(sql, bind ?? []);
  }
}
```

### 6.3 Tauri 配置

- `apps/desktop/src-tauri/Cargo.toml` 增加 `tauri-plugin-sql = "2"`。
- `apps/desktop/src-tauri/src/lib.rs` 增加 `.plugin(tauri_plugin_sql::init())`。
- `apps/desktop/src-tauri/capabilities/default.json` 增加 `sql:default`。

### 6.4 应用启动

采用「启动前初始化」策略（方案 A）：

1. `apps/desktop/src/main.ts` 在 `createApp(...).mount(...)` 之前调用 `initLocalStore()`。
2. `initLocalStore()` 尝试在 Tauri 环境加载 `TauriLocalStoreDb.load("sqlite:mirax.db")`，并运行 `migrateLocalStore(db)`。
3. 成功后通过 `setLocalStoreDb(db)` 设置为 `useAppSettings` 的默认 DB，再挂载 Vue 应用。
4. 若 SQLite 初始化失败（如 Rust/plugin 未就绪），则：
   - 默认 DB 保持 `undefined`；
   - `useAppSettings` 自动回退到 `localStorage`；
   - `dev:web` 模式继续可用，不会被阻塞。

这样可以避免 provider 在 SQLite 加载完成前短暂显示 `needs-config`，且 UI 无需等待异步 `settingsReady`。

## 7. useAppSettings 改造

### 7.1 选项与默认 DB

```ts
export interface UseAppSettingsOptions {
  storage?: Storage;
  persistSection?: boolean;
  db?: LocalStoreDb;
}
```

- 支持通过 `setLocalStoreDb(db)` 设置全局默认 DB。
- `useAppSettings()` 无参数时优先使用默认 DB，其次 `localStorage`。

### 7.2 加载流程

`useAppSettings` 的 `load()` 保持同步语义；SQLite 初始化已在 `main.ts`  mount 前完成：

1. 若 DB 可用：
   - 从 `appSettingsRepo`、`sidecarConfigRepo`、`providerConfigRepo`、`providerSecretsRepo` 读取。
   - 读取 provider 时，按 `credential_ref` 合并 `provider_secrets.api_key` 到内存 `apiKey`。
   - 若读取到数据，设置 `saveStatus = "已恢复设置"`。
   - 若 DB 为空且 `localStorage` 有旧 snapshot：
     - 调用 `restore(snapshot)`。
     - 将 metadata 写入 repositories，secret 留空。
     - 不将 apiKey 写回 `localStorage`。
     - 可选：清空旧 `localStorage` snapshot，避免后续重复回退。
2. 若 DB 不可用：回退现有 `localStorage` 逻辑。

### 7.3 持久化流程

1. 若 DB 可用：
   - `appSettings` / `sidecarConfig` 变化时写入对应 repository。
   - `providerConfigs` 变化时：
     - 每个 provider 的 metadata 写入 `provider_configs`。
     - `apiKey` 写入 `provider_secrets`（按 `credential_ref`）。
   - `settingsSection` 是否持久化仍由 `persistSection` 控制；若持久化，可存入 `app_settings` 的 JSON 字段或保留 localStorage 仅用于 section（本次保持最小改动，仍用 localStorage 存 section）。
2. 若 DB 不可用：保持现有 `localStorage` snapshot 逻辑（兼容测试）。

### 7.4 删除 Provider

- 删除 `provider_configs` 记录。
- 删除对应 `credential_ref` 的 `provider_secrets` 记录。

### 7.5 Snapshot 安全

`createSnapshot()` 继续调用 `sanitizeProviderConfigForStorage()`，确保：

- 不包含 `apiKey`、`token`、`cookie`、`credential`。
- `baseUrl` 去除 credentials、query、hash。

## 8. AiServicesSettings.vue 改造

### 8.1 API Key 编辑

- 新增 `editingApiKey` ref，初始为空字符串。
- API Key input 绑定 `editingApiKey`（不再是 `editingConfig.apiKey`）。
- placeholder 改为：「已保存在本机，可留空保留，输入新值则替换」。
- 保留 `type="password"`、`autocomplete="new-password"`。

### 8.2 保存逻辑

```ts
function saveProvider() {
  if (!editingConfig.value) return;

  const original = providerConfigs.value.find((c) => c.id === editingConfig.value!.id);
  const apiKey = editingApiKey.value.trim() || original?.apiKey || "";

  const configToSave = { ...editingConfig.value, apiKey };
  const errors = validateProviderConfig(configToSave);
  if (errors.length > 0) { ... }

  if (original) {
    updateProviderConfig(configToSave);
  } else {
    addProviderConfig(configToSave);
  }
  ...
}
```

- 新建 provider 时，`original` 不存在，留空则 `apiKey` 为空，符合必填校验。
- 编辑 provider 时，若用户未输入新 key，则保留内存中已有的 secret。

### 8.3 测试断言更新

`AiServicesSettings.test.ts` 中原断言「刷新后 API Key 不会保留」需要改为新的提示文案。

## 9. 测试策略

### 9.1 packages/local-store

- Schema 测试：确认 `provider_secrets` 在迁移 SQL 中。
- `FakeLocalStoreDb` / `RecordingLocalStoreDb` 测试：
  - 迁移调用被正确记录。
  - 各 repository 生成正确的 SQL 与 bind 参数。
  - `select` 返回的 rows 被正确映射为 camelCase record。
  - 删除 provider 时调用 `providerSecretsRepo.deleteByCredentialRef`。
  - 任何 repository 输出都不包含 `api_key`（secret 由独立 repo 管理）。

### 9.2 useAppSettings.test.ts

- 保留现有 `localStorage` 测试（不传 `db`）。
- 新增测试：
  - 从 DB 加载 settings / sidecar / provider metadata + secret。
  - provider 变更后 metadata 与 secret 分别写入 repository。
  - 删除 provider 同时删除 secret。
  - DB 为空且 localStorage 有旧数据时触发迁移，但 apiKey 不回写 localStorage。
  - snapshot 仍不包含 apiKey / token / cookie / credential。

### 9.3 AiServicesSettings.test.ts

- 更新 API Key 编辑提示文案断言。
- 保留现有连接测试、readiness、verified/failed 状态断言。

## 10. 安全

- API Key 可以存在于：
  - 本机 SQLite `provider_secrets.api_key`（第一版明文存储，仅限本机）。
  - 内存运行态 `ApiKeyProviderConfig.apiKey`（用于测试连接和 real rewrite）。
  - 用户输入框的瞬时 value（新输入时）。
- API Key 不能：
  - 明文显示在 Provider 编辑表单（编辑时 input value 为空，仅显示占位提示）。
  - 进入 `localStorage`（除旧版迁移后的空 secret）。
  - 进入 snapshot / debug / export / 日志 / Git。
- `sanitizeProviderConfigForStorage` 在 persistence 边界过滤 `apiKey`、`token`、`cookie`、`credential` 等敏感字段，并清理 `baseUrl` 中的 credentials / query / hash。
- repository 返回的 `ProviderConfigRecord` 不包含 `apiKey`。

## 11. 缺口与 BLOCKED 情况

若 `tauri-plugin-sql` 在目标环境无法编译或运行（例如缺少 Rust 工具链、SQLite 系统依赖、权限配置失败），则：

- packages/local-store 仍提供完整的 repository contract + in-memory 实现，所有测试可跑通。
- apps/desktop 中 Tauri adapter 无法实例化，应 BLOCKED 在「Rust / plugin-sql 编译或运行失败」。
- 本次任务仍完成「骨架 + 设置与 Provider 数据迁移」的代码层实现，真实 SQLite 接入状态在 BLOCKERS 中明确说明。
